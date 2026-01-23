'use server';

import { defaultGetActionSchema, pageSize } from '@/definitions/actions';
import { protect } from '@/utils/auth';
import { db } from '@repo/database';
import { socials } from '@repo/database/schema';
import { asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import z from 'zod';

export async function getSocials(search?: string, page?: number) {
  await protect();

  const parsed = defaultGetActionSchema.parse({ search, page });

  let where: SQL | undefined;
  if (parsed.search) {
    const isNanoId = z.nanoid().safeParse(parsed.search).success;

    if (isNanoId)
      where = or(
        eq(socials.id, parsed.search),
        eq(socials.profileId, parsed.search),
      );
    else
      where = or(
        ilike(socials.name, `%${parsed.search}%`),
        // I'll have to trust that the bot is doing proper URL validation
        // because I want full text search on URLs
        ilike(socials.url, `%${parsed.search}%`),
      );
  }

  const offset = (parsed.page - 1) * pageSize;

  const [data, totalCount] = await Promise.all([
    db.query.socials.findMany({
      where,
      orderBy: [asc(socials.name)],
      limit: pageSize,
      offset,
    }),
    db.$count(socials, where),
  ]);

  const pageCount = Math.ceil(totalCount / pageSize);

  return {
    data,
    pageCount,
  };
}

export async function deleteSocial(id: string) {
  await protect();

  z.nanoid().parse(id);

  const result = await db.delete(socials).where(eq(socials.id, id));
  if (!result.rowCount) throw new Error('Social not found');
}
