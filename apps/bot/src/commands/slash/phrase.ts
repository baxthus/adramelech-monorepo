import { ComponentType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '~/types/command';
import { db } from '@repo/database';
import { phrases } from '@repo/database/schema';
import { sql } from 'drizzle-orm';
import { ExpectedError } from '~/types/errors';

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('phrase')
    .setDescription('Get a random phrase'),
  async execute(intr) {
    await intr.deferReply();

    const result = await db
      .select()
      .from(phrases)
      .orderBy(sql`RANDOM()`)
      .limit(1);
    const phrase = result[0];
    if (!phrase) throw new ExpectedError('No phrase found in the database');

    await intr.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `\`\`\`${phrase.content}\`\`\``,
            },
            {
              type: ComponentType.TextDisplay,
              content: `> ${phrase.source}`,
            },
          ],
        },
      ],
    });
  },
};
