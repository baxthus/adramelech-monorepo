import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { CommandInfer } from '~/types/command';
import type { ComponentInfer } from '~/types/component';
import { stripIndents } from 'common-tags';
import { env } from '@repo/env/bot';

const createActionRow = (disabled: boolean = false) => ({
  type: ComponentType.ActionRow,
  components: [
    {
      type: ComponentType.Button,
      custom_id: 'button-latency',
      label: 'Velocity',
      style: ButtonStyle.Primary,
      disabled,
    },
    {
      type: ComponentType.Button,
      label: 'Author',
      style: ButtonStyle.Link,
      url: env.AUTHOR_URL,
    },
  ],
});

export const command = <CommandInfer>{
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(intr) {
    await intr.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          accent_color: env.EMBED_COLOR,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: '# Pong!',
            },
            { type: ComponentType.Separator, divider: false },
            createActionRow(),
          ],
        },
      ],
    });
  },
};

export const component = <ComponentInfer>{
  customId: 'button-latency',
  type: ComponentType.Button,
  async execute(intr) {
    await intr.update({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          accent_color: env.EMBED_COLOR,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: stripIndents`
              # Pong!
              ## Latency: \`${intr.client.ws.ping}ms\`
              `,
            },
            { type: ComponentType.Separator, divider: false },
            { type: ComponentType.Separator, divider: false },
            createActionRow(true),
          ],
        },
      ],
    });
  },
};
