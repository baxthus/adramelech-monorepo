import z from 'zod';

export const defaultGetActionSchema = z.object({
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
});

export const pageSize = 10;
