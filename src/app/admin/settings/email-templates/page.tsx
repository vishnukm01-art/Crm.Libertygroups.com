"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Mail, Plus } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Template Name" },
  { key: "subject", label: "Subject" },
  { key: "trigger", label: "Trigger" },
  { key: "lastModified", label: "Last Modified" },
  { key: "actions", label: "Actions", render: () => (
    <div className="flex items-center gap-2">
      <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">Edit</button>
      <button className="text-xs text-red-500 hover:text-red-600 font-medium">Delete</button>
    </div>
  )},
];

export default function EmailTemplatesPage() {
  return (
    <PageShell
      title="Email Templates"
      description="Manage email templates"
      icon={Mail}
      actions={<button className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />New Template</button>}
    >
      <DataTable columns={columns} data={[]} searchPlaceholder="Search templates..." emptyMessage="No email templates found" />
    </PageShell>
  );
}
