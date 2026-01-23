import z from 'zod';
import { feedbackStatusEnum } from './schema';

export const phraseCreateSchema = z.object({
  content: z.string().min(1),
  source: z.string().min(1),
});

export const feedbackStatusSchema = z.enum(feedbackStatusEnum.enumValues);
