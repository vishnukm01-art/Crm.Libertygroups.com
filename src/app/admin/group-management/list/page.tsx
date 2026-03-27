"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Layers, RefreshCw } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  leverage: string | null;
  commission: number | null;
  isActive: boolean;
  users: number;
  createdAt: string;
}

const columns = [
  { key: "name", label: "Group Name" },
  { key: "leverage", label: "Leverage", render: (v: unknown) => String(v ?? "-") },
  {
    key: "commission",
    label: "Commission",
    render: (v: unknown) => (v != null ? `$${Number(v).toFixed(2)}` : "-"),
  },
  { key: "users", label: "Users" },
  {
    key: "isActive",
    label: "Status",
    render: (_: unknown, row: Record<string, unknown>) => (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.isActive
            ? "bg-emerald-100 text-emerald-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {row.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    render: (v: unknown) =>
      v ? new Date(String(v)).toLocaleDateString() : "-",
  },
];

export default function GroupListPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const fetchGroups = async (sync = false) => {
    try {
      if (sync) setSyncing(true);
      else setLoading(true);
      setError("");

      const url = sync ? "/api/admin/groups?sync=true" : "/api/admin/groups";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch groups");

      const data = await res.json();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <PageShell title="Group List" description="Manage trading groups" icon={Layers}>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => fetchGroups(true)}
          disabled={syncing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing from MT5..." : "Sync from MT5"}
        </button>
        <a href="/admin/group-management/add" className="btn-primary text-sm">
          + Add Group
        </a>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          Loading groups...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={groups as unknown as Record<string, unknown>[]}
          searchPlaceholder="Search groups..."
          emptyMessage="No groups found. Click 'Sync from MT5' to import groups from the trading server."
        />
      )}
    </PageShell>
  );
}
