"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { FileCheck } from "lucide-react";

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "documentType", label: "Document Type" },
  { key: "submittedAt", label: "Submitted Date" },
  { key: "status", label: "Status", render: () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
  )},
  { key: "actions", label: "Actions", render: () => (
    <div className="flex items-center gap-2">
      <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">Approve</button>
      <button className="text-xs text-red-500 hover:text-red-600 font-medium">Reject</button>
    </div>
  )},
];

export default function KYCPendingPage() {
  return (
    <PageShell title="KYC Pending" description="Review and approve pending KYC documents" icon={FileCheck}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search by name or email..." emptyMessage="No pending KYC requests" />
    </PageShell>
  );
}
