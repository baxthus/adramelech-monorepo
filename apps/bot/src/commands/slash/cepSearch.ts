import type { Command } from '~/types/command.ts';
import {
  ButtonStyle,
  type ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import ky from 'ky';
import { stripIndents } from 'common-tags';
import { ExpectedError } from '~/types/errors';
import z from 'zod';

const cepSchema = z.string().regex(/^\d{5}-?\d{3}$/);

const searchSchema = z.object({
  cep: cepSchema,
  state: z.string().length(2),
  city: z.string(),
  neighborhood: z.string(),
  street: z.string(),
  service: z.string(),
  location: z.object({
    type: z.string(),
    coordinates: z.object({
      latitude: z.string().optional(),
      longitude: z.string().optional(),
    }),
  }),
});

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('cep-search')
    .setDescription('Search for a CEP (Brazilian ZIP code)')
    .addStringOption((option) =>
      option
        .setName('cep')
        .setDescription('The CEP to search for')
        .setRequired(true),
    ),
  uses: ['BrasilAPI'],
  cooldown: true,
  async execute(intr: ChatInputCommandInteraction) {
    await intr.deferReply();
    const cep = intr.options.getString('cep', true);

    if (!cepSchema.safeParse(cep).success)
      throw new ExpectedError('Invalid CEP format');

    const data = await ky
      .get(`https://brasilapi.com.br/api/cep/v2/${cep}`)
      .json()
      .then(searchSchema.parse);

    const mapsUrl = new URL('https://www.openstreetmap.org/');
    const { latitude, longitude } = data.location.coordinates;
    if (latitude && longitude) {
      mapsUrl.searchParams.set('mlat', latitude);
      mapsUrl.searchParams.set('mlon', longitude);
      mapsUrl.hash = `map=15/${latitude}/${longitude}`;
    } else {
      mapsUrl.searchParams.set(
        'query',
        `${data.street}, ${data.city}, ${data.state}`,
      );
    }

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              # CEP Search
              **CEP:** \`${data.cep}\`
              **State:** \`${data.state}\`
              **City:** \`${data.city}\`
              **Neighborhood:** \`${data.neighborhood}\`
              **Street:** \`${data.street}\`
              **Service used:** \`${data.service}\`
              ## Location
              **Type:** \`${data.location.type}\`
              **Latitude:** \`${data.location.coordinates.latitude || 'N/A'}\`
              **Longitude:** \`${data.location.coordinates.longitude || 'N/A'}\`
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
            {
              type: ComponentType.TextDisplay,
              content: '> Powered by BrasilAPI',
            },
          ],
        },
      ],
    });
  },
};
