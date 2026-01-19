import '~/instrument'; // Sentry, import this first

import '@repo/database'; // Preload
import {
  ActivityType,
  Client,
  Collection,
  GatewayIntentBits,
} from 'discord.js';
import { loadModules } from '~/loader';
import logger from '~/logger';
import type { CommandInfer } from '~/types/command';
import type { ComponentInfer } from '~/types/component';
import type { EventInfer } from '~/types/event';
import type { ModalInfer } from '~/types/modal';
import registerCommands from '~/utils/registerCommands';
import { env } from '@repo/env/bot';
import z from 'zod';

export class CustomClient extends Client {
  commands: Collection<string, CommandInfer> = new Collection();
  events: Collection<string, EventInfer> = new Collection();
  components: Collection<string, ComponentInfer> = new Collection();
  modals: Collection<string, ModalInfer> = new Collection();
}

export const client = new CustomClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  presence: {
    activities: [
      {
        type: z.enum(ActivityType).parse(env.PRESENCE_TYPE),
        name: env.PRESENCE_NAME,
      },
    ],
  },
});

await loadModules(client);

if (client.commands.size > 0) await registerCommands(client);
else logger.warn('No commands found. Skipping command refreshing');

await client.login(env.BOT_TOKEN);
