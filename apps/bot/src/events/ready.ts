import { ActivityType, Events, version } from 'discord.js';
import type { Event } from '~/types/event';
import type { CustomClient } from '~';
import logger from '~/logger';
import kleur from 'kleur';
import { testConnection as dbTestConnection } from '@repo/database/utils';
import { testConnection as redisTestConnection } from '@repo/redis/utils';
import { Result } from 'better-result';

export const event = <Event>{
  name: Events.ClientReady,
  once: true,
  async execute(client: CustomClient) {
    logger.log();

    const library = `${kleur.magenta(' Discord.js')} ${kleur.dim(version)}`;
    const runtime = `${kleur.yellow(' Bun')} ${kleur.dim(Bun.version)}`;
    logger.log(`${library} | ${runtime}`);

    logger.log();

    const dbLatency = await dbTestConnection();
    if (Result.isError(dbLatency)) {
      logger.error(dbLatency.error);
      process.exit(1);
    }
    logger.log(
      kleur.green(
        ` Database connected successfully! ${kleur.dim(`- ${dbLatency.value.toFixed(2)}ms`)}`,
      ),
    );

    const redisLatency = await redisTestConnection();
    if (Result.isError(redisLatency)) {
      logger.error(redisLatency.error);
      process.exit(1);
    }
    logger.log(
      kleur.green(
        ` Redis connected successfully! ${kleur.dim(`- ${redisLatency.value.toFixed(2)}ms`)}`,
      ),
    );

    logger.log();

    logger.log(kleur.green(` Online as ${kleur.bold(client.user!.tag)}`));
    const presence = client.user!.presence.activities[0]!;
    logger.log(
      kleur.blue(`󱞩 Presence: ${ActivityType[presence.type]} ${presence.name}`),
    );
    logger.log(`󱞩 API Version: ${client.options.rest?.version}`);
  },
};
