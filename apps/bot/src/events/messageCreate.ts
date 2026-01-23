import { Events, type Message } from 'discord.js';
import { trackMessage } from '@repo/redis/telemetry';
import { fireAndForget } from '@repo/utils/async';
import type { Event } from '~/types/event';

export const event = <Event>{
  name: Events.MessageCreate,
  execute: (message: Message) => {
    if (message.author.bot) return;
    fireAndForget(() =>
      trackMessage(message.author.id, message.guild?.id || undefined),
    );
  },
};
