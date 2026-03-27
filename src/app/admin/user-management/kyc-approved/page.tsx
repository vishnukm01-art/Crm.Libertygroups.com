"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { CheckCircle } from "lucide-react";

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "documentType", label: "Document Type" },
  { key: "approvedAt", label: "Approved Date" },
  { key: "status", label: "Status", render: () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Approved</span>
  )},
  { key: "actions", label: "Actions", render: () => (
    <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">View</button>
  )},
];

export default function KYCApprovedPage() {
  return (
    <PageShell title="KYC Approved" description="Clients with approved KYC documents" icon={CheckCircle}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search approved KYC..." emptyMessage="No approved KYC documents" />
    </PageShell>
  );
}
