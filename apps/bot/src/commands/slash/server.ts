import {
  ComponentType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from 'discord.js';
import type { CommandInfer } from '~/types/command';
import { stripIndents } from 'common-tags';
import { toUnixTimestamp } from '@repo/utils/date';
import { env } from '@repo/env/bot';

export const command = <CommandInfer>{
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Replies with server information')
    .setContexts(InteractionContextType.Guild),
  async execute(intr) {
    const owner = await intr.guild?.fetchOwner();
    const createdAt = toUnixTimestamp(intr.guild!.createdTimestamp);

    await intr.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          accent_color: env.EMBED_COLOR,
          components: [
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: stripIndents`
                  # ${intr.guild?.name}
                  ### **Owner**
                  \`${owner?.user.tag}\` (\`${owner?.id}\`)
                  ### **ID**
                  \`${intr.guild?.id}\`
                  ### **Members**
                  \`${intr.guild?.memberCount}\`
                  ### **Roles**
                  \`${intr.guild?.roles.cache.size}\`
                  ### **Channels**
                  \`${intr.guild?.channels.cache.size}\`
                  ### **Boosts**
                  \`${intr.guild?.premiumSubscriptionCount} Boosts${intr.guild!.premiumTier > 0 ? ` ${intr.guild?.premiumTier}` : ''}\`
                  ### **Created At**
                  \`${time(createdAt, TimestampStyles.LongDateTime)} (${time(createdAt, TimestampStyles.RelativeTime)})\`
                  ### Download the raw guild data below
                  `,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: intr.guild!.iconURL()!,
                },
              },
            },
            {
              type: ComponentType.File,
              file: {
                url: 'attachment://guild.json',
              },
            },
          ],
        },
      ],
      files: [
        {
          attachment: Buffer.from(
            JSON.stringify(intr.guild?.toJSON(), null, 2),
          ),
          name: 'guild.json',
        },
      ],
    });
  },
};
