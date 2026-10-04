"use client";

import { useState } from "react";
import { quickAddBufferAction } from "@/app/actions/scheduleActions";
import { Zap, Send, MessageSquare, Hash, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChannelOption {
  id: string;
  name: string;
}

export function BufferQuickComposer({
  guildId,
  channels,
  defaultChannelId,
  bufferInterval,
  isPaused,
}: {
  guildId: string;
  channels: ChannelOption[];
  defaultChannelId?: string | null;
  bufferInterval: number;
  isPaused: boolean;
}) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [channelId, setChannelId] = useState(defaultChannelId || (channels[0]?.id ?? ""));
  const [showTitle, setShowTitle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("channelId", channelId);
    if (title.trim()) formData.append("title", title);

    try {
      await quickAddBufferAction(guildId, formData);
      setContent("");
      setTitle("");
      setStatusMsg({
        text: isPaused
          ? "Queued in buffer (Delivery paused until resumed)"
          : `Queued in buffer! Will drip sequentially every ${bufferInterval}m`,
        error: false,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to add to buffer", error: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#181a20]/90 to-[#1e2029]/90 border border-white/10 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Quick Buffer Composer
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Auto-Drip
              </span>
            </h2>
            <p className="text-[11px] text-gray-400">
              Type and queue announcements directly into the server's outbox pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowTitle(!showTitle)}
            className="text-gray-400 hover:text-white transition-colors underline text-xs"
          >
            {showTitle ? "− Remove Title" : "+ Add Embed Title"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {showTitle && (
          <input
            type="text"
            placeholder="Embed Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
          />
        )}

        <div className="relative">
          <textarea
            rows={2}
            placeholder="Write announcement or message to queue in buffer..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#181a20] text-white">
                    #{c.name} {c.id === defaultChannelId ? "(Default Buffer)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-[11px] text-gray-400">
              Spacing: <strong className="text-amber-400">~{bufferInterval}m</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {statusMsg && (
              <span
                className={`text-xs ${
                  statusMsg.error ? "text-rose-400" : "text-emerald-400"
                } animate-fade-in`}
              >
                {statusMsg.text}
              </span>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-2 shadow-lg shadow-amber-500/20"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? "Queueing..." : "⚡ Add to Buffer"}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
