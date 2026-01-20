import { ComponentType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import ky from 'ky';
import type { CommandInfer } from '~/types/command';
import { type } from 'arktype';

const DogImage = type({
  status: '"success"',
  message: 'string.url',
});

export const command = <CommandInfer>{
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
      .then(DogImage.assert);

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
