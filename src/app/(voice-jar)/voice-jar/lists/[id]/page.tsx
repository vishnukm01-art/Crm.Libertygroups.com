"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  List,
  Phone,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Trash2,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface InteractionInList {
  id: string;
  status: string;
  agentName: string | null;
  customerName: string | null;
  direction: string | null;
  duration: number | null;
  sentiment: string | null;
  score: number | null;
  audioFileName: string | null;
  createdAt: string;
  _count: {
    interactionStrengths: number;
    interactionWeaknesses: number;
    interactionMissedOpportunities: number;
  };
}

interface ListItemEntry {
  id: string;
  addedAt: string;
  notes: string | null;
  interaction: InteractionInList;
}

interface ListDetail {
  id: string;
  name: string;
  description: string | null;
  visibility: "PERSONAL" | "PUBLIC";
  createdAt: string;
  items: ListItemEntry[];
  _count: { items: number };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "negative":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "PROCESSING":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "FAILED":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch(`/api/interaction-lists/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      setList(await res.json());
    } catch {
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRemove = async (interactionId: string) => {
    try {
      await fetch(`/api/interaction-lists/${params.id}/interactions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionId }),
      });
      fetchList();
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">List not found</p>
        <button
          onClick={() => router.push("/voice-jar/lists")}
          className="mt-2 text-violet-600 hover:text-violet-700 text-sm"
        >
          Back to Lists
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/voice-jar/lists")}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-violet-500" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {list.name}
            </h1>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              {list.visibility === "PERSONAL" ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {list.visibility.toLowerCase()}
            </span>
          </div>
          {list.description && (
            <p className="text-sm text-gray-500 mt-0.5">{list.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {list._count.items} interaction{list._count.items !== 1 ? "s" : ""} &middot; Created{" "}
            {new Date(list.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Empty */}
      {list.items.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <List className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No interactions in this list yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Add interactions from the interaction detail page
          </p>
        </div>
      )}

      {/* Interaction Cards */}
      {list.items.length > 0 && (
        <div className="space-y-2">
          {list.items.map((entry) => {
            const item = entry.interaction;
            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={item.status} />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/voice-jar/${item.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:text-violet-600 transition-colors">
                        {item.customerName || "Unknown Caller"}
                      </span>
                      {item.agentName && (
                        <span className="text-xs text-gray-400">
                          Agent: {item.agentName}
                        </span>
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
                      <span>
                        Added{" "}
                        {new Date(entry.addedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        Note: {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.score !== null && (
                      <div className="text-center">
                        <span
                          className={`text-lg font-bold ${
                            item.score >= 75
                              ? "text-green-600"
                              : item.score >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {item.score}
                        </span>
                        <span className="text-xs text-gray-400 block -mt-0.5">score</span>
                      </div>
                    )}
                    <SentimentIcon sentiment={item.sentiment} />
                    <div className="flex gap-1.5 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                        {item._count.interactionStrengths}S
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        {item._count.interactionWeaknesses}W
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                        {item._count.interactionMissedOpportunities}M
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Remove from list"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
