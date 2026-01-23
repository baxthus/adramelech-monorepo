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
import z from 'zod';

const responseSchema = z.xor([
  z.object({ shorturl: z.url() }),
  z.object({ errormessage: z.string() }),
]);

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('short')
    .setDescription('Shorten a URL')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('The URL to shorten')
        .setRequired(true),
    ),
  cooldown: true,
  uses: ['is.gd'],
  async execute(intr: ChatInputCommandInteraction) {
    await intr.deferReply();

    const url = intr.options.getString('url', true);
    if (!responseSchema.safeParse({ shorturl: url }).success)
      throw new ExpectedError('Invalid URL');

    const data = await ky
      .get('https://is.gd/create.php', {
        searchParams: {
          format: 'json',
          url: url,
        },
      })
      .json()
      .then((json) => {
        const parsed = responseSchema.parse(json);
        if ('errormessage' in parsed)
          throw new ExpectedError(parsed.errormessage);
        return parsed;
      });

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              ### :outbox_tray: Original URL
              \`\`\`${url}\`\`\`
              `,
            },
            { type: ComponentType.Separator, divider: false },
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              ### :inbox_tray: Shortened URL
              \`\`\`${data.shorturl}\`\`\`
              `,
            },
            {
              type: ComponentType.TextDisplay,
              content: '> Powered by is.gd',
            },
          ],
        },
      ],
    });
  },
};
