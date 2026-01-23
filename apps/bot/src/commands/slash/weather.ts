import { env } from '@repo/env/bot';
import { stripIndents } from 'common-tags';
import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import ky from 'ky';
import { capitalize } from 'voca';
import z from 'zod';
import type { Command } from '~/types/command';
import { ExpectedError } from '~/types/errors';

const BASE_URL = 'https://api.openweathermap.org';

const geosSchema = z
  .object({
    lat: z.number(),
    lon: z.number(),
  })
  .array();

const weatherSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  weather: z
    .object({
      main: z.string(),
      description: z.string().transform((v) => capitalize(v)),
    })
    .array()
    .length(1),
  main: z.object({
    temp: z.number(),
    feels_like: z.number(),
    temp_min: z.number(),
    temp_max: z.number(),
    pressure: z.number(),
    humidity: z.number(),
    sea_level: z.number(),
    grnd_level: z.number(),
  }),
  wind: z.object({
    speed: z.number(),
    deg: z.number(),
    gust: z.number().nullable(),
  }),
  sys: z.object({
    country: z.string().length(2).toLowerCase(),
  }),
});

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get the current weather for a location')
    .addStringOption((option) =>
      option
        .setName('city')
        .setDescription('The name of the city to get the weather for')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('country')
        .setDescription('The country the city is in')
        .setRequired(true),
    ),
  cooldown: 10 * 60, // 10 minutes
  uses: ['OpenWeatherMap'],
  async execute(intr: ChatInputCommandInteraction) {
    if (!env.OPENWEATHER_KEY)
      throw new ExpectedError('OpenWeatherMap API key is not configured');

    await intr.deferReply();

    const city = intr.options.getString('city', true);
    const country = intr.options.getString('country', true);

    const geo = await ky
      .get(`${BASE_URL}/geo/1.0/direct`, {
        searchParams: {
          q: `${city},${country}`,
          limit: '1',
          appid: env.OPENWEATHER_KEY,
        },
      })
      .json()
      .then((json) => {
        const data = geosSchema.parse(json);
        if (data.length === 0)
          throw new ExpectedError(
            `Could not find location for city "${city}" in country "${country}".`,
          );
        return data;
      });

    const weather = await ky
      .get(`${BASE_URL}/data/2.5/weather`, {
        searchParams: {
          lat: geo[0]!.lat,
          lon: geo[0]!.lon,
          units: 'metric',
          appid: env.OPENWEATHER_KEY,
          lang: 'en',
        },
      })
      .json()
      .then(weatherSchema.parse);
    console.log(weather);

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              # Weather${weather.name ? ` in ${weather.name} :flag_${weather.sys.country}:` : ''}
              `,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: 'View on OpenWeatherMap',
                  style: ButtonStyle.Link,
                  url: `https://openweathermap.org/city/${weather.id}`,
                },
              ],
            },
            { type: ComponentType.Separator, divider: false },
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              **Temperature:** ${weather.main.temp}ºC
              **Feels Like:** ${weather.main.feels_like}ºC
              **Minimum Temperature:** ${weather.main.temp_min}ºC
              **Maximum Temperature:** ${weather.main.temp_max}ºC
              **Pressure:** ${weather.main.pressure} hPa
              **Humidity:** ${weather.main.humidity}%
              **Sea level:** ${weather.main.sea_level} hPa
              **Ground level:** ${weather.main.grnd_level} hPa
              ## :cloud: Weather
              **Main:** ${weather.weather[0]?.main}
              **Description:** ${weather.weather[0]?.description}
              ## :dash: Wind
              **Speed:** ${weather.wind.speed} m/s
              **Direction:** ${weather.wind.deg}º
              **Gust:** ${weather.wind.gust ? `${weather.wind.gust} m/s` : 'N/A'}
              `,
            },
            {
              type: ComponentType.TextDisplay,
              content: '> Powered by OpenWeatherMap',
            },
          ],
        },
      ],
    });
  },
};
