"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Loader2,
  X,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useVJAuth } from "../../VJAuthContext";
import { useRouter } from "next/navigation";

interface AgentItem {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  isActive: boolean;
  avgScore: number;
  totalCalls: number;
  createdAt: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useVJAuth();
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentItem | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) setAgents(await res.json());
    } catch {
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setDepartment("");
    setEditAgent(null);
    setShowCreate(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    try {
      const url = editAgent ? `/api/agents/${editAgent.id}` : "/api/agents";
      const method = editAgent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, department }),
      });
      if (res.ok) {
        toast.success(editAgent ? "Agent updated" : "Agent added");
        resetForm();
        fetchAgents();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `Failed to save agent (${res.status})`);
      }
    } catch (err) {
      toast.error("Failed to save agent: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setCreating(false);
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAgents((prev) => prev.filter((a) => a.id !== id));
      toast.success("Agent deleted");
    } catch {
      toast.error("Failed to delete agent");
    }
  };

  const startEdit = (agent: AgentItem) => {
    setEditAgent(agent);
    setName(agent.name);
    setEmail(agent.email || "");
    setDepartment(agent.department || "");
    setShowCreate(true);
  };

  if (!authLoading && !isAdmin) {
    router.push("/voice-jar");
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Management</h1>
            <p className="text-sm text-gray-500">Manage agents and view performance metrics</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      )}

      {!loading && agents.length === 0 && (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No agents yet</p>
          <p className="text-gray-400 text-xs mt-1">Add agents to track their performance</p>
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Avg Score</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total Calls</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{agent.email || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{agent.department || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold ${agent.avgScore >= 75 ? "text-green-600" : agent.avgScore >= 50 ? "text-amber-600" : agent.avgScore > 0 ? "text-red-600" : "text-gray-400"}`}>
                      {agent.avgScore > 0 ? agent.avgScore : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{agent.totalCalls}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(agent)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Edit className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                      <button onClick={() => deleteAgent(agent.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editAgent ? "Edit Agent" : "Add Agent"}</h3>
              <button onClick={resetForm}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-sky-300 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-sky-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-sky-300 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || creating}
                className="w-full py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Saving..." : editAgent ? "Update Agent" : "Add Agent"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
