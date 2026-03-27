"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { XCircle } from "lucide-react";

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "documentType", label: "Document Type" },
  { key: "rejectedAt", label: "Rejected Date" },
  { key: "reason", label: "Reason" },
  { key: "status", label: "Status", render: () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>
  )},
  { key: "actions", label: "Actions", render: () => (
    <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">Review</button>
  )},
];

export default function KYCRejectedPage() {
  return (
    <PageShell title="KYC Rejected" description="Clients with rejected KYC documents" icon={XCircle}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search rejected KYC..." emptyMessage="No rejected KYC documents" />
    </PageShell>
  );
}
