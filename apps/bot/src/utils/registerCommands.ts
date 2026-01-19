import { env } from '@repo/env/bot';
import { Result } from 'better-result';
import { REST, Routes } from 'discord.js';
import type { CustomClient } from '~';
import logger from '~/logger';

export default async function registerCommands(client: CustomClient) {
  const commands = client.commands.map((command) => command.data.toJSON());
  const rest = new REST().setToken(env.BOT_TOKEN);

  const result = (
    await Result.tryPromise(() =>
      rest.put(Routes.applicationCommands(env.BOT_ID), {
        body: commands,
      }),
    )
  ).map((r) => r as unknown[]);
  if (Result.isError(result)) {
    logger.error('Error refreshing application commands', result.error);
    process.exit(1);
  }

  logger.success(`${result.value.length} commands registered`);
}
