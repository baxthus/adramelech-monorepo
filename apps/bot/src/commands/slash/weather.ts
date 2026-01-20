import { env } from '@repo/env/bot';
import { type } from 'arktype';
import { stripIndents } from 'common-tags';
import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import ky from 'ky';
import type { CommandInfer } from '~/types/command';
import { ExpectedError } from '~/types/errors';

const BASE_URL = 'https://api.openweathermap.org';

const Geos = type({
  lat: 'number',
  lon: 'number',
}).array();

const Weather = type({
  id: 'number',
  name: 'string | null',
  weather: type({
    main: 'string',
    description: 'string.capitalize',
  })
    .array()
    .exactlyLength(1),
  main: {
    temp: 'number',
    feels_like: 'number',
    temp_min: 'number',
    temp_max: 'number',
    pressure: 'number',
    humidity: 'number',
    sea_level: 'number',
    grnd_level: 'number',
  },
  wind: {
    speed: 'number',
    deg: 'number',
    gust: 'number | null',
  },
  sys: {
    country: 'string == 2 |> string.lower',
  },
});

export const command = <CommandInfer>{
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
        const data = Geos.assert(json);
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
      .then(Weather.assert);

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
