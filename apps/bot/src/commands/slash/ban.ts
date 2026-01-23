import type { Command } from '~/types/command.ts';
import {
  type ChatInputCommandInteraction,
  Colors,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  userMention,
} from 'discord.js';
import { stripIndents } from 'common-tags';
import { ExpectedError } from '~/types/errors';
import { Result } from 'better-result';

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to ban')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the ban'),
    )
    .addIntegerOption((option) =>
      option
        .setName('prune-days')
        .setDescription('The number of days to prune messages'),
    )
    .addBooleanOption((option) =>
      option
        .setName('ephemeral')
        .setDescription('Whether to show the response only to you'),
    )
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(intr: ChatInputCommandInteraction) {
    const user = intr.options.getUser('user', true);
    const reason = intr.options.getString('reason') ?? 'No reason provided';
    const pruneDays = intr.options.getInteger('prune-days') ?? 0;
    const ephemeral = intr.options.getBoolean('ephemeral') ?? false;

    if (user.id === intr.user.id)
      throw new ExpectedError("You can't ban yourself");
    if (user.id === intr.client.user.id)
      throw new ExpectedError("You can't ban me OwO");
    if (user.id === intr.guild?.ownerId)
      throw new ExpectedError("You can't ban the server owner");

    const member = intr.guild!.members.cache.get(user.id)!;
    const botMember = intr.guild!.members.cache.get(intr.client.user.id)!;
    if (
      member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0 ||
      !member.bannable
    )
      throw new ExpectedError("I can't ban this user");

    await member.ban({
      reason,
      deleteMessageSeconds: pruneDays * 86400,
    });

    await intr.reply({
      flags: ephemeral
        ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        : MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              # Member banned
              User \`${user.username}\` has been banned
              ### :warning: Reason
              \`\`\`${reason}\`\`\`
              `,
            },
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              ### :shield: Author
              ${userMention(intr.user.id)}
              `,
            },
          ],
        },
      ],
    });

    const notifyResult = await Result.tryPromise(() =>
      user.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.Container,
            accent_color: Colors.Red,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: stripIndents`
                  # You have been banned
                  ### Guild
                  \`\`\`${intr.guild?.name}\`\`\`
                  `,
              },
              {
                type: ComponentType.TextDisplay,
                content: stripIndents`
                  ### Reason
                  \`\`\`${reason}\`\`\`
                  `,
              },
            ],
          },
        ],
      }),
    );
    // This one is expected because a lot of users have DMs disabled
    if (Result.isError(notifyResult))
      throw new ExpectedError('Failed to notify the user about the ban');
  },
};
