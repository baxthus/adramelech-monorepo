import { env } from '@repo/env/bot';
import {
  ComponentType,
  MessageFlags,
  type InteractionReplyOptions,
} from 'discord.js';

export class UIBuilder {
  static createGenericSuccess(content: string, ephemeral: boolean = true) {
    const flags = [MessageFlags.IsComponentsV2];
    if (ephemeral) flags.push(MessageFlags.Ephemeral);
    return <InteractionReplyOptions>{
      flags,
      components: [
        {
          type: ComponentType.Container,
          accent_color: env.EMBED_COLOR,
          components: [
            {
              type: ComponentType.TextDisplay,
              content,
            },
          ],
        },
      ],
    };
  }
}
