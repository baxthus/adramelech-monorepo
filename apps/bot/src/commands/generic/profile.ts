import { stripIndents } from 'common-tags';
import {
  ActionRowBuilder,
  ApplicationCommandType,
  ButtonStyle,
  Colors,
  ComponentType,
  ContextMenuCommandBuilder,
  MessageFlags,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  time,
  TimestampStyles,
  type ChatInputCommandInteraction,
  type CommandInteraction,
  type ModalActionRowComponentBuilder,
  type User,
  type UserContextMenuCommandInteraction,
} from 'discord.js';
import { UIBuilder } from '~/services/UIBuilder';
import {
  executeCommandFromTree,
  type CommandGroupExecutors,
  type Command,
} from '~/types/command';
import type { Component } from '~/types/component';
import type { Modal } from '~/types/modal';
import { db } from '@repo/database';
import { profiles, socials } from '@repo/database/schema';
import { and, asc, eq, ilike } from 'drizzle-orm';
import { exists } from '@repo/database/utils';
import { toUnixTimestamp } from '@repo/utils/date';
import { ExpectedError } from '~/types/errors';
import z from 'zod';

export const commands = <Command[]>[
  {
    data: new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Manage your profile')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('view')
          .setDescription('View your profile')
          .addUserOption((option) =>
            option
              .setName('user')
              .setDescription('To view the profile of another user'),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand.setName('create').setDescription('Create your profile'),
      )
      .addSubcommand((subcommand) =>
        subcommand.setName('delete').setDescription('Delete your profile'),
      )
      .addSubcommandGroup((group) =>
        group
          .setName('set')
          .setDescription('Set information in your profile')
          .addSubcommand((subcommand) =>
            subcommand.setName('bio').setDescription('Set your profile bio'),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('nickname')
              .setDescription('Set your profile nickname')
              .addStringOption((option) =>
                option
                  .setName('nickname')
                  .setDescription('Your new nickname')
                  .setMaxLength(32)
                  .setRequired(true),
              ),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('social')
              .setDescription('Add a social link to your profile')
              .addStringOption((option) =>
                option
                  .setName('name')
                  .setDescription('The name of the social platform')
                  .setRequired(true),
              )
              .addStringOption((option) =>
                option
                  .setName('link')
                  .setDescription('The link to the social profile')
                  .setRequired(true),
              ),
          ),
      )
      .addSubcommandGroup((group) =>
        group
          .setName('remove')
          .setDescription('Remove information from your profile')
          .addSubcommand((subcommand) =>
            subcommand.setName('bio').setDescription('Remove your profile bio'),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('nickname')
              .setDescription('Remove your profile nickname'),
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName('social')
              .setDescription('Remove a social link from your profile')
              .addStringOption((option) =>
                option
                  .setName('id')
                  .setDescription('The ID of the social link to remove')
                  .setRequired(true)
                  .setAutocomplete(true),
              ),
          ),
      ),
    execute: async (interaction: ChatInputCommandInteraction) =>
      await executeCommandFromTree(executors, interaction),
    async autocomplete(intr) {
      if (
        intr.options.getSubcommandGroup(false) !== 'remove' ||
        intr.options.getSubcommand() !== 'social'
      )
        return;

      const focused = intr.options.getFocused();
      const nameFilter = focused
        ? ilike(socials.name, `%${focused}%`)
        : undefined;

      const profile = await db.query.profiles.findFirst({
        columns: { id: true },
        where: eq(profiles.discordId, intr.user.id),
        with: {
          socials: {
            columns: { id: true, name: true },
            where: nameFilter,
            orderBy: [asc(socials.name)],
            limit: 25,
          },
        },
      });

      if (!profile?.socials.length) return await intr.respond([]);

      await intr.respond(
        profile.socials.map((social) => ({
          name: social.name,
          value: social.id,
        })),
      );
    },
  },
  {
    data: new ContextMenuCommandBuilder()
      .setName('Profile')
      .setType(ApplicationCommandType.User),
    execute: async (intr: UserContextMenuCommandInteraction) =>
      await viewProfile(intr, intr.targetUser),
  },
];

const executors: CommandGroupExecutors = {
  view: async (intr: ChatInputCommandInteraction) => {
    const user = intr.options.getUser('user') ?? intr.user;
    await viewProfile(intr, user);
  },
  create: createProfile,
  delete: deleteProfile,
  set: {
    bio: setBio,
    nickname: setNickname,
    social: addSocial,
  },
  remove: {
    bio: removeBio,
    nickname: removeNickname,
    social: removeSocial,
  },
};

async function viewProfile(intr: CommandInteraction, user: User) {
  await intr.deferReply();

  const profile = await db.query.profiles.findFirst({
    columns: { discordId: false },
    where: eq(profiles.discordId, user.id),
    with: {
      socials: {
        columns: { name: true, url: true },
      },
    },
  });
  if (!profile) throw new ExpectedError('This user does not have a profile');

  const haveSocials = profile.socials.length > 0;

  const registeredAt = toUnixTimestamp(profile.createdAt);

  await intr.followUp({
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.Section,
            accessory: {
              type: ComponentType.Thumbnail,
              media: { url: user.displayAvatarURL({ size: 1024 }) },
            },
            components: [
              {
                type: ComponentType.TextDisplay,
                content: stripIndents`
                # ${user.username}
                ### ID
                \`${profile.id}\`
                ### Registered At
                ${time(registeredAt, TimestampStyles.ShortDateTime)} (${time(registeredAt, TimestampStyles.RelativeTime)})
                ### Nickname
                \`${profile.nickname ?? 'None'}\`
                ### Bio
                \`\`\`${profile.bio ?? 'None'}\`\`\`
                `,
              },
            ],
          },
          {
            type: ComponentType.TextDisplay,
            content: '### Socials',
          },
          {
            type: haveSocials
              ? ComponentType.ActionRow
              : ComponentType.TextDisplay,
            content: haveSocials ? undefined : 'No social links found',
            components: profile.socials.map((social) => ({
              type: ComponentType.Button,
              label: social.name,
              style: ButtonStyle.Link,
              url: social.url,
            })),
          },
          {
            type: ComponentType.TextDisplay,
            content:
              '> For information about the user discord profile, use /user-info or "User Info" context menu command',
          },
        ],
      },
    ],
  });
}

async function createProfile(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  if (await exists(profiles, eq(profiles.discordId, intr.user.id)))
    throw new ExpectedError('You already have a profile!');

  const result = await db.insert(profiles).values({ discordId: intr.user.id });
  if (!result.rowCount)
    throw new Error('Failed to create user profile', { cause: result });

  await intr.followUp(
    UIBuilder.createGenericSuccess('# Your profile has been created!'),
  );
}

async function deleteProfile(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  if (!(await exists(profiles, eq(profiles.discordId, intr.user.id))))
    throw new ExpectedError('You do not have a profile to delete');

  await intr.followUp({
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [
      {
        type: ComponentType.Container,
        accent_color: Colors.Red,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            ### Are you sure you want to delete your profile?
            This action is irreversible and will delete all your profile information
            `,
          },
          { type: ComponentType.Separator, divider: false },
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                custom_id: 'button-delete-profile',
                label: 'Confirm',
                style: ButtonStyle.Danger,
                emoji: { name: '🗑️' },
              },
            ],
          },
        ],
      },
    ],
  });
}

async function setBio(intr: ChatInputCommandInteraction) {
  if (!(await exists(profiles, eq(profiles.discordId, intr.user.id))))
    throw new ExpectedError('You do not have a profile to edit');

  await intr.showModal({
    title: 'Edit Bio',
    customId: 'modal-edit-bio',
    components: [
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        new TextInputBuilder({
          customId: 'content',
          label: 'Bio',
          style: TextInputStyle.Paragraph,
          placeholder: 'Enter your new bio here',
          required: true,
        }),
      ),
    ],
  });
}

async function setNickname(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  if (!(await exists(profiles, eq(profiles.discordId, intr.user.id))))
    throw new ExpectedError('You do not have a profile to edit');

  const nickname = intr.options.getString('nickname', true).trim();

  const result = await db
    .update(profiles)
    .set({ nickname })
    .where(eq(profiles.discordId, intr.user.id));
  if (!result.rowCount)
    throw new Error('Failed to update user nickname', { cause: result });

  await intr.followUp(
    UIBuilder.createGenericSuccess('# Your nickname has been updated!'),
  );
}

async function addSocial(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  const profile = await db.query.profiles.findFirst({
    columns: { id: true },
    where: eq(profiles.discordId, intr.user.id),
    with: {
      socials: {
        columns: { name: true, id: true },
      },
    },
  });
  if (!profile) throw new ExpectedError('You do not have a profile to edit');

  if (profile.socials.length >= 5)
    throw new ExpectedError(
      'You can only have up to 5 social links in your profile',
    );

  const name = intr.options.getString('name', true).trim();
  const link = intr.options.getString('link', true).trim();

  if (!z.url().safeParse(link).success)
    throw new ExpectedError('The provided link is not a valid URL');

  if (
    profile.socials.some(
      (social) => social.name.toLowerCase() === name.toLowerCase(),
    )
  )
    throw new ExpectedError(
      `You already have a social link with the name \`${name}\`. Please choose a different name`,
    );

  await db.insert(socials).values({
    profileId: profile.id,
    name,
    url: link,
  });

  await intr.followUp(
    UIBuilder.createGenericSuccess('# The social link has been added!'),
  );
}

async function removeBio(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  const profile = await db.query.profiles.findFirst({
    columns: { bio: true },
    where: eq(profiles.discordId, intr.user.id),
  });
  if (!profile) throw new ExpectedError('You do not have a profile to edit');
  if (!profile.bio) throw new ExpectedError('You do not have a bio to remove');

  const result = await db
    .update(profiles)
    .set({ bio: null })
    .where(eq(profiles.discordId, intr.user.id));
  if (!result.rowCount)
    throw new Error('Failed to remove user bio', { cause: result });

  await intr.followUp(
    UIBuilder.createGenericSuccess('# Your bio has been removed!'),
  );
}

async function removeNickname(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  const profile = await db.query.profiles.findFirst({
    columns: { nickname: true },
    where: eq(profiles.discordId, intr.user.id),
  });
  if (!profile) throw new ExpectedError('You do not have a profile to edit');
  if (!profile.nickname)
    throw new ExpectedError('You do not have a nickname to remove');

  const result = await db
    .update(profiles)
    .set({ nickname: null })
    .where(eq(profiles.discordId, intr.user.id));
  if (!result.rowCount)
    throw new Error('Failed to remove user nickname', { cause: result });

  await intr.followUp(
    UIBuilder.createGenericSuccess('# Your nickname has been removed!'),
  );
}

async function removeSocial(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  const socialId = intr.options.getString('id', true).trim();

  const profile = await db.query.profiles.findFirst({
    columns: { id: true },
    where: eq(profiles.discordId, intr.user.id),
    with: {
      socials: {
        columns: { id: true },
        where: eq(socials.id, socialId),
      },
    },
  });
  if (!profile) throw new ExpectedError('You do not have a profile to edit');
  if (!profile.socials.length)
    throw new ExpectedError(
      'You do not have a social link with that ID to remove',
    );

  const result = await db
    .delete(socials)
    .where(and(eq(socials.id, socialId), eq(socials.profileId, profile.id)));
  if (!result.rowCount)
    throw new Error('Failed to remove the social link', { cause: result });

  await intr.followUp(
    UIBuilder.createGenericSuccess('# The social link has been removed!'),
  );
}

export const component = <Component>{
  type: ComponentType.Button,
  customId: 'button-delete-profile',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await db
      .delete(profiles)
      .where(eq(profiles.discordId, interaction.user.id));
    if (!result.rowCount)
      throw new Error('Failed to delete user profile', { cause: result });

    await interaction.followUp(
      UIBuilder.createGenericSuccess('# Your profile has been deleted!'),
    );
  },
};

export const modal = <Modal>{
  customId: 'modal-edit-bio',
  async execute(intr) {
    await intr.deferReply({ flags: MessageFlags.Ephemeral });

    const content = intr.fields.getTextInputValue('content').trim();

    const result = await db
      .update(profiles)
      .set({ bio: content })
      .where(eq(profiles.discordId, intr.user.id));
    if (!result.rowCount)
      throw new Error('Failed to update user bio', { cause: result });

    await intr.followUp(
      UIBuilder.createGenericSuccess('# Your bio has been updated!'),
    );
  },
};
