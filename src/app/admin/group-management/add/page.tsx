"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { Plus } from "lucide-react";

export default function AddGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mt5GroupName, setMt5GroupName] = useState("");
  const [status, setStatus] = useState("Active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) { setError("Group name is required"); return; }
    if (!mt5GroupName.trim()) { setError("MT5 Group Name is required"); return; }

    setSubmitting(true);
    try {
      // Step 1: Validate MT5 group exists in MT5 Admin
      const mt5Res = await fetch("/api/mt5/groups");
      if (mt5Res.ok) {
        const mt5Groups = await mt5Res.json();
        const mt5List = Array.isArray(mt5Groups) ? mt5Groups : [];
        const exists = mt5List.some(
          (g: { name: string }) =>
            g.name.toLowerCase() === mt5GroupName.trim().toLowerCase()
        );
        if (!exists) {
          setError(
            `MT5 Group "${mt5GroupName.trim()}" does not exist in MT5 Admin. Please enter a valid MT5 Group Name.`
          );
          setSubmitting(false);
          return;
        }
      }

      // Step 2: Create group in CRM
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: mt5GroupName.trim(),
          leverage: "1:100",
          commission: null,
          isActive: status === "Active",
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create group"); return; }
      setSuccess("Group created successfully!");
      setName("");
      setMt5GroupName("");
      setTimeout(() => router.push("/admin/group-management/list"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally { setSubmitting(false); }
  };

  return (
    <PageShell title="Add Group" description="Create a new trading group" icon={Plus}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-2xl">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">{success}</div>}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
              placeholder="Enter group name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MT5 Group Name <span className="text-red-500">*</span></label>
            <input type="text" value={mt5GroupName} onChange={(e) => setMt5GroupName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
              placeholder="Enter MT5 Group Name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? "Creating..." : "Submit"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
