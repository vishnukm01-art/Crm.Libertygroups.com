"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Target } from "lucide-react";

interface Partner { id: string; name: string; code: string; }

export default function CampaignsPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketing/partners")
      .then((r) => r.ok ? r.json() : [])
      .then(setPartners)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Generate campaign data from partners
  const campaigns = partners.map((p) => ({
    id: p.id,
    name: `${p.name} Campaign`,
    partner: p.name,
    code: p.code,
    leads: 0,
    conversions: 0,
    status: "active",
  }));

  const columns = [
    { key: "name", label: "Campaign Name" },
    { key: "partner", label: "Partner" },
    { key: "code", label: "Code" },
    { key: "leads", label: "Leads" },
    { key: "conversions", label: "Conversions" },
    { key: "status", label: "Status", render: (v: unknown) => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${v === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{String(v)}</span>
    )},
  ];

  if (loading) return <PageShell title="Campaigns" description="Marketing campaigns overview" icon={Target}><div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div></PageShell>;

  return (
    <PageShell title="Campaigns" description="Marketing campaigns overview" icon={Target}>
      <DataTable columns={columns} data={campaigns as unknown as Record<string, unknown>[]} searchPlaceholder="Search campaigns..." emptyMessage="No campaigns found. Add marketing partners first." />
    </PageShell>
  );
}
