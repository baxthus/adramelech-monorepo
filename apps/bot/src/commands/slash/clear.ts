import {
  ComponentType,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  time,
  TimestampStyles,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import StringBuilder from '~/tools/StringBuilder';
import type { Command } from '~/types/command';
import { toUnixTimestamp } from '@repo/utils/date';
import { ExpectedError } from '~/types/errors';
import { Result } from 'better-result';

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the chat')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addNumberOption((option) =>
      option
        .setName('amount')
        .setDescription('The amount of messages to clear')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName('seconds-before-auto-delete')
        .setDescription(
          'The amount of seconds before the bot response if auto-deleted',
        )
        .setMinValue(0)
        .setMaxValue(10),
    ),
  async execute(intr: ChatInputCommandInteraction) {
    await intr.deferReply(); // theoretically not needed, but testing proves otherwise

    if (
      !(intr.channel as TextChannel)
        .permissionsFor(intr.guild!.members.me!)
        ?.has(PermissionFlagsBits.ManageMessages)
    )
      throw new ExpectedError(
        "I don't have permissions to manage messages in this channel",
      );

    const amount = intr.options.getNumber('amount', true);
    const secondsBeforeAutoDelete =
      intr.options.getNumber('seconds-before-auto-delete') ?? 0;

    const messages = (
      await intr.channel!.messages.fetch({
        limit: amount === 100 ? amount : amount + 1, // compensate for the command message
      })
    )
      .toJSON()
      .filter((msg) => Date.now() - msg.createdTimestamp < 1209600000) // 14 days
      .slice(1) // skip the command message
      .map((msg) => msg.id);

    if (!messages.length)
      throw new ExpectedError('No messages found to delete');

    const deletedMessages = await (intr.channel as TextChannel)
      .bulkDelete(messages, true)
      .then((msgs) => msgs.size);

    const message = new StringBuilder();
    message.appendLine(`# Successfully cleared ${deletedMessages} messages`);
    if (secondsBeforeAutoDelete)
      message.appendLine(
        `### This message will be auto-deleted ${time(
          toUnixTimestamp(Date.now()) + secondsBeforeAutoDelete,
          TimestampStyles.RelativeTime,
        )}`,
      );
    message.appendLine(`> Command executed by ${intr.user}`);

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: message.toString(),
            },
          ],
        },
      ],
    });

    if (!secondsBeforeAutoDelete) return;

    setTimeout(async () => {
      await Result.tryPromise(() => intr.deleteReply());
    }, secondsBeforeAutoDelete * 1000);
  },
};
