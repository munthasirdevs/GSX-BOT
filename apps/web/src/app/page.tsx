import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  BarChart3,
  Ticket,
  CalendarClock,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Layers,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#5865F2]/20 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 glass mb-8 text-xs font-semibold text-gray-300">
          <Zap className="w-3.5 h-3.5 text-[#5865F2]" />
          <span>Full-Stack Discord Intelligence & Operations Suite</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight">
          Supercharge your Discord Server with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] via-[#7289da] to-[#57F287]">
            Real-Time Analytics & Control
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          High-throughput in-memory Redis message ingestion, automated 24-hour UTC cron reports, dynamic ticket modals with full HTML transcripts, and persistent BullMQ queue scheduling.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {session ? (
            <Link href="/dashboard">
              <Button size="lg" variant="primary" className="gap-2 shadow-xl shadow-[#5865F2]/25">
                <span>Access Management Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <Link href="/api/auth/signin">
              <Button size="lg" variant="primary" className="gap-2 shadow-xl shadow-[#5865F2]/25">
                <span>Login with Discord</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          )}

          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
          >
            <Button size="lg" variant="outline">
              Learn Architecture
            </Button>
          </a>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Engineered for High-Scale Guilds
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Zero DB locking, decoupled BullMQ distributed workers, and strict TypeScript types.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:border-[#5865F2]/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">24h In-Memory Analytics</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Intercepts incoming messages via Redis atomic increments. Never locks PostgreSQL tables on chat activity. Automated midnight UTC BullMQ worker publishes comprehensive server embeds.
            </p>
          </Card>

          <Card className="hover:border-emerald-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Interactive Support Tickets</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Discord Modals & ActionRow buttons with permission synchronization. Generates full offline HTML transcripts using discord-html-transcripts sent directly to creator DMs and audit channels.
            </p>
          </Card>

          <Card className="hover:border-amber-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Persistent Scheduled Queues</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Backed by BullMQ and Redis delayed jobs. Supports one-off announcements, recurring cron patterns, and live Discord Embed visual previews directly in the web dashboard.
            </p>
          </Card>

          <Card className="hover:border-indigo-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">OAuth2 & Permissions</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Secured with Auth.js (NextAuth v5) Discord Provider. Bitwise verification ensures only users with Administrator or Manage Guild permissions can view or configure guilds.
            </p>
          </Card>

          <Card className="hover:border-rose-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">PostgreSQL & Prisma ORM</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Type-safe relational schema maintaining GuildConfig, DailyAnalytics, Support Tickets, and ScheduledMessages with cascaded referential integrity.
            </p>
          </Card>

          <Card className="hover:border-cyan-500/50 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Production Monorepo</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Modular structure splitting packages/database, apps/bot, and apps/web. Configured with TSX, Tailwind CSS, Recharts, and Pino structured logging.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-xs text-gray-500">
        <p>Discord Hub • Engineered with Discord.js v14, Next.js 14, BullMQ & Prisma</p>
      </footer>
    </div>
  );
}
