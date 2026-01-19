import {
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type APIComponentInMessageActionRow,
  type ChatInputCommandInteraction,
} from 'discord.js';
import ky from 'ky';
import v from 'voca';
import {
  executeCommandFromTree,
  type CommandExecutors,
  type CommandInfer,
} from '~/types/command';
import { stripIndents } from 'common-tags';
import { type, type Type } from 'arktype';
import { env } from '@repo/env/bot';

const BASE_URL = 'https://api.github.com';

const Repository = type({
  id: 'number',
  name: 'string',
  html_url: 'string.url',
  description: 'string | null',
  fork: 'boolean',
  language: 'string | null',
  stargazers_count: 'number',
  watchers_count: 'number',
  forks_count: 'number',
  owner: {
    id: 'number',
    login: 'string',
    type: 'string',
    avatar_url: 'string.url',
  },
  license: type({
    key: 'string',
  }).or('null'),
});

const License = type({
  name: 'string.capitalize',
  html_url: 'string.url',
  permissions: 'string[]',
  conditions: 'string[]',
  limitations: 'string[]',
});

const User = type({
  id: 'number',
  login: 'string',
  type: 'string',
  name: 'string | null',
  company: 'string | null',
  blog: 'string | null',
  location: 'string | null',
  bio: 'string | null',
  public_repos: 'number',
  public_gists: 'number',
  followers: 'number',
  following: 'number',
  avatar_url: 'string.url',
  html_url: 'string.url',
});

const Socials = type({
  provider: 'string.capitalize',
  url: 'string.url',
}).array();

export const command = <CommandInfer>{
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Get GitHub information')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('repo')
        .setDescription('Get information about a repository')
        .addStringOption((option) =>
          option
            .setName('user')
            .setDescription('The user or organization name')
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('repo')
            .setDescription('The repository name')
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('user')
        .setDescription('Get information about a user')
        .addStringOption((option) =>
          option
            .setName('user')
            .setDescription('The user name')
            .setRequired(true),
        ),
    ),
  uses: ['GitHub API'],
  cooldown: true,
  async execute(intr: ChatInputCommandInteraction) {
    await intr.deferReply();

    await executeCommandFromTree(executors, intr);
  },
};

const executors: CommandExecutors = {
  repo,
  user,
};

async function repo(intr: ChatInputCommandInteraction) {
  const user = intr.options.getString('user', true);
  const repo = intr.options.getString('repo', true);

  const data = await fetchGitHubData(`/repos/${user}/${repo}`, Repository);

  const container = new ContainerBuilder({
    accent_color: env.EMBED_COLOR,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: '# Repository information',
      },
      {
        type: ComponentType.TextDisplay,
        content: stripIndents`
        **Name:** ${data.name}
        **ID:** ${data.id}
        **Description:** \`${data.description || 'None'}\`
        **Fork:** ${data.fork ? 'Yes' : 'No'}
        **Main Language:** ${data.language}
        **Stars:** ${data.stargazers_count}
        **Watchers:** ${data.watchers_count}
        **Forks:** ${data.forks_count}
        `,
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: 'Repository',
            url: data.html_url,
          },
        ],
      },
      { type: ComponentType.Separator },
      {
        type: ComponentType.Section,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            ## Owner
            **Username:** \`${data.owner.login}\`
            **ID:** ${data.owner.id}
            **Type:** ${data.owner.type}
            `,
          },
        ],
        accessory: {
          type: ComponentType.Thumbnail,
          media: {
            url: data.owner.avatar_url,
          },
        },
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: 'GitHub Profile',
            url: `https://github.com/${data.owner.login}`,
          },
        ],
      },
    ],
  });

  if (data.license) {
    const licenseData = await getLicenseInfo(data.license.key);
    container.addSeparatorComponents({ type: ComponentType.Separator });
    container.addTextDisplayComponents({
      type: ComponentType.TextDisplay,
      content: `## License\n${licenseData.content}`,
    });

    if (licenseData.html_url) {
      container.addActionRowComponents({
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: 'License Page',
            url: licenseData.html_url,
          },
        ],
      });
    }
  }

  container.addTextDisplayComponents({
    type: ComponentType.TextDisplay,
    content: '> Powered by GitHub API',
  });

  await intr.followUp({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function user(intr: ChatInputCommandInteraction) {
  const username = intr.options.getString('user', true);

  const [user, socials] = await Promise.all([
    fetchGitHubData(`/users/${username}`, User),
    fetchGitHubData(`/users/${username}/social_accounts`, Socials),
  ]);

  const userActionRow: APIComponentInMessageActionRow[] = [
    {
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      label: 'GitHub Profile',
      url: user.html_url,
    },
  ];
  if (user.blog && !v.isEmpty(user.blog)) {
    const url = user.blog.startsWith('http')
      ? user.blog
      : `http://${user.blog}`;
    userActionRow.push({
      type: ComponentType.Button,
      style: ButtonStyle.Link,
      label: 'Website',
      url,
    });
  }

  const container = new ContainerBuilder({
    accent_color: env.EMBED_COLOR,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: '# User information',
      },
      {
        type: ComponentType.Section,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: stripIndents`
            **Username:** \`${user.login}\`
            **ID:** ${user.id}
            **Type:** ${user.type}
            **Name:** \`${user.name || 'None'}\`
            **Company:** \`${user.company || 'None'}\`
            **Website:** \`${user.blog || 'None'}\`
            **Location:** \`${user.location || 'None'}\`
            **Bio:** \`${user.bio || 'None'}\`
            `,
          },
        ],
        accessory: {
          type: ComponentType.Thumbnail,
          media: {
            url: user.avatar_url,
          },
        },
      },
      {
        type: ComponentType.ActionRow,
        components: userActionRow,
      },
    ],
  });

  if (socials.length > 0) {
    container.addActionRowComponents({
      type: ComponentType.ActionRow,
      components: socials
        .slice(0, 5) // Limit to 5 buttons
        .map((social) => ({
          type: ComponentType.Button,
          style: ButtonStyle.Link,
          label: social.provider === 'Generic' ? 'Social' : social.provider,
          url: social.url,
        })),
    });
  }

  container.addSeparatorComponents({ type: ComponentType.Separator });
  container.addTextDisplayComponents({
    type: ComponentType.TextDisplay,
    content: stripIndents`
    ## Stats
    **Public Repos:** ${user.public_repos}
    **Public Gists:** ${user.public_gists}
    **Followers:** ${user.followers}
    **Following:** ${user.following}
    `,
  });
  container.addTextDisplayComponents({
    type: ComponentType.TextDisplay,
    content: '> Powered by GitHub API',
  });

  await intr.followUp({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

const fetchGitHubData = <T extends Type>(
  endpoint: string,
  schema: T,
): Promise<T['infer']> =>
  ky
    .get(BASE_URL + endpoint, {
      headers: { 'User-Agent': env.USER_AGENT },
    })
    .json()
    .then(schema.assert);

async function getLicenseInfo(key: string): Promise<{
  content: string;
  html_url: string;
}> {
  if (key === 'other') return { content: 'Other', html_url: '' };
  return fetchGitHubData(`/licenses/${key}`, License).then((result) => ({
    content: stripIndents`
      **Name:** ${result.name}
      **Permissions:** ${result.permissions.join(', ')}
      **Conditions:** ${result.conditions.join(', ')}
      **Limitations:** ${result.limitations.join(', ')}
      `,
    html_url: result.html_url,
  }));
}
