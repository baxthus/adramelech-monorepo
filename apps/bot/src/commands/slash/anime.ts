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
  type CommandInfer,
} from '~/types/command';
import StringBuilder from '~/tools/StringBuilder';
import { type } from 'arktype';
import { capitalize } from '@repo/utils/text';
import { ExpectedError } from '~/types/errors';
import { env } from '@repo/env/bot';

const AnimeImageRatings = [
  'safe',
  'suggestive',
  'borderline',
  'explicit',
] as const;
const AnimeImageAgeRating = type
  .enumerated(...AnimeImageRatings)
  .or('null')
  .pipe((v) => v || 'safe');

const AnimeImages = type({
  url: 'string.url',
  source_url: 'string.url | null',
})
  .array()
  .exactlyLength(1);

const NekoImage = type({
  url: 'string.url',
});

export const command = <CommandInfer>{
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
                  AnimeImageRatings.map((rating) => ({
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

  const rating = AnimeImageAgeRating(intr.options.getString('rating'));
  if (rating instanceof type.errors) throw new ExpectedError('Invalid rating');

  if (
    !(intr.channel as TextChannel).nsfw &&
    ['borderline', 'explicit'].includes(rating)
  )
    throw new ExpectedError('This command can only be used in NSFW channels');

  const data = await ky
    .get('https://api.nekosapi.com/v4/images/random', {
      searchParams: {
        rating,
        limit: 1,
      },
      headers: {
        'User-Agent': env.USER_AGENT,
      },
    })
    .json()
    .then(AnimeImages.assert);

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
    .then(NekoImage.assert);

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
