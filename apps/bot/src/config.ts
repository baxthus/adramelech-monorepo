// import { type } from 'arktype';
// import { ActivityType } from 'discord.js';
// import kleur from 'kleur';
// import logger from '~/logger';

// const Config = type({
//   BOT_TOKEN: 'string > 0',
//   BOT_ID: 'string > 0',
//   PRESENCE_TYPE: type('string.numeric.parse').to(type.valueOf(ActivityType)),
//   PRESENCE_NAME: 'string > 0',
//   EMBED_COLOR: 'string.numeric.parse',
//   AUTHOR_URL: 'string.url = "https://www.pudim.com.br"',
//   REPOSITORY_URL: 'string.url',
//   DEFAULT_COOLDOWN_SECONDS: 'string.numeric.parse |> number.integer > 0',
//   USER_AGENT: 'string = "adramelech"',
//   OPENWEATHER_KEY: 'string?',
// });

// function validateConfig() {
//   const out = Config(Bun.env);
//   if (out instanceof type.errors) {
//     const u = kleur.underline;
//     for (const error of out) {
//       logger.error(`ENV VAR  ${u(error.path.toString())} ${error.problem}`);
//     }
//     process.exit(1);
//   }
//   logger.success('Environment variables loaded');

//   return out;
// }

// const env = validateConfig();

// export default env;
