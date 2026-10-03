"use client";

import React, { useState } from "react";
import { Button } from "./ui/Button";
import { DiscordEmbedPreview } from "./DiscordEmbedPreview";
import { DiscordChannel } from "@/lib/discord";
import { createScheduleAction } from "@/app/actions/scheduleActions";
import { Calendar, Plus, X, Zap, Clock, Repeat } from "lucide-react";

interface ScheduleModalProps {
  guildId: string;
  channels: DiscordChannel[];
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ guildId, channels }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [mode, setMode] = useState<"buffer" | "datetime" | "cron">("buffer");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [channelId, setChannelId] = useState(channels[0]?.id || "");
  const [datetime, setDatetime] = useState("");
  const [dripMinutes, setDripMinutes] = useState("15");
  const [cronExpression, setCronExpression] = useState("0 12 * * *");
  const [errorMsg, setErrorMsg] = useState("");

  const selectedChannelName = channels.find((c) => c.id === channelId)?.name || "announcements";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("channelId", channelId);
    formData.append("title", title);
    formData.append("content", content);
    formData.append("mode", mode);
    formData.append("datetime", datetime);
    formData.append("dripMinutes", dripMinutes);
    formData.append("cronExpression", cronExpression);
    formData.append("isRecurring", mode === "cron" ? "true" : "false");

    try {
      await createScheduleAction(guildId, formData);
      setIsOpen(false);
      // Reset form
      setTitle("");
      setContent("");
      setDatetime("");
      setMode("buffer");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to schedule announcement.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)} className="gap-2 shadow-lg shadow-[#5865F2]/20">
        <Plus className="w-4 h-4" />
        <span>Buffer / Schedule Message</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-card max-w-4xl w-full rounded-2xl p-6 border border-white/10 shadow-2xl relative my-8">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-4 mb-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#5865F2]" />
                Buffer & Schedule Announcement
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Queue messages in the automated buffer drip or schedule them for a specific time.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
                    Delivery Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("buffer")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        mode === "buffer"
                          ? "bg-[#5865F2]/15 border-[#5865F2] text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Zap className="w-4 h-4 mb-1 text-amber-400" />
                      <span>Buffer Drip</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("datetime")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        mode === "datetime"
                          ? "bg-[#5865F2]/15 border-[#5865F2] text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Clock className="w-4 h-4 mb-1 text-emerald-400" />
                      <span>Exact Time</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("cron")}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        mode === "cron"
                          ? "bg-[#5865F2]/15 border-[#5865F2] text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Repeat className="w-4 h-4 mb-1 text-indigo-400" />
                      <span>Recurring Cron</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                    Target Channel <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    required
                    className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                    Embed Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Server Announcement"
                    className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                    Message Content <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    placeholder="Write your announcement... Markdown formatted!"
                    className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                {/* Dynamic Mode Settings */}
                {mode === "buffer" && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-300">Buffer Spacing (Drip Gap)</span>
                      <span className="text-xs text-amber-200">{dripMinutes} minutes</span>
                    </div>
                    <select
                      value={dripMinutes}
                      onChange={(e) => setDripMinutes(e.target.value)}
                      className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                    >
                      <option value="5">Every 5 Minutes</option>
                      <option value="15">Every 15 Minutes (Default)</option>
                      <option value="30">Every 30 Minutes</option>
                      <option value="60">Every 1 Hour</option>
                      <option value="120">Every 2 Hours</option>
                    </select>
                    <p className="text-[11px] text-gray-400">
                      This message will be appended to the queue after the previous buffered announcement.
                    </p>
                  </div>
                )}

                {mode === "datetime" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      Execution Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={datetime}
                      onChange={(e) => setDatetime(e.target.value)}
                      required
                      className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>
                )}

                {mode === "cron" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                      Cron Pattern
                    </label>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      required
                      placeholder="e.g. 0 12 * * * (daily noon)"
                      className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Runs automatically on schedule: Minute Hour Day Month DayOfWeek
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={isLoading} className="gap-2">
                    <Plus className="w-4 h-4" />
                    <span>{mode === "buffer" ? "Add to Buffer Queue" : "Confirm Schedule"}</span>
                  </Button>
                </div>
              </form>

              {/* Live Discord Visual Preview */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Live Discord Preview
                </span>
                <div className="flex-1 flex items-center justify-center p-4 bg-[#1e2128]/50 rounded-xl border border-white/5">
                  <DiscordEmbedPreview
                    title={title}
                    content={content}
                    channelName={selectedChannelName}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
