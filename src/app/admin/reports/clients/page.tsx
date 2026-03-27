"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Users } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "country", label: "Country" },
  { key: "registeredAt", label: "Registered" },
  { key: "deposits", label: "Total Deposits" },
  { key: "withdrawals", label: "Total Withdrawals" },
  { key: "status", label: "Status" },
];

export default function ClientReportPage() {
  return (
    <PageShell title="Client Report" description="Comprehensive client analysis" icon={Users}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search clients..." emptyMessage="No data available" />
    </PageShell>
  );
}
