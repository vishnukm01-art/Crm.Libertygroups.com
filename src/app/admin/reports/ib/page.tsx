"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Network } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "ibName", label: "IB Name" },
  { key: "clients", label: "Clients" },
  { key: "totalDeposits", label: "Total Deposits" },
  { key: "commission", label: "Commission Earned" },
  { key: "withdrawals", label: "Commission Withdrawn" },
  { key: "balance", label: "Balance" },
];

export default function IBReportPage() {
  return (
    <PageShell title="IB Report" description="Introducing Broker performance reports" icon={Network}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search IB reports..." emptyMessage="No IB data available" />
    </PageShell>
  );
}
