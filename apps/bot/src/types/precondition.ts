import type {
  AutocompleteInteraction,
  CommandInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import z from 'zod';
import type { ComponentInteraction } from '~/events/interactionCreate';

export const preconditionSchema = z.function({
  input: [
    z.custom<
      | CommandInteraction
      | ComponentInteraction
      | ModalSubmitInteraction
      | AutocompleteInteraction
    >(),
  ],
  output: z.promise(z.void()),
});
export type Precondition = z.infer<typeof preconditionSchema>;
