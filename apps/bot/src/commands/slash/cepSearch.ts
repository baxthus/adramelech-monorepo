import type { CommandInfer } from '~/types/command.ts';
import {
  ButtonStyle,
  type ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import ky from 'ky';
import { stripIndents } from 'common-tags';
import { type } from 'arktype';
import { ExpectedError } from '~/types/errors';

const CEP = type('string & /^\\d{5}-?\\d{3}$/');

const Search = type({
  cep: CEP,
  state: 'string == 2',
  city: 'string',
  neighborhood: 'string',
  street: 'string',
  service: 'string',
  location: {
    type: 'string',
    coordinates: {
      latitude: 'string?',
      longitude: 'string?',
    },
  },
});

export const command = <CommandInfer>{
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

    if (CEP(cep) instanceof type.errors)
      throw new ExpectedError('Invalid CEP format');

    const data = await ky
      .get(`https://brasilapi.com.br/api/cep/v2/${cep}`)
      .json()
      .then(Search.assert);

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
