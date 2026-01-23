import {
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import ky from 'ky';
import {
  executeCommandFromTree,
  type CommandGroupExecutors,
  type Command,
} from '~/types/command';
import StringBuilder from '~/tools/StringBuilder';
import { capitalize } from '@repo/utils/text';
import { ExpectedError } from '~/types/errors';
import { env } from '@repo/env/bot';
import z from 'zod';

const animeImageRatingsEnum = z.enum([
  'safe',
  'suggestive',
  'borderline',
  'explicit',
]);
const animeImageAgeRatingSchema = animeImageRatingsEnum
  .or(z.null())
  .transform((v) => v ?? 'safe');

const animeImagesSchema = z
  .object({
    url: z.url(),
    source_url: z.url().nullable(),
  })
  .array()
  .length(1);

const nekoImageSchema = z.object({
  url: z.url(),
});

export const command = <Command>{
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Anime related commands')
    .addSubcommandGroup((group) =>
      group
        .setName('media')
        .setDescription('Anime media commands')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('image')
            .setDescription('Get a random anime image')
            .addStringOption((option) =>
              option
                .setName('rating')
                .setDescription('The rating of the image')
                .setChoices(
                  animeImageRatingsEnum.options.map((rating) => ({
                    name: capitalize(rating),
                    value: rating,
                  })),
                ),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('neko').setDescription('Get a random neko image'),
        ),
    ),
  cooldown: true,
  uses: ['nekosapi.com', 'nekos.life'],
  execute: async (intr: ChatInputCommandInteraction) =>
    executeCommandFromTree(executors, intr),
};

const executors: CommandGroupExecutors = {
  media: {
    image: animeImage,
    neko: nekoImage,
  },
};

async function animeImage(intr: ChatInputCommandInteraction) {
  await intr.deferReply();

  const rating = animeImageAgeRatingSchema.safeParse(
    intr.options.getString('rating'),
  );
  if (!rating.success) throw new ExpectedError('Invalid rating');

  if (
    !(intr.channel as TextChannel).nsfw &&
    ['borderline', 'explicit'].includes(rating.data)
  )
    throw new ExpectedError('This command can only be used in NSFW channels');

  const data = await ky
    .get('https://api.nekosapi.com/v4/images/random', {
      searchParams: {
        rating: rating.data,
        limit: 1,
      },
      headers: {
        'User-Agent': env.USER_AGENT,
      },
    })
    .json()
    .then(animeImagesSchema.parse);

  const footer = new StringBuilder();
  if (data[0]?.source_url) footer.appendLine(`> Source: ${data[0].source_url}`);
  footer.append(`> Powered by NekosAPI`);

  await intr.followUp({
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.MediaGallery,
            items: [
              {
                media: {
                  url: data[0]!.url,
                },
              },
            ],
          },
          {
            type: ComponentType.TextDisplay,
            content: footer.toString(),
          },
        ],
      },
    ],
  });
}

async function nekoImage(intr: ChatInputCommandInteraction) {
  await intr.deferReply();

  const data = await ky
    .get('https://nekos.life/api/v2/img/neko')
    .json()
    .then(nekoImageSchema.parse);

  await intr.followUp({
    flags: MessageFlags.IsComponentsV2,
    components: [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.MediaGallery,
            items: [
              {
                media: {
                  url: data.url,
                },
              },
            ],
          },
          {
            type: ComponentType.TextDisplay,
            content: '> Powered by nekos.life',
          },
        ],
      },
    ],
  });
}
