import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  time,
  TimestampStyles,
  type ChatInputCommandInteraction,
} from 'discord.js';
import ky from 'ky';
import type { CommandInfer } from '~/types/command';
import { stripIndents } from 'common-tags';
import { type } from 'arktype';
import { toUnixTimestamp } from '@repo/utils/date';
import { ExpectedError } from '~/types/errors';
import { env } from '@repo/env/bot';

const Lookup = type({
  success: 'boolean',
  type: '"IPv4" | "IPv6"',
  continent: 'string',
  country: 'string',
  country_code: 'string == 2',
  region: 'string',
  city: 'string',
  latitude: 'number',
  longitude: 'number',
  postal: 'string',
  connection: {
    asn: 'number',
    org: 'string',
    isp: 'string',
    domain: 'string',
  },
  timezone: {
    id: 'string',
    utc: 'string',
    current_time: 'string.date.parse',
  },
});

export const command = <CommandInfer>{
  data: new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Lookup a domain or IP address')
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('The domain or IP address to lookup')
        .setRequired(true),
    ),
  cooldown: true,
  uses: ['ipwhois.io', 'da.gd'],
  async execute(intr: ChatInputCommandInteraction) {
    await intr.deferReply();

    const target = intr.options.getString('target', true);

    const ip =
      type('string.ip')(target) instanceof type.errors
        ? await getIpFromDomain(target)
        : target;

    const data = await ky
      .get(`https://ipwhois.io/json/${ip}`)
      .json()
      .then(Lookup.assert);

    const mapsUrl = new URL('https://www.google.com/maps/search/');
    mapsUrl.searchParams.set('api', '1');
    mapsUrl.searchParams.set('query', `${data.latitude},${data.longitude}`);

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          accent_color: env.EMBED_COLOR,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              # Lookup
              **IP:** ${ip}
              **Domain:** ${target === ip ? 'None' : target}
              **Type:** ${data.type}
              `,
            },
            { type: ComponentType.Separator },
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              ## Location
              **Continent:** ${data.continent}
              **Country:** ${data.country} :flag_${data.country_code.toLowerCase()}:
              **Region:** ${data.region}
              **City:** ${data.city}
              **Latitude:** ${data.latitude}
              **Longitude:** ${data.longitude}
              **Postal Code:** ${data.postal}
              `,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Link,
                  label: 'Open in Google Maps',
                  url: mapsUrl.toString(),
                  emoji: { name: '🌎' },
                },
              ],
            },
            { type: ComponentType.Separator },
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              ## Connection
              **ASN:** ${data.connection.asn}
              **Organization:** ${data.connection.org}
              **ISP:** ${data.connection.isp}
              **Domain:** ${data.connection.domain}
              `,
            },
            { type: ComponentType.Separator },
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              ## Timezone
              **ID:** ${data.timezone.id}
              **UTC:** ${data.timezone.utc}
              **Current Time:** ${time(toUnixTimestamp(data.timezone.current_time), TimestampStyles.ShortDateTime)}
              `,
            },
            {
              type: ComponentType.TextDisplay,
              content: '> Powered by ipwhois.io and da.gd',
            },
          ],
        },
      ],
    });
  },
};

const getIpFromDomain = (domain: string): Promise<string> =>
  ky
    .get(`https://da.gd/host/${domain}`)
    .text()
    .then((text) => {
      const res = text.trim();
      if (!res || res.startsWith('No'))
        // Expected because not worth logging
        throw new ExpectedError('Failed to get IP from domain');
      return res.includes(',') ? res.substring(0, res.indexOf(',')) : res;
    });
