"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { UserRoundPlus } from "lucide-react";

interface User { id: string; name: string; email: string; isIB: boolean; ibParent?: { name: string } | null; }

export default function MoveClientToIBPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [ibId, setIbId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.ok ? r.json() : []).then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const clients = users.filter((u) => !u.isIB);
  const ibs = users.filter((u) => u.isIB);
  const selectedClient = users.find((u) => u.id === clientId);

  const handleSubmit = async () => {
    if (!clientId || !ibId) { setError("Please select both client and IB"); return; }
    setError(""); setMessage("");
    const res = await fetch("/api/ib/move-client", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: clientId, newIbId: ibId }),
    });
    if (res.ok) { setMessage("Client moved successfully"); setClientId(""); setIbId(""); }
    else { const data = await res.json(); setError(data.error || "Failed to move client"); }
  };

  return (
    <PageShell title="Move Client to IB" description="Reassign a client to a different introducing broker" icon={UserRoundPlus}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up">
        {message && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-100">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Client <span className="text-red-500">*</span></label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none bg-white">
              <option value="">Please Choose...</option>
              {clients.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
            {selectedClient?.ibParent && <p className="text-xs text-gray-500 mt-1">Current IB: {selectedClient.ibParent.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select IB <span className="text-red-500">*</span></label>
            <select value={ibId} onChange={(e) => setIbId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-sky-300 focus:outline-none bg-white">
              <option value="">Please Choose...</option>
              {ibs.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleSubmit} className="mt-6 px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors">Submit</button>
      </div>
    </PageShell>
  );
}
