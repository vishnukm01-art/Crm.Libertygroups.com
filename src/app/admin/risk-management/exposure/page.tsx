"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { AlertTriangle } from "lucide-react";

const columns = [
  { key: "symbol", label: "Symbol" },
  { key: "totalBuy", label: "Total Buy" },
  { key: "totalSell", label: "Total Sell" },
  { key: "netExposure", label: "Net Exposure" },
  { key: "accounts", label: "Accounts" },
  { key: "riskLevel", label: "Risk Level", render: (_: unknown, row: Record<string, unknown>) => {
    const level = String(row.riskLevel || "low");
    const colors: Record<string, string> = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-red-100 text-red-700" };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.low}`}>{level}</span>;
  }},
];

export default function ExposureReportPage() {
  return (
    <PageShell title="Exposure Report" description="Market exposure analysis" icon={AlertTriangle}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search exposure data..." emptyMessage="No exposure data available" />
    </PageShell>
  );
}
