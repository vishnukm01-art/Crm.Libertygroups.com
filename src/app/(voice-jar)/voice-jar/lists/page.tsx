"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  List,
  Plus,
  X,
  Trash2,
  Eye,
  Lock,
  Globe,
  Loader2,
} from "lucide-react";

interface ListItem {
  id: string;
  name: string;
  description: string | null;
  visibility: "PERSONAL" | "PUBLIC";
  createdAt: string;
  _count: { items: number };
}

type Tab = "all" | "personal" | "public";

export default function ManageListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibility, setNewVisibility] = useState<"PERSONAL" | "PUBLIC">("PERSONAL");
  const [creating, setCreating] = useState(false);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("tab", activeTab);
      const res = await fetch(`/api/interaction-lists?${params}`);
      if (res.ok) {
        setLists(await res.json());
      }
    } catch {
      toast.error("Failed to load lists");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/interaction-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || null,
          visibility: newVisibility,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
        setNewVisibility("PERSONAL");
        fetchLists();
        toast.success("List created");
      }
    } catch {
      toast.error("Failed to create list");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete list "${name}"? This will not delete the interactions.`)) return;
    try {
      await fetch(`/api/interaction-lists/${id}`, { method: "DELETE" });
      fetchLists();
      toast.success("List deleted");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All Lists" },
    { key: "personal", label: "Personal" },
    { key: "public", label: "Public" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
          <List className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Lists</h1>
          <p className="text-sm text-gray-500">Lists let you organize interactions. By default lists are private, but they can be shared with your team and made public.</p>
        </div>
      </div>
      {/* Tabs + Create Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create new list
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New List</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  List Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-violet-400 focus:outline-none"
                  placeholder="e.g. Not followed SOP"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-violet-400 focus:outline-none resize-none"
                  rows={2}
                  placeholder="Optional description for this list"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Visibility
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="PERSONAL"
                      checked={newVisibility === "PERSONAL"}
                      onChange={() => setNewVisibility("PERSONAL")}
                      className="accent-violet-600"
                    />
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                    Personal
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="PUBLIC"
                      checked={newVisibility === "PUBLIC"}
                      onChange={() => setNewVisibility("PUBLIC")}
                      className="accent-violet-600"
                    />
                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                    Public
                  </label>
                </div>
              </div>
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="w-full py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? "Creating..." : "Create List"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && lists.length === 0 && (
        <div className="text-center py-16">
          <List className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No lists yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Create a list to start organizing interactions by categories
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && lists.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500">List Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Interactions</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Created At</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {lists.map((list) => (
                <tr
                  key={list.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/voice-jar/lists/${list.id}`)}
                      className="text-gray-900 dark:text-gray-100 font-medium hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-left"
                    >
                      {list.name}
                    </button>
                    {list.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                        {list.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {list.visibility === "PERSONAL" ? (
                        <>
                          <Lock className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-500">Personal</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-3 w-3 text-blue-400" />
                          <span className="text-blue-600">Public</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-medium rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                      {list._count.items}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(list.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/voice-jar/lists/${list.id}`)}
                        className="p-1.5 text-gray-400 hover:text-violet-600 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                        title="View list"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(list.id, list.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete list"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
