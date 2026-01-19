import type { CommandInfer } from '~/types/command.ts';
import { ComponentType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import ky from 'ky';
import { type } from 'arktype';
import { env } from '@repo/env/bot';

const CatImages = type({
  url: 'string.url',
})
  .array()
  .exactlyLength(1);

export const command = <CommandInfer>{
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Get a random cat image'),
  cooldown: true,
  uses: ['thecatapi.com'],
  async execute(intr) {
    await intr.deferReply();

    const data = await ky
      .get('https://api.thecatapi.com/v1/images/search')
      .json()
      .then(CatImages.assert);

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          accent_color: env.EMBED_COLOR,
          components: [
            {
              type: ComponentType.MediaGallery,
              items: [
                {
                  media: {
                    url: data[0]!.url,
                  },
                },
              ],
            },
            {
              type: ComponentType.TextDisplay,
              content: '> Powered by thecatapi.com',
            },
          ],
        },
      ],
    });
  },
};
