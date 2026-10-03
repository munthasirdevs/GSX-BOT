# Discord Hub: Full-Stack Discord Intelligence & Operations Suite

A production-grade, monorepo-structured Discord application and companion Next.js web dashboard featuring **24-hour in-memory Redis message analytics**, **dynamic ticket modals with HTML transcripts**, **persistent BullMQ scheduled announcements**, and a **Next.js 14 App Router dashboard** with Discord OAuth2 authentication.

---

## 🌟 Core Architecture & Subsystems

### 1. 24-Hour Message Tracking & Daily Analytics (Zero DB Locking)
- **High-Throughput Redis Counters:** Real-time messages are intercepted in `messageCreate` and recorded into in-memory Redis hashes (`activity:<guildId>:<date>:users`, `types`, `channels`) with a 48h TTL. No direct PostgreSQL writes occur during message activity, eliminating database lock contention.
- **24-Hour Automated Cron Cycle:** BullMQ repeatable job fires daily at midnight UTC (`0 0 * * *`). It aggregates Top 10 most active members and bots, compiles channel statistics, persists summary records to the PostgreSQL `DailyAnalytics` table, and dispatches a rich Discord Embed to the configured `reportChannelId`.
- **Manual Generation:** Administrators can also run `/report generate [today | yesterday]` for immediate on-demand report generation.

### 2. Dynamic Support Ticket System (Buttons & Modals)
- **Interactive Initiation:** `/ticket setup` deploys a persistent panel with a "Create Ticket" button (`ticket_create`).
- **Discord Modals:** Clicking the button triggers a modal dialog (`modal_ticket_create`) asking for the inquiry reason.
- **Permission Management:** Dynamically creates private text channels (`ticket-0001`) with channel permission overwrites for `@everyone` (hidden), ticket creator (view + send), bot client, and support staff role.
- **HTML Transcripts:** When closed via the "Close Ticket" button, `discord-html-transcripts` compiles a standalone HTML archive of all channel messages, updates PostgreSQL `Ticket` state to `CLOSED`, posts the transcript to the audit channel, DMs the user with their transcript, and deletes the channel after a 5-second countdown.

### 3. Persistent Scheduled Announcements
- **Delayed Queue Dispatch:** Backed by Redis and BullMQ. Messages can be scheduled via slash command (`/schedule create`) or directly from the Web Dashboard.
- **Recurring Cron Support:** Supports standard 5-part cron syntax (e.g., `0 12 * * *` for daily noon) parsed via `cron-parser`. The BullMQ worker recalculates the next execution timestamp and automatically re-queues.
- **Live Discord Embed Preview:** The Web Dashboard includes a real-time dark-theme Discord embed preview component simulating exactly how announcements render in Discord.

### 4. Next.js Web Dashboard
- **Authentication:** Auth.js (NextAuth v5) Discord Provider (`identify`, `guilds` scopes).
- **Authorization:** Bitwise check ensures users hold `ADMINISTRATOR (0x8)` or `MANAGE_GUILD (0x20)` permissions before allowing server management.
- **Interactive Visuals:** Recharts area charts for 7-day and 30-day message trends, donut charts for human vs. bot composition, and member activity leaderboards.
- **Audit & Settings:** Comprehensive controls for setting report channels, ticket categories, transcript audit channels, and support roles.

---

## 📁 Monorepo Layout

```
discord-hub/
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── packages/
│   └── database/
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── client.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── apps/
│   ├── bot/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── setup.ts
│   │   │   │   │   └── report.ts
│   │   │   │   ├── tickets/
│   │   │   │   │   └── ticket.ts
│   │   │   │   └── schedule/
│   │   │   │       └── schedule.ts
│   │   │   ├── events/
│   │   │   │   ├── interactionCreate.ts
│   │   │   │   ├── messageCreate.ts
│   │   │   │   └── ready.ts
│   │   │   ├── queues/
│   │   │   │   ├── connection.ts
│   │   │   │   ├── analyticsWorker.ts
│   │   │   │   └── scheduleWorker.ts
│   │   │   ├── services/
│   │   │   │   ├── activityTracker.ts
│   │   │   │   ├── ticketManager.ts
│   │   │   │   └── schedulerManager.ts
│   │   │   ├── utils/
│   │   │   │   └── logger.ts
│   │   │   ├── index.ts
│   │   │   └── deploy-commands.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/
│       │   │   │   └── auth/[...nextauth]/route.ts
│       │   │   ├── dashboard/
│       │   │   │   ├── [guildId]/
│       │   │   │   │   ├── analytics/page.tsx
│       │   │   │   │   ├── tickets/page.tsx
│       │   │   │   │   ├── schedules/page.tsx
│       │   │   │   │   ├── settings/page.tsx
│       │   │   │   │   └── layout.tsx
│       │   │   │   ├── layout.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   │   ├── Button.tsx
│       │   │   │   ├── Card.tsx
│       │   │   │   ├── Badge.tsx
│       │   │   │   ├── Navbar.tsx
│       │   │   │   └── Sidebar.tsx
│       │   │   ├── AnalyticsCharts.tsx
│       │   │   ├── TicketList.tsx
│       │   │   ├── ScheduleModal.tsx
│       │   │   ├── DiscordEmbedPreview.tsx
│       │   │   └── SessionProvider.tsx
│       │   ├── lib/
│       │   │   ├── auth.ts
│       │   │   ├── discord.ts
│       │   │   └── utils.ts
│       │   └── styles/
│       │       └── globals.css
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── next.config.js
│       ├── tsconfig.json
│       └── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20+ LTS
- **PostgreSQL**: v14+ (Local or cloud provider like Supabase/Neon)
- **Redis**: v6+ (Local or Upstash)
- **Discord Bot Application**: From [Discord Developer Portal](https://discord.com/developers/applications)
  - Required Privileged Gateway Intents: **Server Members Intent**, **Message Content Intent**.
  - OAuth2 Redirect URI: `http://localhost:3000/api/auth/callback/discord`

### 2. Environment Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Fill in your credentials:
```env
# Discord Bot
DISCORD_TOKEN="YOUR_BOT_TOKEN"
DISCORD_CLIENT_ID="YOUR_APPLICATION_CLIENT_ID"
DISCORD_CLIENT_SECRET="YOUR_CLIENT_SECRET"
DISCORD_DEV_GUILD_ID="OPTIONAL_GUILD_ID_FOR_INSTANT_SLASH_COMMANDS"

# Web Dashboard & NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super-secret-random-32-chars-key"
AUTH_SECRET="super-secret-random-32-chars-key"

# Database & Cache
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/discord_bot_db?schema=public"
REDIS_URL="redis://localhost:6379"

# Webhooks / Public URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Installation
Install all dependencies across the monorepo workspace:
```bash
npm install
# or if using pnpm:
pnpm install
```

### 4. Database Setup
Push the Prisma schema to your PostgreSQL database:
```bash
npm run db:push
# and generate Prisma client:
npm run db:generate
```

### 5. Deploy Slash Commands
Register the application slash commands (`/setup`, `/report`, `/ticket`, `/schedule`):
```bash
npm run deploy:commands
```

### 6. Run the Application
Start the Discord Bot Gateway & BullMQ Workers:
```bash
npm run dev:bot
```

In another terminal, start the Next.js Web Dashboard:
```bash
npm run dev:web
```

Visit [http://localhost:3000](http://localhost:3000) to log in with Discord and manage your servers!
