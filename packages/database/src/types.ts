import type { feedbackStatusSchema, phraseCreateSchema } from './validations';
import type { phrases } from './schema';
import type z from 'zod';

export type PhraseCreate = z.infer<typeof phraseCreateSchema>;

export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;

export type Phrase = typeof phrases.$inferSelect;
