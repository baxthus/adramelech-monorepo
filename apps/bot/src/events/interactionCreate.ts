import {
  type AutocompleteInteraction,
  Events,
  InteractionType,
  type ModalSubmitInteraction,
  type PrimaryEntryPointCommandInteraction,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type MessageContextMenuCommandInteraction,
  type UserContextMenuCommandInteraction,
} from 'discord.js';
import logger from '~/logger';
import { sendError } from '~/utils/sendError';
import type { CustomClient } from '..';
import type { CommandInfer } from '~/types/command';
import type { ComponentInfer } from '~/types/component';
import type { ModalInfer } from '~/types/modal';
import type { EventInfer } from '~/types/event';
import redis from '@repo/redis';
import { formatDistanceToNow } from 'date-fns';
import { ExpectedError } from '~/types/errors';
import {
  trackCommand,
  trackComponent,
  trackModal,
} from '@repo/redis/telemetry';
import { fireAndForget } from '@repo/utils/async';
import { Result } from 'better-result';
import { env } from '@repo/env/bot';

export type CommandInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction
  | PrimaryEntryPointCommandInteraction; // Don't know what this is
export type ComponentInteraction = AnySelectMenuInteraction | ButtonInteraction;

export const event = <EventInfer>{
  name: Events.InteractionCreate,
  async execute(intr: Interaction) {
    const client = intr.client as CustomClient;

    switch (intr.type) {
      case InteractionType.ApplicationCommand:
        await handleCommands(intr, client);
        break;
      case InteractionType.MessageComponent:
        await handleComponents(intr, client);
        break;
      case InteractionType.ModalSubmit:
        await handleModals(intr, client);
        break;
      case InteractionType.ApplicationCommandAutocomplete:
        await handleAutocomplete(intr, client);
        break;
      default:
        await sendError(intr, 'Unknown interaction type');
        break;
    }
  },
};

async function handleCommands(intr: CommandInteraction, client: CustomClient) {
  const command = client.commands.get(intr.commandName);
  if (!command) {
    await sendError(intr, 'Command not found');
    return;
  }

  if (await isOnCooldown(intr, command, intr.commandName)) return;
  if (!(await handlePreconditions(intr, command))) return;

  const commandType = command.data.toJSON().type;
  if (intr.commandType !== commandType) {
    await handleTypeMismatch(
      'command',
      intr.commandName,
      intr.commandType,
      commandType,
      intr,
    );
    return;
  }

  const success = await executeInteraction(
    'command',
    intr.commandName,
    () => command.execute(intr),
    intr,
  );
  fireAndForget(() =>
    trackCommand(intr.commandName, intr.guildId || undefined, success),
  );
}

async function handleComponents(
  intr: ComponentInteraction,
  client: CustomClient,
) {
  const component = client.components.get(intr.customId);
  if (!component) {
    await sendError(intr, 'Component not found');
    return;
  }

  if (await isOnCooldown(intr, component, intr.customId)) return;
  if (!(await handlePreconditions(intr, component))) return;

  if (intr.componentType !== component.type) {
    await handleTypeMismatch(
      'component',
      intr.customId,
      intr.componentType,
      component.type,
      intr,
    );
    return;
  }

  const success = await executeInteraction(
    'component',
    intr.customId,
    () => component.execute(intr),
    intr,
  );
  fireAndForget(() =>
    trackComponent(intr.customId, intr.guildId || undefined, success),
  );
}

async function handleModals(
  intr: ModalSubmitInteraction,
  client: CustomClient,
) {
  const modal = client.modals.get(intr.customId);
  if (!modal) {
    await sendError(intr, 'Modal not found');
    return;
  }

  if (await isOnCooldown(intr, modal, intr.customId)) return;
  if (!(await handlePreconditions(intr, modal))) return;

  if (intr.type !== InteractionType.ModalSubmit) {
    await handleTypeMismatch(
      'modal',
      intr.customId,
      intr.type,
      InteractionType.ModalSubmit,
      intr,
    );
    return;
  }

  const success = await executeInteraction(
    'modal',
    intr.customId,
    () => modal.execute(intr),
    intr,
  );
  fireAndForget(() =>
    trackModal(intr.customId, intr.guildId || undefined, success),
  );
}

async function handleAutocomplete(
  intr: AutocompleteInteraction,
  client: CustomClient,
) {
  const command = client.commands.get(intr.commandName);
  if (!command || !command.autocomplete) return;

  // Don't use cooldowns for autocomplete interactions
  if (!(await handlePreconditions(intr, command))) return; // May not be necessary

  // No need to check for command type, as only chat input commands can have autocomplete interactions

  await executeInteraction(
    'autocomplete',
    intr.commandName,
    () => command.autocomplete!(intr),
    intr,
  );
}

async function handlePreconditions(
  intr:
    | CommandInteraction
    | ComponentInteraction
    | ModalSubmitInteraction
    | AutocompleteInteraction,
  item: CommandInfer | ComponentInfer | ModalInfer,
): Promise<boolean> {
  const identification =
    'commandName' in intr ? intr.commandName : intr.customId;
  let failed = false;

  if (item.preconditions) {
    for (const precondition of item.preconditions) {
      const result = await Result.tryPromise(() => precondition(intr));
      if (Result.isError(result)) {
        await handleError('precondition', identification, result.error, intr);
        failed = true;
      }
    }
  }

  return !failed;
}

async function isOnCooldown(
  intr: Interaction,
  item: CommandInfer | ComponentInfer | ModalInfer,
  name: string,
): Promise<boolean> {
  if (!item.cooldown || Bun.env.NODE_ENV === 'development') return false;

  const cooldown = await redis.get(`cooldown:${name}:${intr.user.id}`);
  if (cooldown) {
    const remainingTime = formatDistanceToNow(parseInt(cooldown), {
      addSuffix: true,
    });
    await sendError(intr, `You're on cooldown. Try again ${remainingTime}`);
    return true;
  }

  const cooldownSeconds =
    typeof item.cooldown === 'boolean'
      ? env.DEFAULT_COOLDOWN_SECONDS
      : item.cooldown;

  const expiration = Date.now() + cooldownSeconds * 1000;
  await redis.setex(
    `cooldown:${name}:${intr.user.id}`,
    cooldownSeconds,
    expiration.toString(),
  );

  return false;
}

async function handleTypeMismatch(
  interactionType: string,
  name: unknown,
  actualType: unknown,
  expectedType: unknown,
  intr: Interaction,
) {
  await sendError(intr, `${interactionType} type mismatch`);
  logger.error(`Error executing ${interactionType} ${name}`);
  logger.error(
    `󱞩 ${interactionType} type mismatch: ${actualType} !== ${expectedType}`,
  );
}

async function executeInteraction(
  interactionType: string,
  name: string,
  fn: () => Promise<void>,
  intr: Interaction,
): Promise<boolean> {
  const result = await Result.tryPromise(() => fn());
  if (Result.isOk(result)) return true;

  await handleError(interactionType, name, result.error, intr);
  return false;
}

async function handleError(
  interactionType: string,
  name: string,
  error: Error,
  intr: Interaction,
) {
  const isExpected = error instanceof ExpectedError;
  // Don't send detailed error messages for unexpected errors
  await sendError(intr, isExpected ? error.message : undefined);
  // Don't log expected errors, because... well... they're expected
  if (!isExpected) {
    logger.error(`Error executing ${interactionType} ${name}`);
    logger.error(error);
  }
}
