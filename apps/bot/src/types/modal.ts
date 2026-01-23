import { customIdSchema } from './customId';
import { preconditionSchema } from './precondition';
import type { ModalSubmitInteraction } from 'discord.js';
import z from 'zod';

export const modalSchema = z.object({
  customId: customIdSchema,
  cooldown: z.union([z.number(), z.boolean()]).optional(),
  preconditions: preconditionSchema.array().optional(),
  execute: z.function({
    input: [z.custom<ModalSubmitInteraction>()],
    output: z.promise(z.void()),
  }),
});
export type Modal = z.infer<typeof modalSchema>;
