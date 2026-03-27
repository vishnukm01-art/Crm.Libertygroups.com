"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { FileText, Plus, X } from "lucide-react";

const defaultTemplates = [
  { id: "1", name: "Welcome Notification", type: "general", subject: "Welcome to Liberty Markets!", body: "Thank you for registering. Your account is now active.", lastModified: new Date().toISOString() },
  { id: "2", name: "KYC Approved", type: "kyc", subject: "KYC Verification Complete", body: "Your identity verification has been approved. You can now deposit and trade.", lastModified: new Date().toISOString() },
  { id: "3", name: "Deposit Confirmed", type: "deposit", subject: "Deposit Received", body: "Your deposit of {{amount}} has been received and credited to your MT5 account.", lastModified: new Date().toISOString() },
  { id: "4", name: "Withdrawal Processed", type: "withdraw", subject: "Withdrawal Completed", body: "Your withdrawal request of {{amount}} has been processed.", lastModified: new Date().toISOString() },
];

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState(defaultTemplates);
  const [editing, setEditing] = useState<typeof defaultTemplates[0] | null>(null);

  const columns = [
    { key: "name", label: "Template Name" },
    { key: "type", label: "Type", render: (v: unknown) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 capitalize">{String(v)}</span>
    )},
    { key: "subject", label: "Subject" },
    { key: "lastModified", label: "Last Modified", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
    { key: "actions", label: "Actions", render: (_: unknown, row: Record<string, unknown>) => (
      <button onClick={() => setEditing(row as any)} className="text-xs text-sky-600 hover:text-sky-700 font-medium">Edit</button>
    )},
  ];

  return (
    <PageShell
      title="Notification Templates"
      description="Manage notification templates"
      icon={FileText}
      actions={<button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setEditing({ id: "", name: "", type: "general", subject: "", body: "", lastModified: "" })}><Plus className="w-4 h-4" />New Template</button>}
    >
      <DataTable columns={columns} data={templates as unknown as Record<string, unknown>[]} searchPlaceholder="Search templates..." emptyMessage="No templates found" />

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editing.id ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea rows={4} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none" />
              </div>
              <button
                onClick={() => {
                  if (editing.id) {
                    setTemplates(templates.map((t) => t.id === editing.id ? { ...editing, lastModified: new Date().toISOString() } : t));
                  } else {
                    setTemplates([...templates, { ...editing, id: String(Date.now()), lastModified: new Date().toISOString() }]);
                  }
                  setEditing(null);
                }}
                className="btn-primary w-full"
              >
                {editing.id ? "Save Changes" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
