'use server';

import { defaultGetActionSchema, pageSize } from '@/definitions/actions';
import { protect } from '@/utils/auth';
import { db } from '@repo/database';
import { profiles } from '@repo/database/schema';
import { desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import z from 'zod';

export async function getProfiles(search?: string, page?: number) {
  await protect();

  const parsed = defaultGetActionSchema.parse({ search, page });

  let where: SQL | undefined;
  if (parsed.search) {
    const isNanoId = z.nanoid().safeParse(parsed.search).success;
    const isDiscordId = z
      .string()
      .min(17)
      .max(19)
      .safeParse(parsed.search).success;

    if (isNanoId) where = eq(profiles.id, parsed.search);
    else if (isDiscordId) where = eq(profiles.discordId, parsed.search);
    else
      where = or(
        ilike(profiles.nickname, `%${parsed.search}%`),
        ilike(profiles.bio, `%${parsed.search}%`),
      );
  }

  const offset = (parsed.page - 1) * pageSize;

  const [data, totalCount] = await Promise.all([
    db.query.profiles.findMany({
      where,
      orderBy: [desc(profiles.createdAt)],
      offset,
      limit: pageSize,
    }),
    db.$count(profiles, where),
  ]);

  const pageCount = Math.ceil(totalCount / pageSize);

  return {
    data,
    pageCount,
  };
}

export async function deleteProfile(id: string) {
  await protect();

  z.nanoid().parse(id);

  const result = await db.delete(profiles).where(eq(profiles.id, id));
  if (!result.rowCount) throw new Error('Profile not found');
}
