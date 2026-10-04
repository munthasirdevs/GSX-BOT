"use client";

import React from "react";
import { Bot, FileText } from "lucide-react";

interface DiscordEmbedPreviewProps {
  title?: string;
  content: string;
  color?: string;
  authorName?: string;
  footerText?: string;
  channelName?: string;
  imagePreviewUrl?: string | null;
  fileName?: string | null;
}

export const DiscordEmbedPreview: React.FC<DiscordEmbedPreviewProps> = ({
  title,
  content,
  color = "#5865F2",
  authorName = "Discord Hub",
  footerText = "Sent from Discord Hub Dashboard",
  channelName = "announcements",
  imagePreviewUrl,
  fileName,
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

            {/* Embedded image preview */}
            {imagePreviewUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-white/10 max-h-56">
                <img
                  src={imagePreviewUrl}
                  alt="Attachment preview"
                  className="w-full h-auto max-h-56 object-cover"
                />
              </div>
            )}

            {/* File attachment preview badge if not image */}
            {fileName && !imagePreviewUrl && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-black/30 border border-white/5 text-xs text-gray-300">
                <FileText className="w-4 h-4 text-[#5865F2]" />
                <span className="font-mono truncate">{fileName}</span>
              </div>
            )}

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
