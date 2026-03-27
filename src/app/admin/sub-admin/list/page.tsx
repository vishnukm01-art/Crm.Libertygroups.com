"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { UserCog, Plus } from "lucide-react";

interface SubAdmin { id: string; name: string; email: string; permissions: string[]; isActive: boolean; createdAt: string; }

export default function AdminListPage() {
  const [data, setData] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = useCallback(async () => {
    try { const res = await fetch("/api/sub-admin"); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch("/api/sub-admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) });
    fetchAdmins();
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "permissions", label: "Permissions", render: (v: unknown) => {
      const perms = Array.isArray(v) ? v : [];
      return <span className="text-xs text-gray-500">{perms.length > 0 ? perms.join(", ") : "None"}</span>;
    }},
    { key: "isActive", label: "Status", render: (v: unknown) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{v ? "Active" : "Inactive"}</span>
    )},
    { key: "createdAt", label: "Created", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
    { key: "actions", label: "", render: (_: unknown, row: Record<string, unknown>) => (
      <button onClick={() => handleToggle(row.id as string, row.isActive as boolean)} className="text-xs text-sky-600 hover:text-sky-700 font-medium">
        {row.isActive ? "Deactivate" : "Activate"}
      </button>
    )},
  ];

  if (loading) return <PageShell title="Admin List" description="Manage sub-admin accounts" icon={UserCog}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Admin List" description="Manage sub-admin accounts" icon={UserCog} actions={<Link href="/admin/sub-admin/add" className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Add Admin</Link>}>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search admins..." emptyMessage="No sub-admins found" />
    </PageShell>
  );
}
