import { customIdSchema } from './customId';
import { ComponentType, type MessageComponentInteraction } from 'discord.js';
import { preconditionSchema } from './precondition';
import z from 'zod';

export const componentSchema = z.object({
  customId: customIdSchema,
  type: z.enum(ComponentType),
  cooldown: z.union([z.number(), z.boolean()]).optional(),
  preconditions: preconditionSchema.array().optional(),
  execute: z.function({
    input: [z.custom<MessageComponentInteraction>()],
    output: z.promise(z.void()),
  }),
});
export type Component = z.infer<typeof componentSchema>;
