"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  LayoutGrid,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  BarChart3,
  CheckCircle2,
  Activity,
} from "lucide-react";

interface Stats {
  totalCount: number;
  completedCount: number;
  completionRate: number;
  avgScore: number;
  sentimentBreakdown: Record<string, number>;
  agents: Array<{ name: string; avgScore: number; totalCalls: number }>;
}

interface ActivityItem {
  id: string;
  action: string;
  userName: string | null;
  interactionId: string | null;
  details: string | null;
  createdAt: string;
}

export default function OverviewsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch("/api/interactions/stats"),
        fetch("/api/vj-activity-logs?limit=10"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivities(data.data || []);
      }
    } catch {
      toast.error("Failed to load overview data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const totalSentiment =
    stats.sentimentBreakdown.positive + stats.sentimentBreakdown.neutral + stats.sentimentBreakdown.negative || 1;

  const topAgents = stats.agents.slice(0, 5);
  const bottomAgents = [...stats.agents].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Overviews</h1>
          <p className="text-sm text-gray-500">High-level summary of call analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs uppercase font-semibold">Total Interactions</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs uppercase font-semibold">Average Score</span>
          </div>
          <p className={`text-3xl font-bold ${stats.avgScore >= 75 ? "text-green-600" : stats.avgScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {stats.avgScore}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs uppercase font-semibold">Completion Rate</span>
          </div>
          <p className="text-3xl font-bold text-violet-600">{stats.completionRate}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-xs uppercase font-semibold">Sentiment</span>
          </div>
          <div className="flex gap-3 mt-1">
            <div className="text-center">
              <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />
              <span className="text-sm font-bold text-green-600">{Math.round((stats.sentimentBreakdown.positive / totalSentiment) * 100)}%</span>
            </div>
            <div className="text-center">
              <Minus className="h-4 w-4 text-gray-400 mx-auto" />
              <span className="text-sm font-bold text-gray-600">{Math.round((stats.sentimentBreakdown.neutral / totalSentiment) * 100)}%</span>
            </div>
            <div className="text-center">
              <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />
              <span className="text-sm font-bold text-red-600">{Math.round((stats.sentimentBreakdown.negative / totalSentiment) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Top Agents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Top Agents
          </h3>
          {topAgents.length === 0 && <p className="text-sm text-gray-400">No agent data yet</p>}
          <div className="space-y-2">
            {topAgents.map((agent, i) => (
              <div key={agent.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{agent.name}</span>
                </div>
                <span className={`text-sm font-bold ${agent.avgScore >= 75 ? "text-green-600" : agent.avgScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {agent.avgScore}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Agents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Needs Improvement
          </h3>
          {bottomAgents.length === 0 && <p className="text-sm text-gray-400">No agent data yet</p>}
          <div className="space-y-2">
            {bottomAgents.map((agent, i) => (
              <div key={agent.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">#{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{agent.name}</span>
                </div>
                <span className={`text-sm font-bold ${agent.avgScore >= 75 ? "text-green-600" : agent.avgScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {agent.avgScore}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-500" />
            Recent Activity
          </h3>
          {activities.length === 0 && <p className="text-sm text-gray-400">No activity yet</p>}
          <div className="space-y-2">
            {activities.map((item) => (
              <div key={item.id} className="text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">{item.action.replace(/_/g, " ")}</span>
                {item.userName && <span className="text-gray-400"> by {item.userName}</span>}
                <span className="block text-gray-400 mt-0.5">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
