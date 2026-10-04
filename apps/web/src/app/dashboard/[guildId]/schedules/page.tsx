import { prisma } from "@discord-hub/database";
import { getGuildChannels } from "@/lib/discord";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScheduleModal } from "@/components/ScheduleModal";
import { BufferQuickComposer } from "@/components/BufferQuickComposer";
import { BufferSettingsBar } from "@/components/BufferSettingsBar";
import { BufferQueueActions } from "@/components/BufferQueueActions";
import { formatDate } from "@/lib/utils";
import {
  CalendarClock,
  Zap,
  Repeat,
  Clock,
  Send,
  Layers,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SchedulesPage({
  params,
}: {
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  const [schedules, channels, guildConfig] = await Promise.all([
    prisma.scheduledMessage.findMany({
      where: { guildId },
      orderBy: { executeAt: "asc" },
    }),
    getGuildChannels(guildId),
    prisma.guildConfig.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    }),
  ]);

  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
  const channelMap = new Map(channels.map((c) => [c.id, c.name]));

  const activeBufferedItems = schedules.filter((s) => s.isActive && !s.isRecurring);
  const bufferedCount = activeBufferedItems.length;
  const recurringCount = schedules.filter((s) => s.isActive && s.isRecurring).length;
  const nextUp = schedules.find((s) => s.isActive);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-amber-400" />
            Message Buffer & Scheduler
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Automated drip queue, outbox buffer pipeline, and recurring announcement dispatcher
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ScheduleModal guildId={guildId} channels={textChannels} />
        </div>
      </div>

      {/* Buffer Settings & Controls Bar */}
      <BufferSettingsBar
        guildId={guildId}
        channels={textChannels}
        currentChannelId={guildConfig.bufferChannelId}
        currentInterval={guildConfig.bufferInterval}
        isPaused={guildConfig.bufferPaused}
        bufferedCount={bufferedCount}
      />

      {/* Buffer Quick 1-Click Composer */}
      <BufferQuickComposer
        guildId={guildId}
        channels={textChannels}
        defaultChannelId={guildConfig.bufferChannelId}
        bufferInterval={guildConfig.bufferInterval}
        isPaused={guildConfig.bufferPaused}
      />

      {/* Buffer Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 bg-[#16181d]/80 border-white/10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-gray-400">Buffered In Outbox</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{bufferedCount}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {guildConfig.bufferPaused ? "Delivery paused" : `Dripping every ${guildConfig.bufferInterval}m`}
            </p>
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
              {nextUp ? `#${channelMap.get(nextUp.channelId) || "channel"}` : "Outbox is clear"}
            </p>
          </div>
        </Card>
      </div>

      {/* Queue Manifest Card */}
      <Card className="border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#5865F2]" />
              Buffer Queue & Schedule Manifest
            </CardTitle>
            <CardDescription>
              Sequence order, delivery ETA, and priority management for outbox and recurring schedules
            </CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          {schedules.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              <CalendarClock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-400">No buffered or scheduled messages.</p>
              <p className="text-xs text-gray-500 mt-1">
                Type in the Quick Buffer Composer above or click "Buffer / Schedule Message" to queue an announcement.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-white/5 text-gray-400 border-b border-white/10">
                <tr>
                  <th scope="col" className="px-4 py-3">Order / Channel</th>
                  <th scope="col" className="px-4 py-3">Content / Title</th>
                  <th scope="col" className="px-4 py-3">Delivery Type</th>
                  <th scope="col" className="px-4 py-3">ETA Execution</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {schedules.map((s) => {
                  const channelName = channelMap.get(s.channelId) || s.channelId;
                  const isBuffer = s.isActive && !s.isRecurring;
                  const bufferIndex = isBuffer
                    ? activeBufferedItems.findIndex((b) => b.id === s.id)
                    : -1;

                  const canMoveUp = isBuffer && bufferIndex > 0;
                  const canMoveDown =
                    isBuffer && bufferIndex < activeBufferedItems.length - 1;

                  return (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isBuffer && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                              #{bufferIndex + 1}
                            </span>
                          )}
                          <span className="font-semibold text-white">#{channelName}</span>
                        </div>
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
                          <Badge
                            variant="warning"
                            className="gap-1 text-[11px] bg-amber-500/15 text-amber-400 border-amber-500/20"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Buffer Drip</span>
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-gray-300 whitespace-nowrap">
                        {formatDate(s.executeAt)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.isActive ? (
                          guildConfig.bufferPaused && isBuffer ? (
                            <Badge variant="warning" className="bg-amber-500/15 text-amber-400 border-amber-500/20">
                              Paused (Hold)
                            </Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )
                        ) : (
                          <Badge variant="neutral">Sent / Completed</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <BufferQueueActions
                          guildId={guildId}
                          scheduleId={s.id}
                          isActive={s.isActive}
                          isBuffer={isBuffer}
                          canMoveUp={canMoveUp}
                          canMoveDown={canMoveDown}
                        />
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
