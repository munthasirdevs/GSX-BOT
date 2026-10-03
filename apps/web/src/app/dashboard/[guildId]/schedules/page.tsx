import { prisma } from "@discord-hub/database";
import { getGuildChannels } from "@/lib/discord";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScheduleModal } from "@/components/ScheduleModal";
import { formatDate } from "@/lib/utils";
import {
  deleteScheduleAction,
  toggleScheduleAction,
  sendScheduleNowAction,
  flushNextBufferAction,
  clearBufferAction,
} from "@/app/actions/scheduleActions";
import {
  CalendarClock,
  Trash2,
  Power,
  Zap,
  Send,
  Clock,
  Repeat,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

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
      orderBy: { executeAt: "asc" },
    }),
    getGuildChannels(guildId),
  ]);

  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
  const channelMap = new Map(channels.map((c) => [c.id, c.name]));

  const bufferedCount = schedules.filter((s) => s.isActive && !s.isRecurring).length;
  const recurringCount = schedules.filter((s) => s.isActive && s.isRecurring).length;
  const nextUp = schedules.find((s) => s.isActive);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-[#5865F2]" />
            Message Buffer & Scheduler
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Drip-queue buffered announcements, schedule time-delayed messages, and run recurring cron broadcasts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {bufferedCount > 0 && (
            <form
              action={async () => {
                "use server";
                await flushNextBufferAction(guildId);
              }}
            >
              <Button variant="secondary" size="sm" type="submit" className="gap-2 text-emerald-400 hover:text-white">
                <Send className="w-4 h-4" />
                <span>Flush Next Now</span>
              </Button>
            </form>
          )}

          <ScheduleModal guildId={guildId} channels={textChannels} />
        </div>
      </div>

      {/* Buffer Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 bg-[#16181d]/80 border-white/10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-gray-400">Buffered In Queue</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{bufferedCount}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Dripping sequentially</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[#16181d]/80 border-white/10">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-gray-400">Recurring Cron Jobs</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{recurringCount}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Automated schedules</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 bg-[#16181d]/80 border-white/10">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase font-semibold text-gray-400">Next Scheduled Dispatch</p>
            <p className="text-sm font-bold text-white mt-0.5 truncate">
              {nextUp ? formatDate(nextUp.executeAt) : "None Pending"}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {nextUp ? `#${channelMap.get(nextUp.channelId) || "channel"}` : "Queue is empty"}
            </p>
          </div>
        </Card>
      </div>

      {/* Queue Manifest Card */}
      <Card className="border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Buffer Queue & Schedule Manifest</CardTitle>
            <CardDescription>
              All pending, scheduled, and recurring messages registered for this server
            </CardDescription>
          </div>

          {bufferedCount > 1 && (
            <form
              action={async () => {
                "use server";
                await clearBufferAction(guildId);
              }}
            >
              <Button variant="ghost" size="sm" type="submit" className="text-rose-400 hover:text-rose-300 text-xs">
                Clear All Buffered
              </Button>
            </form>
          )}
        </CardHeader>

        <div className="overflow-x-auto">
          {schedules.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              <CalendarClock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-400">No buffered or scheduled messages.</p>
              <p className="text-xs text-gray-500 mt-1">
                Click "Buffer / Schedule Message" to queue an announcement.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-white/5 text-gray-400 border-b border-white/10">
                <tr>
                  <th scope="col" className="px-4 py-3">Channel</th>
                  <th scope="col" className="px-4 py-3">Content / Title</th>
                  <th scope="col" className="px-4 py-3">Delivery Type</th>
                  <th scope="col" className="px-4 py-3">Next Execution</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {schedules.map((s, idx) => {
                  const channelName = channelMap.get(s.channelId) || s.channelId;

                  return (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-white whitespace-nowrap">
                        #{channelName}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        {s.title && <p className="font-semibold text-white truncate">{s.title}</p>}
                        <p className="text-xs text-gray-400 truncate">{s.content}</p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.isRecurring ? (
                          <Badge variant="info" className="gap-1 text-[11px]">
                            <Repeat className="w-3 h-3" />
                            <span>Cron: {s.cronExpression}</span>
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1 text-[11px] bg-amber-500/15 text-amber-400 border-amber-500/20">
                            <Zap className="w-3 h-3" />
                            <span>Buffer #{idx + 1}</span>
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-gray-300 whitespace-nowrap">
                        {formatDate(s.executeAt)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Sent / Inactive</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Now (Instant Dispatch) */}
                          <form
                            action={async () => {
                              "use server";
                              await sendScheduleNowAction(guildId, s.id);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              type="submit"
                              className="text-emerald-400 hover:text-emerald-300 p-1.5"
                              title="Send to Discord Right Now"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </form>

                          {/* Pause / Resume */}
                          <form
                            action={async () => {
                              "use server";
                              await toggleScheduleAction(guildId, s.id, s.isActive);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              type="submit"
                              className={s.isActive ? "text-amber-400 hover:text-amber-300 p-1.5" : "text-emerald-400 hover:text-emerald-300 p-1.5"}
                              title={s.isActive ? "Pause" : "Activate"}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                          </form>

                          {/* Delete */}
                          <form
                            action={async () => {
                              "use server";
                              await deleteScheduleAction(guildId, s.id);
                            }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              type="submit"
                              className="text-rose-400 hover:text-rose-300 p-1.5"
                              title="Delete from Queue"
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
