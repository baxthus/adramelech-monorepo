'use server';

import { protect } from '@/utils/auth';
import { desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { phrases } from '@repo/database/schema';
import { db } from '@repo/database';
import type { PhraseCreate } from '@repo/database/types';
import { phraseCreateSchema } from '@repo/database/validations';
import { defaultGetActionSchema, pageSize } from '@/definitions/actions';
import z from 'zod';

export async function getPhrases(search?: string, page?: number) {
  await protect();

  const parsed = defaultGetActionSchema.parse({ search, page });

  let where: SQL | undefined;
  if (parsed.search) {
    const isNanoId = z.nanoid().safeParse(parsed.search).success;

    if (isNanoId) where = eq(phrases.id, parsed.search);
    else
      where = or(
        ilike(phrases.content, `%${parsed.search}%`),
        ilike(phrases.source, `%${parsed.search}%`),
      );
  }

  const offset = (parsed.page - 1) * pageSize;

  const [data, totalCount] = await Promise.all([
    db.query.phrases.findMany({
      where,
      orderBy: [desc(phrases.createdAt)],
      offset,
      limit: pageSize,
    }),
    db.$count(phrases, where),
  ]);

  const pageCount = Math.ceil(totalCount / pageSize);

  return {
    data,
    pageCount,
  };
}

export async function createPhrase(phrase: PhraseCreate) {
  await protect();

  const data = phraseCreateSchema.parse(phrase);

  await db.insert(phrases).values(data);
}

export async function deletePhrase(id: string) {
  await protect();

  z.nanoid().parse(id);

  const result = await db.delete(phrases).where(eq(phrases.id, id));
  if (!result.rowCount) throw new Error('Phrase not found');
}
