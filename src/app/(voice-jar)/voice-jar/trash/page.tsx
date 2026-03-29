"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Trash2,
  Phone,
  Clock,
  Loader2,
  RotateCcw,
  AlertTriangle,
  X,
} from "lucide-react";
import { useVJAuth } from "../../VJAuthContext";

interface InteractionListItem {
  id: string;
  status: string;
  agentName: string | null;
  customerName: string | null;
  direction: string | null;
  duration: number | null;
  score: number | null;
  createdAt: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TrashPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useVJAuth();
  const [interactions, setInteractions] = useState<InteractionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchTrashed = useCallback(async () => {
    try {
      const res = await fetch("/api/interactions?trash=true");
      if (res.ok) {
        const json = await res.json();
        setInteractions(json.data);
      }
    } catch {
      toast.error("Failed to load trash");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrashed();
  }, [fetchTrashed]);

  const restore = async (id: string) => {
    try {
      const res = await fetch(`/api/interactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (!res.ok) throw new Error();
      setInteractions((prev) => prev.filter((i) => i.id !== id));
      toast.success("Interaction restored");
    } catch {
      toast.error("Failed to restore interaction");
    }
  };

  const permanentDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/interactions/${id}?permanent=true`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setInteractions((prev) => prev.filter((i) => i.id !== id));
      setConfirmDelete(null);
      toast.success("Interaction permanently deleted");
    } catch {
      toast.error("Failed to delete interaction");
    }
  };

  if (!authLoading && !isAdmin) {
    router.push("/voice-jar");
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md">
          <Trash2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trash</h1>
          <p className="text-sm text-gray-500">Deleted interactions can be restored or permanently removed</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      )}

      {!loading && interactions.length === 0 && (
        <div className="text-center py-16">
          <Trash2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Trash is empty</p>
        </div>
      )}

      {!loading && interactions.length > 0 && (
        <div className="space-y-2">
          {interactions.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.customerName || "Unknown Caller"}
                    </span>
                    {item.agentName && (
                      <span className="text-xs text-gray-400">Agent: {item.agentName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <Phone className="h-3 w-3" />
                      {item.direction || "inbound"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDuration(item.duration)}
                    </span>
                    {item.score !== null && (
                      <span className={`font-semibold ${item.score >= 75 ? "text-green-600" : item.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        Score: {item.score}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => restore(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 border border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30 rounded-lg transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Permanent Delete</h3>
              </div>
              <button onClick={() => setConfirmDelete(null)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete this interaction and all its analysis data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => permanentDelete(confirmDelete)}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
