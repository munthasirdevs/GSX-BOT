"use client";

import React from "react";
import { Bot } from "lucide-react";

interface DiscordEmbedPreviewProps {
  title?: string;
  content: string;
  color?: string;
  authorName?: string;
  footerText?: string;
  channelName?: string;
}

export const DiscordEmbedPreview: React.FC<DiscordEmbedPreviewProps> = ({
  title,
  content,
  color = "#5865F2",
  authorName = "Discord Hub",
  footerText = "Scheduled Announcement • Discord Hub",
  channelName = "announcements",
}) => {
  return (
    <div className="bg-[#313338] text-[#dbdee1] rounded-xl p-4 font-sans text-sm border border-black/20 shadow-xl max-w-lg w-full">
      {/* Channel header simulation */}
      <div className="text-xs text-[#949ba4] font-medium pb-3 mb-3 border-b border-[#3f4147] flex items-center gap-1.5">
        <span>#</span>
        <span className="text-white font-semibold">{channelName}</span>
      </div>

      {/* Bot message header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">
          <Bot className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
              {authorName}
            </span>
            <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1 py-0.5 rounded uppercase leading-none">
              BOT
            </span>
            <span className="text-xs text-[#949ba4]">Today at 12:00 PM</span>
          </div>

          {/* Embed Container */}
          <div
            className="mt-2 rounded bg-[#2b2d31] p-3.5 border-l-4 shadow-sm"
            style={{ borderLeftColor: color }}
          >
            {title && (
              <h4 className="font-bold text-white text-base mb-1.5 leading-snug">
                {title}
              </h4>
            )}

            <div className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
              {content || "Your announcement message will appear here..."}
            </div>

            <div className="mt-3 pt-2 text-[10px] text-[#949ba4] flex items-center gap-1 border-t border-[#35373c]">
              <span>{footerText}</span>
              <span>•</span>
              <span>Today at 12:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
