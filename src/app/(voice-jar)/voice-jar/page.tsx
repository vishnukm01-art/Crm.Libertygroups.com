"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Mic,
  Upload,
  Phone,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Bookmark,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface InteractionListItem {
  id: string;
  status: string;
  agentName: string | null;
  customerName: string | null;
  direction: string | null;
  duration: number | null;
  sentiment: string | null;
  score: number | null;
  isSaved: boolean;
  audioFileName: string | null;
  createdAt: string;
  _count: {
    interactionOutcomes: number;
    interactionStrengths: number;
    interactionWeaknesses: number;
    interactionMissedOpportunities: number;
  };
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

export default function VoiceJarPage() {
  const router = useRouter();
  const [interactions, setInteractions] = useState<InteractionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Upload form state
  const [agentName, setAgentName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [direction, setDirection] = useState("inbound");
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});

  // Agent autocomplete
  const [agentSuggestions, setAgentSuggestions] = useState<string[]>([]);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : []))
      .then((agents: Array<{ name: string }>) => setAgentSuggestions(agents.map((a) => a.name)))
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchInteractions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (searchDebounced) params.set("search", searchDebounced);
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));
      const res = await fetch(`/api/interactions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setInteractions(json.data);
        setTotal(json.total);
      }
    } catch {
      toast.error("Failed to load interactions");
    } finally {
      setLoading(false);
    }
  }, [filter, searchDebounced, page]);

  useEffect(() => {
    setLoading(true);
    fetchInteractions();
  }, [fetchInteractions]);

  // Auto-refresh if any are processing
  useEffect(() => {
    const hasProcessing = interactions.some(
      (i) => i.status === "PROCESSING" || i.status === "PENDING"
    );
    if (hasProcessing) {
      const interval = setInterval(fetchInteractions, 5000);
      return () => clearInterval(interval);
    }
  }, [interactions, fetchInteractions]);

  const toggleSaved = async (e: React.MouseEvent, id: string, currentlySaved: boolean) => {
    e.stopPropagation();
    try {
      await fetch(`/api/interactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved: !currentlySaved }),
      });
      setInteractions((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isSaved: !currentlySaved } : i))
      );
      toast.success(currentlySaved ? "Bookmark removed" : "Bookmark added");
    } catch {
      toast.error("Failed to update bookmark");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (audioFiles.length === 0) return;

    setUploading(true);
    const progress: Record<string, string> = {};
    const concurrency = 3;

    const uploadOne = async (file: File) => {
      progress[file.name] = "uploading";
      setUploadProgress((prev) => ({ ...prev, [file.name]: "uploading" }));

      try {
        const formData = new FormData();
        formData.append("audio", file);
        if (agentName) formData.append("agentName", agentName);
        if (customerName) formData.append("customerName", customerName);
        formData.append("direction", direction);

        const res = await fetch("/api/interactions", {
          method: "POST",
          body: formData,
        });

        progress[file.name] = res.ok ? "done" : "error";
      } catch {
        progress[file.name] = "error";
      }
      setUploadProgress((prev) => ({ ...prev, [file.name]: progress[file.name] }));
    };

    // Process files in parallel with concurrency limit
    const queue = [...audioFiles];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (file) await uploadOne(file);
      }
    });
    await Promise.all(workers);

    const errorCount = Object.values(progress).filter((s) => s === "error").length;
    const successCount = Object.values(progress).filter((s) => s === "done").length;
    if (successCount > 0) toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
    if (errorCount > 0) toast.error(`${errorCount} file${errorCount > 1 ? "s" : ""} failed to upload`);

    setUploading(false);
    setShowUpload(false);
    setAgentName("");
    setCustomerName("");
    setDirection("inbound");
    setAudioFiles([]);
    setUploadProgress({});
    fetchInteractions();
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (searchDebounced) params.set("search", searchDebounced);
    params.set("format", "csv");
    window.open(`/api/interactions/export?${params}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Voice Jar</h1>
          <p className="text-sm text-gray-500">AI-powered call analysis with strengths, weaknesses, and missed opportunities</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 flex-1">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
              setLoading(true);
            }}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-sky-300 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or transcript..."
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-sky-300 focus:outline-none"
            />
          </div>
          <span className="text-sm text-gray-500">
            {total} interaction{total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Call
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Call Recording{audioFiles.length > 1 ? "s" : ""}</h3>
              <button onClick={() => setShowUpload(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Audio File(s) *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => setAudioFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100"
                  required
                />
                {audioFiles.length > 1 && (
                  <p className="text-xs text-gray-500 mt-1">{audioFiles.length} files selected (bulk upload)</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => {
                      setAgentName(e.target.value);
                      setShowAgentDropdown(true);
                    }}
                    onFocus={() => setShowAgentDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAgentDropdown(false), 150)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-sky-300 focus:outline-none"
                    placeholder="e.g. John Smith"
                    autoComplete="off"
                  />
                  {showAgentDropdown && agentSuggestions.filter((n) => n.toLowerCase().includes(agentName.toLowerCase())).length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                      {agentSuggestions
                        .filter((n) => n.toLowerCase().includes(agentName.toLowerCase()))
                        .slice(0, 8)
                        .map((name) => (
                          <li
                            key={name}
                            onMouseDown={() => {
                              setAgentName(name);
                              setShowAgentDropdown(false);
                            }}
                            className="px-3 py-1.5 text-sm cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/30 text-gray-700 dark:text-gray-300"
                          >
                            {name}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-sky-300 focus:outline-none"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-sky-300 focus:outline-none"
                >
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </div>
              {/* Bulk upload progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(uploadProgress).map(([name, status]) => (
                    <div key={name} className="flex items-center gap-2 text-xs">
                      {status === "uploading" && <Loader2 className="h-3 w-3 animate-spin text-sky-500" />}
                      {status === "done" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      {status === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
                      <span className="truncate text-gray-600">{name}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="submit"
                disabled={audioFiles.length === 0 || uploading}
                className="w-full py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "Uploading..." : `Upload & Analyze${audioFiles.length > 1 ? ` (${audioFiles.length} files)` : ""}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      )}

      {/* Empty State */}
      {!loading && interactions.length === 0 && (
        <div className="text-center py-16">
          <Mic className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No interactions found</p>
          <p className="text-gray-400 text-xs mt-1">
            {search ? "Try a different search term" : "Upload a call recording to get started"}
          </p>
        </div>
      )}

      {/* Interactions List */}
      {!loading && interactions.length > 0 && (
        <div className="space-y-2">
          {interactions.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/voice-jar/${item.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-sky-300 dark:hover:border-sky-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <StatusIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
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
                  {item._count && (
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
                  )}
                  <button
                    onClick={(e) => toggleSaved(e, item.id, item.isSaved)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    title={item.isSaved ? "Remove bookmark" : "Bookmark"}
                  >
                    <Bookmark className={`h-4 w-4 ${item.isSaved ? "text-amber-500 fill-amber-500" : "text-gray-400"}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= total}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
