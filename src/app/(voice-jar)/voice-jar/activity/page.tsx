"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  Loader2,
  Upload,
  Bookmark,
  Trash2,
  ClipboardCheck,
  RotateCcw,
  ListPlus,
  Eye,
  Users,
  FileText,
  Bell,
} from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  userId: string | null;
  userName: string | null;
  interactionId: string | null;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  UPLOAD: Upload,
  SAVED: Bookmark,
  UNSAVED: Bookmark,
  SOFT_DELETED: Trash2,
  RESTORED: RotateCcw,
  PERMANENT_DELETED: Trash2,
  EVALUATION_COMPLETED: ClipboardCheck,
  EVALUATION_DELETED: ClipboardCheck,
  ADDED_TO_LIST: ListPlus,
  STATUS_CHANGE: Activity,
  TEMPLATE_CREATED: FileText,
  TEMPLATE_UPDATED: FileText,
  TEMPLATE_DELETED: FileText,
  AGENT_CREATED: Users,
  AGENT_UPDATED: Users,
  AGENT_DELETED: Users,
  ALERT_RULE_CREATED: Bell,
  ALERT_RULE_UPDATED: Bell,
  ALERT_RULE_DELETED: Bell,
};

const ACTION_COLORS: Record<string, string> = {
  UPLOAD: "text-sky-500 bg-sky-50 dark:bg-sky-950/30",
  SAVED: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  UNSAVED: "text-gray-500 bg-gray-50 dark:bg-gray-800",
  SOFT_DELETED: "text-red-500 bg-red-50 dark:bg-red-950/30",
  RESTORED: "text-green-500 bg-green-50 dark:bg-green-950/30",
  PERMANENT_DELETED: "text-red-600 bg-red-50 dark:bg-red-950/30",
  EVALUATION_COMPLETED: "text-violet-500 bg-violet-50 dark:bg-violet-950/30",
  EVALUATION_DELETED: "text-violet-400 bg-violet-50 dark:bg-violet-950/30",
  ADDED_TO_LIST: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30",
  STATUS_CHANGE: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  TEMPLATE_CREATED: "text-teal-500 bg-teal-50 dark:bg-teal-950/30",
  TEMPLATE_UPDATED: "text-teal-500 bg-teal-50 dark:bg-teal-950/30",
  TEMPLATE_DELETED: "text-teal-400 bg-teal-50 dark:bg-teal-950/30",
  AGENT_CREATED: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30",
  AGENT_UPDATED: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30",
  AGENT_DELETED: "text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30",
  ALERT_RULE_CREATED: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
  ALERT_RULE_UPDATED: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
  ALERT_RULE_DELETED: "text-orange-400 bg-orange-50 dark:bg-orange-950/30",
};

export default function ActivityLogsPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30", offset: String(offset) });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/vj-activity-logs?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (offset === 0) {
          setActivities(json.data);
        } else {
          setActivities((prev) => [...prev, ...json.data]);
        }
        setTotal(json.total);
      }
    } catch {
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, [offset, actionFilter]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const loadMore = () => {
    setOffset((prev) => prev + 30);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Logs</h1>
            <p className="text-sm text-gray-500">Audit trail of all Voice Jar actions</p>
          </div>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setOffset(0);
          }}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none"
        >
          <option value="">All Actions</option>
          <option value="UPLOAD">Upload</option>
          <option value="EVALUATION_COMPLETED">Evaluation Completed</option>
          <option value="EVALUATION_DELETED">Evaluation Deleted</option>
          <option value="SAVED">Saved</option>
          <option value="SOFT_DELETED">Deleted</option>
          <option value="RESTORED">Restored</option>
          <option value="PERMANENT_DELETED">Permanently Deleted</option>
          <option value="ADDED_TO_LIST">Added to List</option>
          <option value="TEMPLATE_CREATED">Template Created</option>
          <option value="TEMPLATE_UPDATED">Template Updated</option>
          <option value="TEMPLATE_DELETED">Template Deleted</option>
          <option value="AGENT_CREATED">Agent Created</option>
          <option value="AGENT_UPDATED">Agent Updated</option>
          <option value="AGENT_DELETED">Agent Deleted</option>
          <option value="ALERT_RULE_CREATED">Alert Rule Created</option>
          <option value="ALERT_RULE_UPDATED">Alert Rule Updated</option>
          <option value="ALERT_RULE_DELETED">Alert Rule Deleted</option>
        </select>
      </div>

      {loading && activities.length === 0 && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-center py-16">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No activity logs yet</p>
          <p className="text-gray-400 text-xs mt-1">Actions like uploads, evaluations, and bookmarks will appear here</p>
        </div>
      )}

      {activities.length > 0 && (
        <div className="space-y-1">
          {activities.map((item) => {
            const Icon = ACTION_ICONS[item.action] || Activity;
            const colorClass = ACTION_COLORS[item.action] || "text-gray-500 bg-gray-50";

            return (
              <div key={item.id} className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-medium">{item.action.replace(/_/g, " ")}</span>
                    {item.userName && <span className="text-gray-500"> by {item.userName}</span>}
                  </p>
                  {item.details && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.details}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {item.interactionId && (
                  <button
                    onClick={() => router.push(`/voice-jar/${item.interactionId}`)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                    title="View interaction"
                  >
                    <Eye className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            );
          })}

          {activities.length < total && (
            <div className="text-center pt-2">
              <button
                onClick={loadMore}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load More ({total - activities.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
