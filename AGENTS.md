# AGENTS.md

## Commands
- **Dev**: `turbo dev` (runs all apps) or `turbo dev --filter=@repo/bot` / `turbo dev --filter=@repo/dashboard`
- **Build**: `turbo build`
- **Lint**: `turbo lint`
- **Format**: `turbo format`
- **Type Check**: `turbo type-check`
- **Database**: `turbo db:push`, `turbo db:studio`
- **Infrastructure**: `podman-compose up -d`, `podman-compose down`

## Project Structure
```
apps/
  bot/           # Discord bot (@repo/bot)
  dashboard/     # Next.js dashboard (@repo/dashboard)
packages/
  database/      # Drizzle ORM (@repo/database)
  redis/         # Redis client (@repo/redis)
  utils/         # Shared utilities (@repo/utils)
  eslint-config/ # Shared ESLint config (@repo/eslint-config)
  config/ # Shared TypeScript config (@repo/config)
```

## Code Style
- **Formatting**: 2 spaces, semicolons, single quotes, trailing commas, 80 char width
- **Type imports**: Use inline style: `import { type Foo } from 'bar'` (enforced by ESLint)
- **Path aliases**: Bot uses `~/` for src/, Dashboard uses `@/` for src/
- **Naming**: camelCase files, PascalCase components/types, camelCase functions

## Patterns
- **Error handling**: Throw `ExpectedError` for expected user-facing errors, `Error` for unexpected issues (e.g., database failures). The event handler catches and distinguishes between error types. Arktype for validation
- **Bot exports**: `export const command = <Command>{...}`, same for `event`, `component`
- **Dashboard**: Server Actions with `'use server'`, `cn()` for class merging
- **Database**: Drizzle ORM with NanoID keys, schema in `packages/database/src/schema.ts`, Arktype validations in `packages/database/src/validations.ts`
- **Redis**: Bun's native `RedisClient`, import via `import redis from '@repo/redis'`, utils via `import { fn } from '@repo/redis/utils'`
- **Utils**: Shared utilities, import via `import { fn } from '@repo/utils/module'`

## Redis Telemetry Schema
Telemetry uses separate `telemetryRedis` client (fire-and-forget with `maxRetries: 0`). Keys use format `prefix:identifier:date` with TTLs.

**Message Tracking:**
- `messages:guild:{guildId}:{YYYY-MM-DD}` - Counter, 30d TTL
- `messages:user:{userId}:{YYYY-MM-DD}` - Counter, 30d TTL
- `activity:hourly:{guildId}:{YYYY-MM-DD}` - Hash (hour => count), 30d TTL
- `leaderboard:messages:{guildId}:{YYYY-Wxx}` - Sorted set (userId, score), 8d TTL
- `users:active:{guildId}:{YYYY-MM-DD}` - Set of userIds, 30d TTL

**Command Tracking:**
- `commands:{name}:{YYYY-MM-DD}` - Counter, 30d TTL
- `commands:total:{guildId}:{YYYY-MM-DD}` - Counter, 30d TTL
- `commands:success:{YYYY-MM-DD}` - Global counter, no TTL
- `commands:failure:{YYYY-MM-DD}` - Global counter, no TTL

**Component Tracking:**
- `components:{id}:{YYYY-MM-DD}` - Counter, 30d TTL
- `components:total:{guildId}:{YYYY-MM-DD}` - Counter, 30d TTL
- `components:success:{YYYY-MM-DD}` - Global counter, no TTL
- `components:failure:{YYYY-MM-DD}` - Global counter, no TTL

**Modal Tracking:**
- `modals:{id}:{YYYY-MM-DD}` - Counter, 30d TTL
- `modals:total:{guildId}:{YYYY-MM-DD}` - Counter, 30d TTL
- `modals:success:{YYYY-MM-DD}` - Global counter, no TTL
- `modals:failure:{YYYY-MM-DD}` - Global counter, no TTL

Note: `guildId` defaults to `'dm'` for direct messages. Success/failure keys are global (no guild scoping).

## Tech Stack
Bun runtime, TypeScript strict mode, discord.js (bot), Next.js 16 + React 19 (dashboard), Drizzle ORM + PostgreSQL, Redis (Bun native client), Turborepo for monorepo management
