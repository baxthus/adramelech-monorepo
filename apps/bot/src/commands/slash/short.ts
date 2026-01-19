import {
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import ky from 'ky';
import type { CommandInfer } from '~/types/command';
import { stripIndents } from 'common-tags';
import { type } from 'arktype';
import { ExpectedError } from '~/types/errors';
import { env } from '@repo/env/bot';

const OkResponse = type({
  shorturl: 'string.url',
});

const ErrorResponse = type({
  errormessage: 'string',
});

export const command = <CommandInfer>{
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
    if (type('string.url')(url) instanceof type.errors)
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
        const out = OkResponse(json);
        if (out instanceof type.errors) {
          const errOut = ErrorResponse.assert(json);
          throw new ExpectedError(errOut.errormessage);
        }
        return out;
      });

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
              ### :outbox_tray: Original URL
              \`\`\`${url}\`\`\`
              `,
            },
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
