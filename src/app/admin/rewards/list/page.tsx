"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Trophy, Plus } from "lucide-react";

interface Reward { id: string; name: string; type: string; value: number; minDeposit: number | null; description: string | null; isActive: boolean; createdAt: string; }

export default function RewardListPage() {
  const [data, setData] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rewards").then((r) => r.ok ? r.json() : []).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch("/api/rewards", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) });
    setData((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !isActive } : r));
  };

  const columns = [
    { key: "name", label: "Reward Name" },
    { key: "type", label: "Type", render: (v: unknown) => <span className="capitalize">{String(v).replace(/_/g, " ")}</span> },
    { key: "value", label: "Value", render: (v: unknown) => `$${Number(v).toFixed(2)}` },
    { key: "minDeposit", label: "Min Deposit", render: (v: unknown) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
    { key: "isActive", label: "Status", render: (v: unknown, row: Record<string, unknown>) => (
      <button onClick={() => handleToggle(row.id as string, v as boolean)} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${v ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
        {v ? "Active" : "Inactive"}
      </button>
    )},
    { key: "createdAt", label: "Created", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
  ];

  if (loading) return <PageShell title="Reward List" description="Manage reward programs" icon={Trophy}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Reward List" description="Manage reward programs" icon={Trophy} actions={<Link href="/admin/rewards/create" className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Create Reward</Link>}>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search rewards..." emptyMessage="No rewards found" />
    </PageShell>
  );
}
