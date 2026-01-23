import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import ky from 'ky';
import type { Command } from '~/types/command';
import { stripIndents } from 'common-tags';
import { ExpectedError } from '~/types/errors';
import z from 'zod';

const lookupSchema = z.object({
  success: z.boolean(),
  type: z.enum(['IPv4', 'IPv6']),
  continent: z.string(),
  country: z.string(),
  country_code: z.string().length(2),
  region: z.string(),
  city: z.string(),
  latitude: z.coerce.string(),
  longitude: z.coerce.string(),
  postal: z.string(),
  connection: z.object({
    asn: z.number(),
    org: z.string(),
    isp: z.string(),
    domain: z.string(),
  }),
  timezone: z.object({
    id: z.string(),
    utc: z.string(),
    current_time: z.coerce.date(),
  }),
});

export const command = <Command>{
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

    const ip = z.union([z.ipv4(), z.ipv6()]).safeParse(target).success
      ? target
      : await getIpFromDomain(target);

    const data = await ky
      .get(`https://ipwho.is/${ip}`)
      .json()
      .then(lookupSchema.parse);

    const mapsUrl = new URL('https://www.openstreetmap.org/');
    mapsUrl.searchParams.set('mlat', data.latitude);
    mapsUrl.searchParams.set('mlon', data.longitude);
    mapsUrl.hash = `map=15/${data.latitude}/${data.longitude}`;

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
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
                  label: 'Open in OpenStreetMap',
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
              **Current Time:** ${data.timezone.current_time.toLocaleString(
                'en-CA',
                {
                  timeZone: data.timezone.id,
                },
              )}
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
