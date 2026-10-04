"use client";

import { useState } from "react";
import {
  sendScheduleNowAction,
  toggleScheduleAction,
  deleteScheduleAction,
  reorderBufferItemAction,
} from "@/app/actions/scheduleActions";
import { Send, Power, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BufferQueueActions({
  guildId,
  scheduleId,
  isActive,
  isBuffer,
  canMoveUp,
  canMoveDown,
}: {
  guildId: string;
  scheduleId: string;
  isActive: boolean;
  isBuffer: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [isSending, setIsSending] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const handleSendNow = async () => {
    setIsSending(true);
    try {
      await sendScheduleNowAction(guildId, scheduleId);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleScheduleAction(guildId, scheduleId, isActive);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this message from queue?")) return;
    setIsDeleting(true);
    try {
      await deleteScheduleAction(guildId, scheduleId);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReorder = async (direction: "up" | "down") => {
    setIsMoving(true);
    try {
      await reorderBufferItemAction(guildId, scheduleId, direction);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Reorder Buttons (Buffer Only) */}
      {isBuffer && (
        <div className="flex items-center mr-1 bg-white/5 rounded-lg border border-white/5 p-0.5">
          <button
            type="button"
            disabled={!canMoveUp || isMoving}
            onClick={() => handleReorder("up")}
            title="Move earlier in buffer queue"
            className="p-1 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown || isMoving}
            onClick={() => handleReorder("down")}
            title="Move later in buffer queue"
            className="p-1 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Send Now (Instant Dispatch) */}
      <Button
        variant="ghost"
        size="sm"
        disabled={isSending}
        onClick={handleSendNow}
        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 p-1.5 h-8 w-8"
        title="Send to Discord Right Now"
      >
        <Send className="w-3.5 h-3.5" />
      </Button>

      {/* Pause / Activate */}
      <Button
        variant="ghost"
        size="sm"
        disabled={isToggling}
        onClick={handleToggle}
        className={`p-1.5 h-8 w-8 ${
          isActive
            ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
        }`}
        title={isActive ? "Pause Message" : "Activate Message"}
      >
        <Power className="w-3.5 h-3.5" />
      </Button>

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        disabled={isDeleting}
        onClick={handleDelete}
        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 h-8 w-8"
        title="Delete from Queue"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
