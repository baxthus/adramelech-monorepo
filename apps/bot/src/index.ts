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
import type { Command } from '~/types/command';
import type { Component } from '~/types/component';
import type { Event } from '~/types/event';
import type { Modal } from '~/types/modal';
import registerCommands from '~/utils/registerCommands';
import { env } from '@repo/env/bot';
import z from 'zod';

export class CustomClient extends Client {
  commands: Collection<string, Command> = new Collection();
  events: Collection<string, Event> = new Collection();
  components: Collection<string, Component> = new Collection();
  modals: Collection<string, Modal> = new Collection();
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
