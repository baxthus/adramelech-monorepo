import { ComponentType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import ky from 'ky';
import z from 'zod';
import type { Command } from '~/types/command';

const dogImageSchema = z.object({
  status: z.literal('success'),
  message: z.url(),
});

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Get a random dog image'),
  uses: ['dog.ceo'],
  cooldown: true,
  async execute(intr) {
    await intr.deferReply();

    const data = await ky
      .get('https://dog.ceo/api/breeds/image/random')
      .json()
      .then(dogImageSchema.parse);

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
                    url: data.message,
                  },
                },
              ],
            },
            {
              type: ComponentType.TextDisplay,
              content: '> Powered by dog.ceo',
            },
          ],
        },
      ],
    });
  },
};
