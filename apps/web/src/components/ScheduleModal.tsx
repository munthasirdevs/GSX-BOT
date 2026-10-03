"use client";

import React, { useState } from "react";
import { Button } from "./ui/Button";
import { DiscordEmbedPreview } from "./DiscordEmbedPreview";
import { DiscordChannel } from "@/lib/discord";
import { createScheduleAction } from "@/app/actions/scheduleActions";
import { Calendar, Plus, X } from "lucide-react";

interface ScheduleModalProps {
  guildId: string;
  channels: DiscordChannel[];
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ guildId, channels }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for live preview
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [channelId, setChannelId] = useState(channels[0]?.id || "");
  const [datetime, setDatetime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [cronExpression, setCronExpression] = useState("");
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
    formData.append("datetime", datetime);
    formData.append("cronExpression", cronExpression);
    formData.append("isRecurring", isRecurring ? "true" : "false");

    try {
      await createScheduleAction(guildId, formData);
      setIsOpen(false);
      // Reset form
      setTitle("");
      setContent("");
      setDatetime("");
      setIsRecurring(false);
      setCronExpression("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to schedule announcement.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" />
        <span>New Schedule</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="glass-card max-w-4xl w-full rounded-2xl p-6 border border-white/10 shadow-2xl relative my-8">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-4 mb-5 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#5865F2]" />
                Schedule Announcement
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Draft a message, preview how it renders in Discord, and choose when it fires.
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
                    placeholder="e.g. Weekly Community Update"
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
                    placeholder="Type announcement message here... Markdown supported!"
                    className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">
                    Execution Time
                  </label>
                  <input
                    type="datetime-local"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Leave blank to send in 2 minutes, or pick an exact date and time.
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="rounded bg-[#1e2128] border-white/10 text-[#5865F2] focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-gray-300">
                      Make this a recurring scheduled message
                    </span>
                  </label>

                  {isRecurring && (
                    <div>
                      <input
                        type="text"
                        value={cronExpression}
                        onChange={(e) => setCronExpression(e.target.value)}
                        placeholder="Cron pattern, e.g. 0 12 * * * (daily noon)"
                        className="w-full bg-[#1e2128] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Standard 5-part cron syntax (minute hour day month day-of-week).
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={isLoading}>
                    Confirm & Schedule
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
