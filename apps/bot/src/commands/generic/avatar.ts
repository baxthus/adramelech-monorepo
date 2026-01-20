import {
  ApplicationCommandType,
  ButtonStyle,
  ComponentType,
  ContextMenuCommandBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type CommandInteraction,
  type User,
  type UserContextMenuCommandInteraction,
} from 'discord.js';
import type { CommandInfer } from '~/types/command';

export const commands = <Array<CommandInfer>>[
  {
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get the avatar of a user')
      .addUserOption((option) =>
        option.setName('user').setDescription('The user to get the avatar of'),
      ),
    execute: async (intr: ChatInputCommandInteraction) =>
      await helper(intr, intr.options.getUser('user') ?? intr.user),
  },
  {
    data: new ContextMenuCommandBuilder()
      .setName('Avatar')
      .setType(ApplicationCommandType.User),
    execute: async (intr: UserContextMenuCommandInteraction) =>
      await helper(intr, intr.targetUser),
  },
];

async function helper(interaction: CommandInteraction, user: User) {
  interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `# Avatar of ${user.displayName}`,
          },
          {
            type: ComponentType.MediaGallery,
            items: [
              {
                media: {
                  url: user.displayAvatarURL({ size: 1024 }),
                },
              },
            ],
          },
          {
            type: ComponentType.TextDisplay,
            content: '> Different formats below',
          },
          {
            type: ComponentType.ActionRow,
            components: ['png', 'jpeg', 'webp', 'gif'].map((ext) => ({
              type: ComponentType.Button,
              style: ButtonStyle.Link,
              label: ext.toUpperCase(),
              url: user.displayAvatarURL({
                extension: ext as 'png' | 'jpeg' | 'webp' | 'gif',
                size: 4096,
              }),
            })),
          },
        ],
      },
    ],
  });
}
