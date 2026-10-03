"use client";

import React, { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { DiscordEmbedPreview } from "./DiscordEmbedPreview";
import { DiscordChannel } from "@/lib/discord";
import { sendBroadcastAction } from "@/app/actions/broadcastActions";
import { Send, CheckCircle2, AlertCircle, Sparkles, Hash, Megaphone } from "lucide-react";

interface BroadcastFormProps {
  guildId: string;
  channels: DiscordChannel[];
}

const PRESET_COLORS = [
  { name: "Blurple", hex: "#5865F2" },
  { name: "Green", hex: "#57F287" },
  { name: "Yellow", hex: "#FEE75C" },
  { name: "Fuchsia", hex: "#EB459E" },
  { name: "Red", hex: "#ED4245" },
  { name: "Cyan", hex: "#00b0f4" },
];

export const BroadcastForm: React.FC<BroadcastFormProps> = ({ guildId, channels }) => {
  const [channelId, setChannelId] = useState(channels[0]?.id || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("#5865F2");
  const [isEmbed, setIsEmbed] = useState(true);
  const [mentionEveryone, setMentionEveryone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const selectedChannel = channels.find((c) => c.id === channelId);
  const channelName = selectedChannel?.name || "general";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("channelId", channelId);
    formData.append("content", content);
    formData.append("title", title);
    formData.append("color", selectedColor);
    formData.append("isEmbed", isEmbed ? "true" : "false");
    formData.append("mentionEveryone", mentionEveryone ? "true" : "false");

    try {
      await sendBroadcastAction(guildId, formData);
      setSuccessMsg(`Message successfully dispatched to #${channelName}!`);
      // Keep form or clear
      setContent("");
      setTitle("");
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send message to Discord.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Form Controls */}
      <div className="lg:col-span-7 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#5865F2]" />
              Message Composer
            </CardTitle>
            <CardDescription>
              Broadcast an immediate announcement or formatted message to any text channel.
            </CardDescription>
          </CardHeader>

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Target Channel */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Target Channel <span className="text-rose-400">*</span>
              </label>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                required
                className="w-full bg-[#1e2128] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.type === 5 ? "📢" : "#"} {ch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode: Embed vs Plain Text */}
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmbed}
                  onChange={(e) => setIsEmbed(e.target.checked)}
                  className="rounded bg-[#1e2128] border-white/10 text-[#5865F2] focus:ring-0"
                />
                <span className="text-xs font-semibold text-white">Wrap in Rich Discord Embed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mentionEveryone}
                  onChange={(e) => setMentionEveryone(e.target.checked)}
                  className="rounded bg-[#1e2128] border-white/10 text-rose-500 focus:ring-0"
                />
                <span className="text-xs font-semibold text-rose-400">Mention @everyone</span>
              </label>
            </div>

            {isEmbed && (
              <>
                {/* Embed Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Embed Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 📢 Important Server Update"
                    className="w-full bg-[#1e2128] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setSelectedColor(color.hex)}
                        style={{ backgroundColor: color.hex }}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          selectedColor === color.hex ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#111215]" : "hover:scale-110 opacity-80"
                        }`}
                        title={color.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-7 h-7 rounded-full bg-transparent cursor-pointer border-0 p-0 ml-2"
                      title="Custom Color"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Content Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Message Content <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <button
                    type="button"
                    onClick={() => setContent((prev) => `${prev} **bold text**`)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 font-bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => `${prev} *italic text*`)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent((prev) => `${prev} \`code\``)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono"
                  >
                    {"</>"}
                  </button>
                </div>
              </div>

              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder="Type your message here... Full Discord markdown (bold, lists, emojis) is supported."
                className="w-full bg-[#1e2128] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#5865F2] leading-relaxed"
              />
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <Button variant="primary" type="submit" size="lg" isLoading={isLoading} className="gap-2 shadow-lg shadow-[#5865F2]/25">
                <Send className="w-4 h-4" />
                <span>Send to #{channelName}</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Live Preview Column */}
      <div className="lg:col-span-5 sticky top-20 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Live Discord Client Simulation
          </span>
          <span className="text-[11px] text-gray-500">Updates dynamically</span>
        </div>

        <div className="p-4 bg-[#1e2128]/70 rounded-2xl border border-white/5 shadow-xl flex justify-center">
          <DiscordEmbedPreview
            title={title}
            content={content}
            color={selectedColor}
            channelName={channelName}
          />
        </div>
      </div>
    </div>
  );
};
