import {
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import ky from 'ky';
import type { Command } from '~/types/command';
import { stripIndents } from 'common-tags';
import { ExpectedError } from '~/types/errors';

const badResponses = [
  'Malformed',
  'Wrong',
  'The queried object does not',
  'Invalid',
  'No match',
  'Domain not',
  'NOT FOUND',
  'Did not get',
  'Closing connection',
];

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Get information about a domain or IP address')
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('The domain or IP address to look up')
        .setRequired(true),
    ),
  cooldown: true,
  uses: ['da.gd'],
  async execute(intr: ChatInputCommandInteraction) {
    await intr.deferReply();

    const target = intr.options.getString('target', true);

    const data = await ky
      .get(`https://da.gd/w/${target}`, {
        timeout: 10000, // Just to be sure since I'm not sure about the behavior on fail
      })
      .text();
    if (!data.trim() || badResponses.some((r) => data.includes(r)))
      throw new ExpectedError('No information found');

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              # Whois Lookup
              ### :mag: Target
              \`\`\`${target}\`\`\`
              `,
            },
            {
              type: ComponentType.TextDisplay,
              content: '### :page_with_curl: Response',
            },
            {
              type: ComponentType.File,
              file: {
                url: 'attachment://whois.txt',
              },
            },
            {
              type: ComponentType.TextDisplay,
              content: '> Powered by da.gd',
            },
          ],
        },
      ],
      files: [
        {
          attachment: Buffer.from(data),
          name: 'whois.txt',
        },
      ],
    });
  },
};
