"use client";

import { useState } from "react";
import {
  toggleBufferPauseAction,
  updateBufferSettingsAction,
  flushNextBufferAction,
  clearBufferAction,
} from "@/app/actions/scheduleActions";
import {
  Play,
  Pause,
  Settings,
  Send,
  Trash2,
  Clock,
  Hash,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChannelOption {
  id: string;
  name: string;
}

export function BufferSettingsBar({
  guildId,
  channels,
  currentChannelId,
  currentInterval,
  isPaused,
  bufferedCount,
}: {
  guildId: string;
  channels: ChannelOption[];
  currentChannelId?: string | null;
  currentInterval: number;
  isPaused: boolean;
  bufferedCount: number;
}) {
  const [channelId, setChannelId] = useState(currentChannelId || "");
  const [interval, setIntervalVal] = useState(currentInterval || 15);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTogglePause = async () => {
    setIsTogglingPause(true);
    try {
      await toggleBufferPauseAction(guildId);
    } finally {
      setIsTogglingPause(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("bufferChannelId", channelId);
    formData.append("bufferInterval", interval.toString());

    try {
      await updateBufferSettingsAction(guildId, formData);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setShowConfig(false);
      }, 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFlushNext = async () => {
    setIsFlushing(true);
    try {
      await flushNextBufferAction(guildId);
    } finally {
      setIsFlushing(false);
    }
  };

  const handleClearBuffer = async () => {
    if (!confirm("Are you sure you want to clear all pending buffered messages?")) return;
    setIsClearing(true);
    try {
      await clearBufferAction(guildId);
    } finally {
      setIsClearing(false);
    }
  };

  const currentChannelName = channels.find((c) => c.id === currentChannelId)?.name;

  return (
    <div className="bg-[#16181d]/90 border border-white/10 rounded-2xl p-4 shadow-lg space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pill & Info */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleTogglePause}
            disabled={isTogglingPause}
            title={isPaused ? "Click to Resume Buffer" : "Click to Pause Buffer"}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
              isPaused
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
            }`}
          >
            {isPaused ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Buffer Paused (Hold)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Buffer Active (Dripping)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <Clock className="w-3 h-3 text-amber-400" />
              Interval: <strong className="text-white">{currentInterval}m</strong>
            </span>

            <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <Hash className="w-3 h-3 text-[#5865F2]" />
              Default: <strong className="text-white">{currentChannelName ? `#${currentChannelName}` : "Not set"}</strong>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {bufferedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isFlushing}
              onClick={handleFlushNext}
              className="text-emerald-400 hover:text-white gap-1.5 text-xs h-8"
              title="Immediately dispatch the earliest buffered message"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isFlushing ? "Flushing..." : "Flush Next Now"}</span>
            </Button>
          )}

          {bufferedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isClearing}
              onClick={handleClearBuffer}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1.5 text-xs h-8"
              title="Clear all buffered items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
            className="text-gray-300 hover:text-white gap-1.5 text-xs h-8 bg-white/5 border border-white/5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{showConfig ? "Close Settings" : "Configure Buffer"}</span>
          </Button>
        </div>
      </div>

      {/* Expandable Configuration Drawer */}
      {showConfig && (
        <form
          onSubmit={handleSaveSettings}
          className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Default Target Channel
            </label>
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]"
            >
              <option value="">-- Select Channel --</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#181a20]">
                  #{c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Drip Spacing Interval
            </label>
            <select
              value={interval}
              onChange={(e) => setIntervalVal(parseInt(e.target.value, 10))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={15}>Every 15 minutes (Standard)</option>
              <option value={30}>Every 30 minutes</option>
              <option value={45}>Every 45 minutes</option>
              <option value={60}>Every 1 hour</option>
              <option value={120}>Every 2 hours</option>
              <option value={240}>Every 4 hours</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs h-9 font-semibold gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>{isSaving ? "Saving..." : "Save Settings"}</span>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
