"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings,
  Plus,
  Loader2,
  X,
  Trash2,
  Bell,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useVJAuth } from "../../VJAuthContext";

interface AlertRule {
  id: string;
  type: string;
  threshold: number | null;
  recipientEmail: string;
  isActive: boolean;
  createdAt: string;
}

const RULE_TYPES = [
  { value: "LOW_SCORE", label: "Low Score", description: "Alert when call score is below threshold" },
  { value: "NEGATIVE_SENTIMENT", label: "Negative Sentiment", description: "Alert on negative sentiment detection" },
  { value: "FAILED_PROCESSING", label: "Failed Processing", description: "Alert when audio processing fails" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useVJAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [ruleType, setRuleType] = useState("LOW_SCORE");
  const [threshold, setThreshold] = useState("50");
  const [recipientEmail, setRecipientEmail] = useState("");

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/vj-alert-rules");
      if (res.ok) setRules(await res.json());
    } catch {
      toast.error("Failed to load alert rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;
    setCreating(true);

    try {
      const res = await fetch("/api/vj-alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: ruleType,
          threshold: ruleType === "LOW_SCORE" ? parseInt(threshold) : null,
          recipientEmail,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setRuleType("LOW_SCORE");
        setThreshold("50");
        setRecipientEmail("");
        fetchRules();
        toast.success("Alert rule created");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Failed to create alert rule (${res.status})`);
      }
    } catch (err) {
      toast.error("Failed to create alert rule: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setCreating(false);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    try {
      await fetch(`/api/vj-alert-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
      );
    } catch {
      toast.error("Failed to update rule");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/vj-alert-rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Alert rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  if (!authLoading && !isAdmin) {
    router.push("/voice-jar");
    return null;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 text-white shadow-md">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500">Configure alerts and notification rules</p>
        </div>
      </div>

      {/* Email Alert Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-500" />
            Email Alert Rules
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-600 border border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/30 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Rule
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        )}

        {!loading && rules.length === 0 && (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No alert rules configured</p>
            <p className="text-xs text-gray-400 mt-1">Add rules to get notified about low scores or negative sentiment</p>
          </div>
        )}

        {!loading && rules.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {rules.map((rule) => {
              const typeInfo = RULE_TYPES.find((t) => t.value === rule.type);
              return (
                <div key={rule.id} className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => toggleRule(rule)} className="flex-shrink-0">
                    {rule.isActive ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-300" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${rule.isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
                      {typeInfo?.label || rule.type}
                      {rule.threshold !== null && <span className="text-gray-400 font-normal"> (below {rule.threshold})</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{rule.recipientEmail}</p>
                  </div>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Alert Rule</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alert Type</label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none"
                >
                  {RULE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {RULE_TYPES.find((t) => t.value === ruleType)?.description}
                </p>
              </div>
              {ruleType === "LOW_SCORE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score Threshold</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none"
                    min={0}
                    max={100}
                    placeholder="Alert when score is below this value"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none"
                  required
                  placeholder="alerts@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={!recipientEmail || creating}
                className="w-full py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating..." : "Create Rule"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
