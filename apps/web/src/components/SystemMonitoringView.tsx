"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { triggerManualReportAction } from "@/app/actions/monitoringActions";
import {
  Activity,
  Database,
  Server,
  Zap,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Users,
  Bot,
  Flame,
  ShieldCheck,
} from "lucide-react";

interface SystemMonitoringViewProps {
  guildId: string;
  botPingMs: number;
  dbPingMs: number;
  redisHealthy: boolean;
  todayStats: {
    total: number;
    humans: number;
    bots: number;
    channelCount: number;
  };
  dbTotals: {
    tickets: number;
    openTickets: number;
    schedules: number;
    analyticsSnapshots: number;
  };
}

export const SystemMonitoringView: React.FC<SystemMonitoringViewProps> = ({
  guildId,
  botPingMs,
  dbPingMs,
  redisHealthy,
  todayStats,
  dbTotals,
}) => {
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  async function handleTriggerReport() {
    setIsLoadingReport(true);
    setReportSuccess(false);

    try {
      await triggerManualReportAction(guildId);
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 5000);
    } catch (err) {
      alert("Failed to trigger report generation.");
    } finally {
      setIsLoadingReport(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Infrastructure Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Discord REST / Bot API */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Discord Gateway</h4>
                <p className="text-xs text-gray-400">REST API v10</p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </Badge>
          </div>
          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-400">API Latency:</span>
            <span className="font-semibold text-emerald-400">{botPingMs} ms</span>
          </div>
        </Card>

        {/* MySQL Database */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">MySQL Database</h4>
                <p className="text-xs text-gray-400">localhost:3306 (XAMPP)</p>
              </div>
            </div>
            <Badge variant="success" className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </Badge>
          </div>
          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-400">Query Latency:</span>
            <span className="font-semibold text-cyan-400">{dbPingMs} ms</span>
          </div>
        </Card>

        {/* Redis Cache */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Redis Store & BullMQ</h4>
                <p className="text-xs text-gray-400">localhost:6379</p>
              </div>
            </div>
            {redisHealthy ? (
              <Badge variant="success" className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                In-Memory Ready
              </Badge>
            ) : (
              <Badge variant="danger">Disconnected</Badge>
            )}
          </div>
          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-400">Memory Ingestion:</span>
            <span className="font-semibold text-rose-400">Zero DB Locking</span>
          </div>
        </Card>
      </div>

      {/* Today's Live In-Memory Telemetry */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Live 24h Ingestion Telemetry (Redis)
              </CardTitle>
              <CardDescription>
                Real-time activity counters collected in-memory before midnight UTC aggregation
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerReport}
              isLoading={isLoadingReport}
              className="gap-2 self-start"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Generate 24h Report Now</span>
            </Button>
          </div>
        </CardHeader>

        {reportSuccess && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>24h analytics cycle triggered successfully! Report embed dispatched to your configured report channel.</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Messages Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.total.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Live buffer count</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Humans Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.humans.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Verified member posts</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bot Messages</span>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.bots.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Automations & webhooks</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Channels</span>
            </div>
            <p className="text-2xl font-bold text-white">{todayStats.channelCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Recorded conversations</p>
          </div>
        </div>
      </Card>

      {/* Database Storage Telemetry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            MySQL Storage & Records Manifest
          </CardTitle>
          <CardDescription>
            Relational tables managed under database: <code>discord_bot_db</code>
          </CardDescription>
        </CardHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">Active Tickets</span>
            <p className="text-2xl font-bold text-emerald-400">{dbTotals.openTickets}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Awaiting staff resolution</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">Total Lifetime Tickets</span>
            <p className="text-2xl font-bold text-white">{dbTotals.tickets}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Archived & open</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">Scheduled Queue Jobs</span>
            <p className="text-2xl font-bold text-indigo-400">{dbTotals.schedules}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">BullMQ persistent messages</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <span className="text-xs text-gray-400 block mb-1">24h History Snapshots</span>
            <p className="text-2xl font-bold text-amber-400">{dbTotals.analyticsSnapshots}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Days of aggregated metrics</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
