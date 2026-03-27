"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Gift } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "client", label: "Client" },
  { key: "amount", label: "Amount" },
  { key: "type", label: "Type", render: () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Debit</span>
  )},
  { key: "reason", label: "Reason" },
  { key: "date", label: "Date" },
];

export default function DebitBonusPage() {
  return (
    <PageShell title="Debit Bonus" description="Manage debit bonuses" icon={Gift}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search bonuses..." emptyMessage="No debit bonuses found" />
    </PageShell>
  );
}
