"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { CreditCard, Plus } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "name", label: "Method Name" },
  { key: "type", label: "Type" },
  { key: "minAmount", label: "Min Amount" },
  { key: "maxAmount", label: "Max Amount" },
  { key: "fee", label: "Fee" },
  { key: "status", label: "Status", render: (_: unknown, row: Record<string, unknown>) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
      {row.isActive !== false ? "Active" : "Inactive"}
    </span>
  )},
  { key: "actions", label: "Actions", render: () => (
    <button className="text-xs text-sky-600 hover:text-sky-700 font-medium">Edit</button>
  )},
];

export default function PaymentSettingsPage() {
  return (
    <PageShell
      title="Payment Methods"
      description="Configure deposit and withdrawal methods"
      icon={CreditCard}
      actions={<button className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Add Method</button>}
    >
      <DataTable columns={columns} data={[]} searchPlaceholder="Search payment methods..." emptyMessage="No payment methods configured" />
    </PageShell>
  );
}
