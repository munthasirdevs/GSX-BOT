import Link from "next/link";
import { prisma } from "@discord-hub/database";
import { getGuildChannels } from "@/lib/discord";
import { TicketList } from "@/components/TicketList";
import { TicketPanelDeployModal } from "@/components/TicketPanelDeployModal";
import { Button } from "@/components/ui/Button";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  const [rawTickets, config, rawChannels] = await Promise.all([
    prisma.ticket.findMany({
      where: { guildId },
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
    prisma.guildConfig.findUnique({
      where: { id: guildId },
    }).catch(() => null),
    getGuildChannels(guildId),
  ]);

  const tickets = Array.isArray(rawTickets) ? rawTickets : [];
  const channels = Array.isArray(rawChannels) ? rawChannels : [];
  const textChannels = channels.filter((c) => c && (c.type === 0 || c.type === 5));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage inquiries, view active channels, and review historical customer transcripts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TicketPanelDeployModal guildId={guildId} channels={textChannels} />

          <Link href={`/dashboard/${guildId}/settings`}>
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span>Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {!config?.ticketCategoryId && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          ⚠️ <strong>Ticket Category Not Configured:</strong> New tickets will be created without a parent category. Head to{" "}
          <Link href={`/dashboard/${guildId}/settings`} className="underline font-semibold">
            Settings
          </Link>{" "}
          or use <code>/setup</code> to assign a ticket category and audit channel.
        </div>
      )}

      <TicketList tickets={tickets} guildId={guildId} />
    </div>
  );
}
