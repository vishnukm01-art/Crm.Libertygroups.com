"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Ticket } from "lucide-react";

interface TicketItem { id: string; subject: string; message: string; status: string; priority: string; userName: string; userEmail: string; createdAt: string; }

export default function TicketsPage() {
  const [data, setData] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchTickets();
    } catch { /* ignore */ }
  };

  const columns = [
    { key: "subject", label: "Subject" },
    { key: "userName", label: "Client" },
    { key: "priority", label: "Priority", render: (v: unknown) => {
      const p = String(v || "medium");
      const colors: Record<string, string> = { low: "bg-gray-100 text-gray-600", medium: "bg-amber-100 text-amber-700", high: "bg-red-100 text-red-700" };
      return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors[p] || colors.medium}`}>{p}</span>;
    }},
    { key: "status", label: "Status", render: (_: unknown, row: Record<string, unknown>) => {
      const s = String(row.status || "open");
      return (
        <select
          value={s}
          onChange={(e) => handleStatusChange(row.id as string, e.target.value)}
          className="text-xs px-2 py-1 rounded-lg border border-gray-200 focus:border-sky-300 focus:outline-none"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
      );
    }},
    { key: "createdAt", label: "Created", render: (v: unknown) => new Date(String(v)).toLocaleDateString() },
    { key: "actions", label: "", render: (_: unknown, row: Record<string, unknown>) => (
      <button onClick={() => alert(`Message: ${row.message}`)} className="text-xs text-sky-600 hover:text-sky-700 font-medium">View</button>
    )},
  ];

  if (loading) {
    return (
      <PageShell title="Tickets" description="Support ticket management" icon={Ticket}>
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Tickets" description="Support ticket management" icon={Ticket}>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search tickets..." emptyMessage="No tickets found" />
    </PageShell>
  );
}
