"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Clock,
  User,
  Headphones,
  FileText,
  BarChart3,
  Loader2,
  ListPlus,
  Check,
  X,
} from "lucide-react";
import { AudioPlayerProvider } from "./components/AudioPlayerContext";
import AudioPlayer from "./components/AudioPlayer";
import TranscriptTab from "./components/TranscriptTab";
import StructuredSummary from "./components/StructuredSummary";
import AnalysisSidebar from "./components/AnalysisSidebar";
import type { AnalysisItem } from "./components/AnalysisItemList";

interface Interaction {
  id: string;
  type: string;
  status: string;
  agentName: string | null;
  customerName: string | null;
  direction: string | null;
  duration: number | null;
  sentiment: string | null;
  score: number | null;
  transcript: string | null;
  transcriptJson: Array<{ start: number; end: number; text: string }> | null;
  summaryJson: Record<string, unknown> | null;
  audioUrl: string | null;
  audioFileName: string | null;
  autoFailed: boolean;
  failReason: string | null;
  createdAt: string;
  interactionOutcomes: AnalysisItem[];
  interactionStrengths: AnalysisItem[];
  interactionWeaknesses: AnalysisItem[];
  interactionMissedOpportunities: AnalysisItem[];
}

interface ListOption {
  id: string;
  name: string;
  visibility: string;
  _count: { items: number };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.PENDING}`}
    >
      {status === "PROCESSING" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {status}
    </span>
  );
}

type Tab = "transcript" | "summary";

export default function InteractionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  // Add to list state
  const [showListPicker, setShowListPicker] = useState(false);
  const [lists, setLists] = useState<ListOption[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [addedToLists, setAddedToLists] = useState<Set<string>>(new Set());

  const fetchInteraction = useCallback(async () => {
    try {
      const res = await fetch(`/api/interactions/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setInteraction(data);
    } catch {
      setInteraction(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchInteraction();
  }, [fetchInteraction]);

  // Auto-refresh while processing
  useEffect(() => {
    if (interaction?.status === "PROCESSING" || interaction?.status === "PENDING") {
      const interval = setInterval(fetchInteraction, 5000);
      return () => clearInterval(interval);
    }
  }, [interaction?.status, fetchInteraction]);

  const fetchLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const res = await fetch("/api/interaction-lists");
      if (res.ok) setLists(await res.json());
    } catch {
      /* ignore */
    } finally {
      setListsLoading(false);
    }
  }, []);

  const openListPicker = () => {
    setShowListPicker(true);
    fetchLists();
  };

  const addToList = async (listId: string) => {
    if (!interaction) return;
    setAddingToList(listId);
    try {
      const res = await fetch(`/api/interaction-lists/${listId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionId: interaction.id }),
      });
      if (res.ok) {
        setAddedToLists((prev) => new Set(prev).add(listId));
      }
    } catch {
      /* ignore */
    } finally {
      setAddingToList(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!interaction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Interaction not found</p>
        <button
          onClick={() => router.push("/voice-jar")}
          className="mt-2 text-sky-600 hover:text-sky-700 text-sm"
        >
          Back to Voice Jar
        </button>
      </div>
    );
  }

  return (
    <AudioPlayerProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/voice-jar")}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {interaction.customerName || "Unknown Caller"}{" "}
              {interaction.agentName && (
                <span className="text-gray-400 font-normal">
                  &mdash; Agent: {interaction.agentName}
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <StatusBadge status={interaction.status} />
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {interaction.direction || "inbound"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(interaction.duration)}
              </span>
              <span>
                {new Date(interaction.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
          {/* Add to List button */}
          <div className="relative">
            <button
              onClick={openListPicker}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 border border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/30 rounded-lg transition-colors"
            >
              <ListPlus className="h-4 w-4" />
              Add to List
            </button>

            {/* List picker dropdown */}
            {showListPicker && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Add to List
                  </span>
                  <button onClick={() => setShowListPicker(false)}>
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {listsLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                    </div>
                  )}
                  {!listsLoading && lists.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      <p>No lists yet</p>
                      <button
                        onClick={() => router.push("/voice-jar/lists")}
                        className="text-violet-600 hover:text-violet-700 text-xs mt-1"
                      >
                        Create a list first
                      </button>
                    </div>
                  )}
                  {!listsLoading &&
                    lists.map((list) => {
                      const isAdded = addedToLists.has(list.id);
                      const isAdding = addingToList === list.id;
                      return (
                        <button
                          key={list.id}
                          onClick={() => !isAdded && addToList(list.id)}
                          disabled={isAdded || isAdding}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                            isAdded
                              ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                              : "text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-950/20"
                          }`}
                        >
                          <span className="flex-1 truncate">{list.name}</span>
                          <span className="text-xs text-gray-400">
                            {list._count.items}
                          </span>
                          {isAdding && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                          )}
                          {isAdded && (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audio Player */}
        <AudioPlayer src={interaction.audioUrl} />

        {/* Failure notice */}
        {interaction.status === "FAILED" && interaction.failReason && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">Processing Failed</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{interaction.failReason}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Center Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "summary"
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab("transcript")}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "transcript"
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Transcript
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === "summary" && (
                  <StructuredSummary
                    summaryJson={interaction.summaryJson as Record<string, unknown> | null}
                    outcomes={interaction.interactionOutcomes}
                    strengths={interaction.interactionStrengths}
                    weaknesses={interaction.interactionWeaknesses}
                    missedOpportunities={interaction.interactionMissedOpportunities}
                  />
                )}
                {activeTab === "transcript" && (
                  <TranscriptTab
                    transcript={interaction.transcript}
                    segments={interaction.transcriptJson}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div>
            <AnalysisSidebar
              sentiment={interaction.sentiment}
              score={interaction.score}
              outcomes={interaction.interactionOutcomes}
              strengths={interaction.interactionStrengths}
              weaknesses={interaction.interactionWeaknesses}
              missedOpportunities={interaction.interactionMissedOpportunities}
            />

            {/* Interaction Meta */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Details</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  <span>Customer: {interaction.customerName || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Agent: {interaction.agentName || "Unknown"}</span>
                </div>
                {interaction.audioFileName && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate">{interaction.audioFileName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AudioPlayerProvider>
  );
}
