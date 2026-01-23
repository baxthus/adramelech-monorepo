import {
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type CommandInteraction,
} from 'discord.js';
import { preconditionSchema } from './precondition';
import z from 'zod';

export const commandSchema = z.object({
  data: z.union([
    z.instanceof(SlashCommandBuilder),
    z.instanceof(ContextMenuCommandBuilder),
  ]),
  uses: z.array(z.string()).optional(),
  cooldown: z.union([z.number(), z.boolean()]).optional(),
  preconditions: preconditionSchema.array().optional(),
  execute: z.function({
    input: [z.custom<CommandInteraction>()],
    output: z.promise(z.void()),
  }),
  autocomplete: z
    .function({
      input: [z.custom<AutocompleteInteraction>()],
      output: z.promise(z.void()),
    })
    .optional(),
});
export type Command = z.infer<typeof commandSchema>;

export type SubcommandExecutor = (
  intr: ChatInputCommandInteraction,
) => Promise<void>;
export type CommandExecutors = {
  [subcommand: string]: SubcommandExecutor;
};
export type CommandGroupExecutors = {
  [key: string]: SubcommandExecutor | CommandExecutors;
};

export async function executeCommandFromTree(
  tree: CommandGroupExecutors,
  intr: ChatInputCommandInteraction,
) {
  const groupName = intr.options.getSubcommandGroup(false);
  const subcommandName = intr.options.getSubcommand();

  let executor: SubcommandExecutor | undefined;

  if (groupName) {
    const group = tree[groupName];
    if (group && typeof group === 'object' && !Array.isArray(group))
      executor = group[subcommandName];
  } else {
    const directExecutor = tree[subcommandName];
    if (typeof directExecutor === 'function') executor = directExecutor;
  }

  if (executor) await executor(intr);
  else throw new Error('Unknown subcommand');
}
