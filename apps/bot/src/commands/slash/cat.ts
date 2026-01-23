import type { Command } from '~/types/command.ts';
import { ComponentType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import ky from 'ky';
import z from 'zod';

const catImagesSchema = z
  .object({
    url: z.url(),
  })
  .array()
  .length(1);

export const command = <Command>{
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
      .then(catImagesSchema.parse);

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
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
