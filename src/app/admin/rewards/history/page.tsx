"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { History } from "lucide-react";

export default function RewardHistoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch bonus history as reward claims
    fetch("/api/bonus")
      .then((r) => r.ok ? r.json() : [])
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "userName", label: "Client" },
    { key: "userEmail", label: "Email" },
    { key: "type", label: "Type", render: (v: unknown) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${v === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{String(v)}</span>
    )},
    { key: "amount", label: "Amount", render: (v: unknown) => `$${Number(v).toFixed(2)}` },
    { key: "reason", label: "Reason", render: (v: unknown) => String(v || "-") },
    { key: "status", label: "Status", render: (v: unknown) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 capitalize">{String(v)}</span>
    )},
    { key: "createdAt", label: "Date", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
  ];

  if (loading) return <PageShell title="Reward History" description="View all reward claims" icon={History}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Reward History" description="View all reward claims and bonus history" icon={History}>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search reward history..." emptyMessage="No reward history found" />
    </PageShell>
  );
}
