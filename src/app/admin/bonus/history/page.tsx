"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { History } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "client", label: "Client" },
  { key: "type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "reason", label: "Reason" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
];

export default function BonusHistoryPage() {
  return (
    <PageShell title="Bonus History" description="View all bonus transactions" icon={History}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search bonus history..." emptyMessage="No bonus history found" />
    </PageShell>
  );
}
