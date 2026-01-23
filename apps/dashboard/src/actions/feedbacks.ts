'use server';

import { protect } from '@/utils/auth';
import { desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { feedbackStatusSchema } from '@repo/database/validations';
import { feedbacks } from '@repo/database/schema';
import type { FeedbackStatus } from '@repo/database/types';
import { db } from '@repo/database';
import { defaultGetActionSchema, pageSize } from '@/definitions/actions';
import {
  feedbackFinalStates,
  statusTransitions,
} from '@/definitions/feedbacks';
import z from 'zod';

export async function getFeedbacks(search?: string, page?: number) {
  await protect();

  const parsed = defaultGetActionSchema.parse({ search, page });

  let where: SQL | undefined;
  if (parsed.search) {
    const isNanoId = z.nanoid().safeParse(parsed.search).success;
    const isStatus = feedbackStatusSchema.safeParse(parsed.search).success;

    if (isNanoId)
      where = or(
        eq(feedbacks.id, parsed.search),
        eq(feedbacks.profileId, parsed.search),
      );
    else if (isStatus)
      where = eq(feedbacks.status, parsed.search as FeedbackStatus);
    else where = ilike(feedbacks.title, `%${parsed.search}%`);
  }

  const offset = (parsed.page - 1) * pageSize;

  const [data, totalCount] = await Promise.all([
    db.query.feedbacks.findMany({
      columns: { content: false, response: false },
      where,
      orderBy: [desc(feedbacks.createdAt)],
      offset,
      limit: pageSize,
    }),
    db.$count(feedbacks, where),
  ]);

  const pageCount = Math.ceil(totalCount / pageSize);

  return {
    data,
    pageCount,
  };
}

export async function getFeedback(id: string) {
  await protect();

  z.nanoid().parse(id);

  const feedback = await db.query.feedbacks.findFirst({
    where: eq(feedbacks.id, id),
  });
  if (!feedback) throw new Error('Feedback not found');

  return feedback;
}

export async function setStatus(id: string, status: FeedbackStatus) {
  await protect();

  z.nanoid().parse(id);
  feedbackStatusSchema.parse(status);

  const feedback = await db.query.feedbacks.findFirst({
    columns: { status: true },
    where: eq(feedbacks.id, id),
  });
  if (!feedback) throw new Error('Feedback not found');
  const availableTransitions = statusTransitions.get(feedback.status) ?? [];
  if (!availableTransitions.includes(status))
    throw new Error(
      `Invalid status transition from ${feedback.status} to ${status}`,
    );

  const result = await db
    .update(feedbacks)
    .set({ status })
    .where(eq(feedbacks.id, id));
  if (!result.rowCount) throw new Error('Feedback not found');
}

export async function setResponse(id: string, response: string) {
  await protect();

  z.nanoid().parse(id);
  z.string().min(1).parse(response);

  const feedback = await db.query.feedbacks.findFirst({
    columns: { status: true },
    where: eq(feedbacks.id, id),
  });
  if (!feedback) throw new Error('Feedback not found');
  if (feedbackFinalStates.includes(feedback.status))
    throw new Error('Cannot set response for feedback in a final state');

  const result = await db
    .update(feedbacks)
    .set({ response })
    .where(eq(feedbacks.id, id));
  if (!result.rowCount) throw new Error('Feedback not found');
}

export async function deleteFeedback(id: string) {
  await protect();

  z.nanoid().parse(id);

  await db.delete(feedbacks).where(eq(feedbacks.id, id));
}
