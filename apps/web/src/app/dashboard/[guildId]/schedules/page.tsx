import { prisma } from "@discord-hub/database";
import { getGuildChannels } from "@/lib/discord";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScheduleModal } from "@/components/ScheduleModal";
import { formatDate } from "@/lib/utils";
import { deleteScheduleAction, toggleScheduleAction } from "@/app/actions/scheduleActions";
import { CalendarClock, Trash2, Power, MessageSquare } from "lucide-react";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  const [schedules, channels] = await Promise.all([
    prisma.scheduledMessage.findMany({
      where: { guildId },
      orderBy: { executeAt: "desc" },
    }),
    getGuildChannels(guildId),
  ]);

  // Filter only text-based channels (type 0: GuildText, type 5: GuildAnnouncement)
  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);

  const channelMap = new Map(channels.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Scheduled Announcements</h1>
          <p className="text-sm text-gray-400 mt-1">
            Automated recurring announcements and delayed message broadcasts
          </p>
        </div>

        <ScheduleModal guildId={guildId} channels={textChannels} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue Manifest</CardTitle>
          <CardDescription>All scheduled jobs registered in BullMQ for this guild</CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          {schedules.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              <CalendarClock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p>No scheduled messages found. Click "New Schedule" to draft an announcement.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-white/5 text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 rounded-l-lg">Channel</th>
                  <th scope="col" className="px-4 py-3">Content / Title</th>
                  <th scope="col" className="px-4 py-3">Schedule Type</th>
                  <th scope="col" className="px-4 py-3">Next Execution</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {schedules.map((s) => {
                  const channelName = channelMap.get(s.channelId) || s.channelId;

                  return (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-white">
                        #{channelName}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        {s.title && <p className="font-semibold text-white truncate">{s.title}</p>}
                        <p className="text-xs text-gray-400 truncate">{s.content}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {s.isRecurring ? (
                          <Badge variant="info">Cron: {s.cronExpression}</Badge>
                        ) : (
                          <Badge variant="neutral">One-Time</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {formatDate(s.executeAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        {s.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Inactive / Sent</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form
                            action={async () => {
                              "use server";
                              await toggleScheduleAction(guildId, s.id, s.isActive);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className={s.isActive ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"}
                              title={s.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                          </form>

                          <form
                            action={async () => {
                              "use server";
                              await deleteScheduleAction(guildId, s.id);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-400 hover:text-rose-300"
                              title="Delete Schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
