import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  ComponentType,
  TextChannel,
  TextInputStyle,
  MessageFlags,
  userMention,
} from 'discord.js';
import type { Command } from '~/types/command';
import type { Modal } from '~/types/modal';
import { UIBuilder } from '~/services/UIBuilder';
import { ExpectedError } from '~/types/errors';

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Echoes a message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(intr) {
    await intr.showModal({
      customId: 'modal-echo',
      title: 'Echo',
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              customId: 'message',
              label: 'Message',
              style: TextInputStyle.Paragraph,
            },
          ],
        },
      ],
    });
  },
};

export const modal = <Modal>{
  customId: 'modal-echo',
  async execute(intr) {
    const message = intr.fields.getTextInputValue('message');

    if (!(intr.channel instanceof TextChannel))
      throw new ExpectedError('This command can only be used in text channels');

    if (intr.guild) {
      const me = intr.guild.members.me;
      if (!me) throw new Error('Failed to fetch bot member in guild');
      if (!me.permissionsIn(intr.channel).has(PermissionFlagsBits.SendMessages))
        throw new ExpectedError(
          "I don't have permission to send messages in this channel",
        );
    }

    await intr.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `\`\`\`${message}\`\`\``,
        },
        {
          type: ComponentType.TextDisplay,
          content: `> ${userMention(intr.user.id)}`,
        },
      ],
    });

    await intr.reply(
      UIBuilder.createGenericSuccess('# Message sent successfully'),
    );
  },
};
