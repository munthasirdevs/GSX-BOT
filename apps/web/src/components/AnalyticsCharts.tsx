"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Users, Bot, MessageSquare, TrendingUp } from "lucide-react";

export interface AnalyticsRecord {
  id: string;
  date: string;
  totalMessages: number;
  humanMessages: number;
  botMessages: number;
  topUsersJson: Array<{ userId: string; tag: string; isBot: boolean; count: number }>;
  channelStatsJson: Record<string, number>;
}

interface AnalyticsChartsProps {
  history: AnalyticsRecord[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ history }) => {
  const [timeframe, setTimeframe] = useState<"7d" | "30d">("7d");

  // Filter history based on selected timeframe
  const filteredHistory = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(timeframe === "7d" ? -7 : -30);

  // Format data for Area/Line chart
  const timelineData = filteredHistory.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Total: item.totalMessages,
    Humans: item.humanMessages,
    Bots: item.botMessages,
  }));

  // Aggregated totals
  const totalMsgs = filteredHistory.reduce((acc, curr) => acc + curr.totalMessages, 0);
  const totalHumans = filteredHistory.reduce((acc, curr) => acc + curr.humanMessages, 0);
  const totalBots = filteredHistory.reduce((acc, curr) => acc + curr.botMessages, 0);

  // Pie chart data
  const pieData = [
    { name: "Humans", value: totalHumans || 1, color: "#5865F2" },
    { name: "Bots", value: totalBots || 0, color: "#57F287" },
  ];

  // Latest top users aggregation
  const latestRecord = history[history.length - 1];
  const topUsers = latestRecord?.topUsersJson || [];

  return (
    <div className="space-y-6">
      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Messages</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">{totalMsgs.toLocaleString()}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Human Messages</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">{totalHumans.toLocaleString()}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bot Messages</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">{totalBots.toLocaleString()}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Human Ratio</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">
              {totalMsgs > 0 ? `${((totalHumans / totalMsgs) * 100).toFixed(1)}%` : "100%"}
            </h4>
          </div>
        </Card>
      </div>

      {/* Main Timeline Chart */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <CardHeader className="mb-0">
            <CardTitle>Activity Volume Trend</CardTitle>
            <CardDescription>Daily message distribution between members and bots</CardDescription>
          </CardHeader>

          {/* Toggle buttons */}
          <div className="flex items-center bg-[#2B2D31] p-1 rounded-lg self-start">
            <button
              onClick={() => setTimeframe("7d")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeframe === "7d" ? "bg-[#5865F2] text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe("30d")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeframe === "30d" ? "bg-[#5865F2] text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          {timelineData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              No activity logs recorded yet. Active messages will generate historical analytics.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5865F2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#5865F2" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="humanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#57F287" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#57F287" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2B2D31" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e2128",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#ffffff",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Total"
                  stroke="#5865F2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#totalGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="Humans"
                  stroke="#57F287"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#humanGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Split Charts: Distribution & Top Members Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Human vs Bot Donut Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Member Composition</CardTitle>
            <CardDescription>Human vs. Automated Bot traffic split</CardDescription>
          </CardHeader>
          <div className="h-64 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e2128",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#ffffff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-2 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#5865F2]" />
                <span className="text-gray-300">Humans ({totalMsgs > 0 ? ((totalHumans / totalMsgs) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#57F287]" />
                <span className="text-gray-300">Bots ({totalMsgs > 0 ? ((totalBots / totalMsgs) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Top Active Users Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Most Active Members & Bots</CardTitle>
            <CardDescription>Leaderboard ranking from the latest 24-hour cycle</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            {topUsers.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No member activity recorded in the latest snapshot.
              </p>
            ) : (
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="text-xs uppercase bg-white/5 text-gray-400">
                  <tr>
                    <th scope="col" className="px-4 py-3 rounded-l-lg">Rank</th>
                    <th scope="col" className="px-4 py-3">Member</th>
                    <th scope="col" className="px-4 py-3">Type</th>
                    <th scope="col" className="px-4 py-3 text-right rounded-r-lg">Messages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {topUsers.slice(0, 8).map((user, idx) => (
                    <tr key={user.userId} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">#{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-white">
                            {user.tag.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="font-medium text-white truncate max-w-[180px]">{user.tag}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.isBot ? (
                          <Badge variant="info">BOT</Badge>
                        ) : (
                          <Badge variant="success">HUMAN</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {user.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
