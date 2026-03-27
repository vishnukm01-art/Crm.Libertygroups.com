"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Link as LinkIcon } from "lucide-react";

export default function TrackingLinksPage() {
  const [ibUsers, setIbUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ib/users")
      .then((r) => r.ok ? r.json() : [])
      .then(setIbUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const links = ibUsers
    .filter((u) => u.referralLink)
    .map((u) => ({
      id: u.id,
      name: `${u.name} Referral`,
      url: u.referralLink,
      partner: u.name,
      clients: u.totalClients || 0,
      createdAt: u.createdAt,
    }));

  const columns = [
    { key: "name", label: "Link Name" },
    { key: "url", label: "URL", render: (v: unknown) => (
      <span className="text-xs text-sky-600 truncate max-w-[200px] block">{String(v)}</span>
    )},
    { key: "partner", label: "Partner/IB" },
    { key: "clients", label: "Referrals" },
    { key: "createdAt", label: "Created", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
  ];

  if (loading) return <PageShell title="Tracking Links" description="Manage marketing tracking links" icon={LinkIcon}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Tracking Links" description="IB referral and tracking links" icon={LinkIcon}>
      <DataTable columns={columns} data={links as unknown as Record<string, unknown>[]} searchPlaceholder="Search tracking links..." emptyMessage="No tracking links found. IB referral links appear here when IBs are created." />
    </PageShell>
  );
}
