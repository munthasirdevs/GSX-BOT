"use client";

import React, { useState } from "react";
import { Ticket, TicketStatus } from "@discord-hub/database";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { formatDate } from "@/lib/utils";
import { MessageSquare, CheckCircle, Clock, ExternalLink, FileText, User } from "lucide-react";

interface TicketListProps {
  tickets: (Ticket & {
    createdAt: Date | string;
    closedAt: Date | string | null;
  })[];
  guildId: string;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, guildId }) => {
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const filteredTickets = tickets.filter((t) => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const closedCount = tickets.filter((t) => t.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Tickets</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">{tickets.length}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Open</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">{openCount}</h4>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center text-gray-300">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resolved / Closed</p>
            <h4 className="text-2xl font-bold text-white mt-0.5">{closedCount}</h4>
          </div>
        </Card>
      </div>

      {/* Main Ticket Table */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <CardHeader className="mb-0">
            <CardTitle>Support Inquiries</CardTitle>
            <CardDescription>Browse active tickets and historical archived conversations</CardDescription>
          </CardHeader>

          {/* Filter Tabs */}
          <div className="flex items-center bg-[#2B2D31] p-1 rounded-lg self-start">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filter === "ALL" ? "bg-[#5865F2] text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              onClick={() => setFilter("OPEN")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filter === "OPEN" ? "bg-[#5865F2] text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setFilter("CLOSED")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filter === "CLOSED" ? "bg-[#5865F2] text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              Closed ({closedCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No tickets matching the selected filter.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-white/5 text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3 rounded-l-lg">Ticket</th>
                  <th scope="col" className="px-4 py-3">Creator</th>
                  <th scope="col" className="px-4 py-3">Inquiry / Reason</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Created</th>
                  <th scope="col" className="px-4 py-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-white">
                      #{t.ticketNumber.toString().padStart(4, "0")}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium text-white">{t.creatorTag}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate text-gray-300">
                      {t.reason || "*No inquiry reason specified*"}
                    </td>
                    <td className="px-4 py-3.5">
                      {t.status === "OPEN" ? (
                        <Badge variant="success">OPEN</Badge>
                      ) : (
                        <Badge variant="neutral">CLOSED</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {t.status === "CLOSED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTicket(t)}
                          className="gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#5865F2]" />
                          <span>Transcript</span>
                        </Button>
                      ) : (
                        <a
                          href={`https://discord.com/channels/${guildId}/${t.channelId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="gap-1 text-[#5865F2] hover:text-[#7289da]">
                            <span>Jump</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Transcript Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-xl w-full rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#5865F2]" />
                <h3 className="font-bold text-lg text-white">
                  Ticket #{selectedTicket.ticketNumber.toString().padStart(4, "0")} Transcript
                </h3>
              </div>
              <Badge variant="neutral">Archived</Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-white/5 p-3 rounded-lg space-y-1">
                <p className="text-xs text-gray-400">Creator:</p>
                <p className="text-white font-medium">{selectedTicket.creatorTag} (ID: {selectedTicket.creatorId})</p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg space-y-1">
                <p className="text-xs text-gray-400">Reason / Description:</p>
                <p className="text-gray-200">{selectedTicket.reason || "None"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-lg space-y-1">
                  <p className="text-xs text-gray-400">Opened At:</p>
                  <p className="text-gray-200 text-xs">{formatDate(selectedTicket.createdAt)}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg space-y-1">
                  <p className="text-xs text-gray-400">Closed At:</p>
                  <p className="text-gray-200 text-xs">
                    {selectedTicket.closedAt ? formatDate(selectedTicket.closedAt) : "N/A"}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-lg text-xs text-gray-300">
                💡 Transcripts are preserved in your server's configured audit channel as interactive HTML attachments.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
