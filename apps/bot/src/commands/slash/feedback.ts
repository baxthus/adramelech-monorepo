import {
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {
  executeCommandFromTree,
  type CommandExecutors,
  type CommandInfer,
} from '~/types/command';
import { stripIndents } from 'common-tags';
import v from 'voca';
import { UIBuilder } from '~/services/UIBuilder';
import type { ModalInfer } from '~/types/modal';
import { and, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import { feedbacks, profiles } from '@repo/database/schema';
import { db } from '@repo/database';
import { exists } from '@repo/database/utils';
import { toUnixTimestamp } from '@repo/utils/date';
import { ExpectedError } from '~/types/errors';

export const command = <CommandInfer>{
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send suggestions/bug reports to the bot developers')
    .addSubcommand((subcommand) =>
      subcommand.setName('create').setDescription('Create a new feedback'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View your feedbacks')
        .addStringOption((option) =>
          option
            .setName('feedback')
            .setDescription('The feedback to view')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('close')
        .setDescription('Close a feedback')
        .addStringOption((option) =>
          option
            .setName('feedback')
            .setDescription('The feedback to close')
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),
  cooldown: 86400, // 1 day
  execute: async (intr: ChatInputCommandInteraction) =>
    await executeCommandFromTree(executors, intr),
  async autocomplete(intr) {
    const subcommand = intr.options.getSubcommand();
    if (subcommand !== 'view' && subcommand !== 'close') return;

    const focused = intr.options.getFocused();
    const titleFilter = focused
      ? ilike(feedbacks.title, `%${focused}%`)
      : undefined;

    // Show only open/acknowledged feedbacks when closing
    const statusFilter: SQL | undefined =
      subcommand === 'close'
        ? inArray(feedbacks.status, ['OPEN', 'ACKNOWLEDGED'])
        : undefined;

    const profile = await db.query.profiles.findFirst({
      columns: { id: true },
      where: eq(profiles.discordId, intr.user.id),
      with: {
        feedbacks: {
          columns: { id: true, title: true },
          where: and(titleFilter, statusFilter),
          orderBy: [desc(feedbacks.createdAt)],
          limit: 25,
        },
      },
    });
    if (!profile || !profile.feedbacks.length) return await intr.respond([]);

    await intr.respond(
      profile.feedbacks.map((f) => ({
        name: f.title,
        value: f.id,
      })),
    );
  },
};

const executors: CommandExecutors = {
  create: createFeedback,
  view: viewFeedback,
  close: closeFeedback,
};

async function createFeedback(intr: ChatInputCommandInteraction) {
  if (!(await exists(profiles, eq(profiles.discordId, intr.user.id))))
    throw new ExpectedError(
      'You need to register first using `/profile create` command',
    );

  await intr.showModal({
    customId: 'modal-feedback',
    title: 'Feedback',
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.TextInput,
            customId: 'title',
            label: 'Title',
            style: TextInputStyle.Short,
            placeholder: 'Enter a title for your feedback',
            required: true,
          },
        ],
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.TextInput,
            customId: 'content',
            label: 'Content',
            style: TextInputStyle.Paragraph,
            placeholder: 'Enter the content of your feedback',
            required: true,
          },
        ],
      },
    ],
  });
}

async function viewFeedback(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  const feedbackId = intr.options.getString('feedback', true);

  const profile = await db.query.profiles.findFirst({
    columns: { id: true },
    where: eq(profiles.discordId, intr.user.id),
    with: {
      feedbacks: {
        where: eq(feedbacks.id, feedbackId),
        limit: 1,
      },
    },
  });
  if (!profile)
    throw new ExpectedError(
      'You need to register first using `/profile create` command',
    );

  const feedback = profile.feedbacks[0];
  if (!feedback)
    throw new ExpectedError('Feedback not found or does not belong to you');

  await intr.followUp({
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            # Feedback details
            ### ID
            \`\`\`${feedbackId}\`\`\`
            `,
          },
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            ### Title
            \`\`\`${feedback.title}\`\`\`
            `,
          },
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            ### Created at
            <t:${toUnixTimestamp(feedback.createdAt)}:R>
            ### Updated at
            <t:${toUnixTimestamp(feedback.updatedAt)}:R>
            ### Status
            \`\`\`${v.titleCase(feedback.status)}\`\`\`
            `,
          },
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            ### Content
            \`\`\`${feedback.content}\`\`\`
            `,
          },
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            ### Response
            \`\`\`${feedback.response || 'No response'}\`\`\`
            `,
          },
        ],
      },
    ],
  });
}

async function closeFeedback(intr: ChatInputCommandInteraction) {
  await intr.deferReply({ flags: MessageFlags.Ephemeral });

  const profile = await db.query.profiles.findFirst({
    columns: { id: true },
    where: eq(profiles.discordId, intr.user.id),
  });
  if (!profile)
    throw new ExpectedError(
      'You need to register first using `/profile create` command',
    );

  const feedbackId = intr.options.getString('feedback', true);

  const result = await db
    .update(feedbacks)
    .set({ status: 'CLOSED' })
    .where(
      and(
        eq(feedbacks.id, feedbackId),
        eq(feedbacks.profileId, profile.id),
        inArray(feedbacks.status, ['OPEN', 'ACKNOWLEDGED']),
      ),
    );
  if (!result.rowCount)
    throw new ExpectedError(
      'Failed to close feedback. It may not exist, not be open, or not belong to you',
    );

  await intr.followUp(
    UIBuilder.createGenericSuccess('# Feedback closed successfully!'),
  );
}

export const modal = <ModalInfer>{
  customId: 'modal-feedback',
  async execute(intr) {
    await intr.deferReply({ flags: MessageFlags.Ephemeral });

    const profile = await db.query.profiles.findFirst({
      columns: { id: true },
      where: eq(profiles.discordId, intr.user.id),
    });
    if (!profile)
      throw new ExpectedError(
        'You need to register first using `/profile create` command',
      );

    const title = intr.fields.getTextInputValue('title');
    const content = intr.fields.getTextInputValue('content');

    await db.insert(feedbacks).values({
      profileId: profile.id,
      title,
      content,
    });

    await intr.followUp(
      UIBuilder.createGenericSuccess('# Feedback submitted!'),
    );
  },
};
