"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  recipients: number;
  createdAt: string;
}

export default function AllNotificationsPage() {
  const [data, setData] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "title", label: "Title" },
    { key: "message", label: "Message", render: (v: unknown) => (
      <span className="truncate max-w-[200px] block">{String(v || "-")}</span>
    )},
    { key: "type", label: "Type", render: (v: unknown) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 capitalize">{String(v)}</span>
    )},
    { key: "recipients", label: "Recipients" },
    { key: "createdAt", label: "Date", render: (v: unknown) => new Date(String(v)).toLocaleString() },
  ];

  if (loading) {
    return (
      <PageShell title="All Notifications" description="View all system notifications" icon={Bell}>
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
      </PageShell>
    );
  }

  return (
    <PageShell title="All Notifications" description="View all system notifications" icon={Bell}>
      <DataTable columns={columns} data={data as unknown as Record<string, unknown>[]} searchPlaceholder="Search notifications..." emptyMessage="No notifications found" />
    </PageShell>
  );
}
