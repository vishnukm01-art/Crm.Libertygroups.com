"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Gift } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "client", label: "Client" },
  { key: "amount", label: "Amount" },
  { key: "type", label: "Type", render: () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Credit</span>
  )},
  { key: "reason", label: "Reason" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", render: () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">Active</span>
  )},
];

export default function CreditBonusPage() {
  return (
    <PageShell title="Credit Bonus" description="Manage credit bonuses for clients" icon={Gift}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search bonuses..." emptyMessage="No credit bonuses found" />
    </PageShell>
  );
}
