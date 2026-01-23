import {
  Events,
  type Message,
  type Client,
  type Interaction,
} from 'discord.js';
import z from 'zod';

export const eventSchema = z.object({
  name: z.enum(Events),
  once: z.boolean().optional(),
  execute: z.function({
    input: [z.custom<Client | Interaction | Message>()],
    output: z.promise(z.void()),
  }),
});
export type Event = z.infer<typeof eventSchema>;
