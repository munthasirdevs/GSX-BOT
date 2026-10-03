"use client";

import React, { useState } from "react";
import { Button } from "./ui/Button";
import { DiscordChannel } from "@/lib/discord";
import { deployTicketPanelAction } from "@/app/actions/broadcastActions";
import { Ticket, Send, X, CheckCircle2 } from "lucide-react";

interface TicketPanelDeployModalProps {
  guildId: string;
  channels: DiscordChannel[];
}

export const TicketPanelDeployModal: React.FC<TicketPanelDeployModalProps> = ({
  guildId,
  channels,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [channelId, setChannelId] = useState(channels[0]?.id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedChannelName = channels.find((c) => c.id === channelId)?.name || "tickets";

  async function handleDeploy() {
    setIsLoading(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      await deployTicketPanelAction(guildId, channelId);
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to deploy ticket panel.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)} className="gap-2">
        <Ticket className="w-4 h-4" />
        <span>Deploy Ticket Panel</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-lg w-full rounded-2xl p-6 border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-4 mb-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#5865F2]" />
                Deploy Ticket Initiation Panel
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Post the persistent "Create Ticket" button panel into a channel for server members.
              </p>
            </div>

            {success ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Panel Deployed Successfully!</h4>
                <p className="text-xs text-gray-400">
                  Posted into <strong>#{selectedChannelName}</strong>. Members can now click to create tickets.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
                    Target Channel for Ticket Button
                  </label>
                  <select
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="w-full bg-[#1e2128] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1.5">
                    We recommend dedicated channels like <code>#tickets</code> or <code>#support-desk</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs text-gray-300">
                  <p className="font-semibold text-white">What this does:</p>
                  <p>
                    Sends an interactive Discord embed with a <strong>"Create Ticket"</strong> button. When members click it, an in-app modal opens prompting for their inquiry, creating a private ticket channel under your configured category.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <Button variant="secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleDeploy} isLoading={isLoading} className="gap-2">
                    <Send className="w-4 h-4" />
                    <span>Post Panel to #{selectedChannelName}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
