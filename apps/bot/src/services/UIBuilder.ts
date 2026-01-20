import {
  Colors,
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
          accent_color: Colors.Green,
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
