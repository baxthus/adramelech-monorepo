import {
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { Command } from '~/types/command';

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice')
    .addIntegerOption((option) =>
      option
        .setName('sides')
        .setDescription('Number of sides. Default is 6')
        .setMinValue(2)
        .setMaxValue(100),
    ),
  async execute(intr: ChatInputCommandInteraction) {
    const sides = intr.options.getInteger('sides') ?? 6;
    const result = Math.floor(Math.random() * sides) + 1;

    await intr.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,

              content: `# You rolled a ${result} on a ${sides}-sided dice`,
            },
          ],
        },
      ],
    });
  },
};
