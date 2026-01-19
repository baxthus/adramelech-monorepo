import {
  ApplicationCommandType,
  AttachmentBuilder,
  ComponentType,
  ContainerBuilder,
  ContextMenuCommandBuilder,
  FileBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SlashCommandBuilder,
  TextDisplayBuilder,
  time,
  TimestampStyles,
  type ChatInputCommandInteraction,
  type CommandInteraction,
  type User,
  type UserContextMenuCommandInteraction,
} from 'discord.js';
import type { CommandInfer } from '~/types/command';
import { stripIndents } from 'common-tags';
import { toUnixTimestamp } from '@repo/utils/date';
import { env } from '@repo/env/bot';

export const commands = <Array<CommandInfer>>[
  {
    data: new SlashCommandBuilder()
      .setName('user-info')
      .setDescription('Get information about a user')
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The user to get information about'),
      ),
    execute: async (intr: ChatInputCommandInteraction) =>
      await helper(intr, intr.options.getUser('user') ?? intr.user),
  },
  {
    data: new ContextMenuCommandBuilder()
      .setName('User Info')
      .setType(ApplicationCommandType.User),
    execute: async (intr: UserContextMenuCommandInteraction) =>
      await helper(intr, intr.targetUser),
  },
];

async function helper(intr: CommandInteraction, user: User) {
  const member = await intr.guild?.members.fetch(user.id).catch(() => null);

  const createdAt = toUnixTimestamp(user.createdTimestamp);

  const container = new ContainerBuilder({
    accent_color: env.EMBED_COLOR,
    components: [
      {
        type: ComponentType.Section,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            # ${user.username}
            ### **ID**
            \`${user.id}\`
            ### **Nickname**
            \`${member?.nickname ?? 'None'}\`
            ### **Created At**
            ${time(createdAt, TimestampStyles.ShortDateTime)} (${time(createdAt, TimestampStyles.RelativeTime)})
            ### Download the raw user data below
            `,
          },
        ],
        accessory: {
          type: ComponentType.Thumbnail,
          media: {
            url: user.displayAvatarURL({ size: 1024 }),
          },
        },
      },
      {
        type: ComponentType.File,
        file: {
          url: 'attachment://user.json',
        },
      },
    ],
  });

  const userFile = new AttachmentBuilder(
    Buffer.from(JSON.stringify(user.toJSON(), null, 2)),
    { name: 'user.json' },
  );

  if (!member) {
    await intr.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      files: [userFile],
    });
    return;
  }

  const joinedAt = toUnixTimestamp(member.joinedTimestamp!);
  const roles = member.roles.cache.toJSON();
  const permissions = member.permissions.toArray();

  container.components.push(
    new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    new TextDisplayBuilder({
      content: stripIndents`
      ## Guild Info
      ### **Joined At**
      ${time(joinedAt, TimestampStyles.ShortDateTime)} (${time(joinedAt, TimestampStyles.RelativeTime)})
      ### **Roles**
      ${roles.length > 0 ? roles.join(', ') : 'None'}
      ### **Permissions**
      ${permissions.length > 0 ? `\`\`\`${permissions.join(', ')}\`\`\`` : 'None'}
      `,
    }),
    new SeparatorBuilder({ divider: false }),
    new TextDisplayBuilder({
      content: '### Download the raw guild data below',
    }),
    new FileBuilder({
      file: {
        url: 'attachment://guild.json',
      },
    }),
  );

  const guildFile = new AttachmentBuilder(
    Buffer.from(JSON.stringify(member.toJSON(), null, 2)),
    { name: 'guild.json' },
  );

  await intr.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    files: [userFile, guildFile],
  });
}
