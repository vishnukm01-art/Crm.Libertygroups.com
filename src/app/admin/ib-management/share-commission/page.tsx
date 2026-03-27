"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/PageShell";
import { DollarSign, Search, Send, Users, Wallet, X, CheckCircle } from "lucide-react";

interface IBUser {
  id: string; name: string; email: string; availableCommission: number; totalCommission: number;
}

interface Client {
  id: string; name: string; email: string; walletBalance: number;
}

export default function ShareCommissionPage() {
  const [ibUsers, setIBUsers] = useState<IBUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIB, setSelectedIB] = useState<IBUser | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState("");
  const [ibSearch, setIBSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState<{ id: string; ibName: string; recipientName: string; amount: number; createdAt: string }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [ibRes, clientRes, historyRes] = await Promise.all([
        fetch("/api/ib/users"),
        fetch("/api/users?role=client"),
        fetch("/api/ib/share-commission?type=history"),
      ]);
      if (ibRes.ok) setIBUsers(await ibRes.json());
      if (clientRes.ok) setClients(await clientRes.json());
      if (historyRes.ok) {
        const data = await historyRes.json();
        if (Array.isArray(data)) setHistory(data);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleShare = async () => {
    if (!selectedIB || !selectedClient || !amount) {
      setError("Please select IB, recipient, and enter amount");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { setError("Enter a valid positive amount"); return; }
    if (amountNum > selectedIB.availableCommission) { setError("Amount exceeds available commission"); return; }

    setSending(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/ib/share-commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ibUserId: selectedIB.id, recipientUserId: selectedClient.id, amount: amountNum }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to share commission");
        return;
      }
      setSuccess(`Successfully shared $${amountNum.toFixed(2)} from ${selectedIB.name} to ${selectedClient.name}`);
      setAmount("");
      setSelectedIB(null);
      setSelectedClient(null);
      fetchData();
    } catch { setError("An error occurred"); } finally { setSending(false); }
  };

  const filteredIBs = ibUsers.filter((u) => u.name.toLowerCase().includes(ibSearch.toLowerCase()) || u.email.toLowerCase().includes(ibSearch.toLowerCase()));
  const filteredClients = clients.filter((u) => u.name.toLowerCase().includes(clientSearch.toLowerCase()) || u.email.toLowerCase().includes(clientSearch.toLowerCase()));

  if (loading) return (
    <PageShell title="IB Commission Sharing" description="Share IB commission with referrals" icon={DollarSign}>
      <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
    </PageShell>
  );

  return (
    <PageShell title="IB Commission Sharing" description="IB can offer commission amount in dollars to referrals" icon={DollarSign}>
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5" />{success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Select IB */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center font-bold">1</span>
            Select IB User
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={ibSearch} onChange={(e) => setIBSearch(e.target.value)} placeholder="Search IB..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredIBs.map((ib) => (
              <button key={ib.id} onClick={() => setSelectedIB(ib)}
                className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${selectedIB?.id === ib.id ? "border-sky-300 bg-sky-50" : "border-gray-100 hover:bg-gray-50"}`}>
                <div className="font-medium text-gray-900">{ib.name}</div>
                <div className="text-xs text-gray-500">{ib.email}</div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <Wallet className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">Available: ${ib.availableCommission.toFixed(2)}</span>
                </div>
              </button>
            ))}
            {filteredIBs.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No IB users found</p>}
          </div>
        </div>

        {/* Step 2: Select Recipient */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center font-bold">2</span>
            Select Recipient (Referral)
          </h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search client..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-sky-300 focus:outline-none" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredClients.map((client) => (
              <button key={client.id} onClick={() => setSelectedClient(client)}
                className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${selectedClient?.id === client.id ? "border-sky-300 bg-sky-50" : "border-gray-100 hover:bg-gray-50"}`}>
                <div className="font-medium text-gray-900">{client.name}</div>
                <div className="text-xs text-gray-500">{client.email}</div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <Wallet className="w-3 h-3 text-sky-500" />
                  <span className="text-sky-600">Balance: ${client.walletBalance?.toFixed(2) || "0.00"}</span>
                </div>
              </button>
            ))}
            {filteredClients.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No clients found</p>}
          </div>
        </div>

        {/* Step 3: Enter Amount & Submit */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs flex items-center justify-center font-bold">3</span>
            Share Commission
          </h3>

          {selectedIB && (
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 mb-3">
              <p className="text-xs text-sky-600">From IB</p>
              <p className="text-sm font-semibold text-sky-900">{selectedIB.name}</p>
              <p className="text-xs text-sky-700 mt-1">Available: ${selectedIB.availableCommission.toFixed(2)}</p>
            </div>
          )}

          {selectedClient && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-3">
              <p className="text-xs text-emerald-600">To Referral</p>
              <p className="text-sm font-semibold text-emerald-900">{selectedClient.name}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="Enter amount" />
            </div>
          </div>

          <button onClick={handleShare} disabled={sending || !selectedIB || !selectedClient || !amount}
            className="w-full px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />{sending ? "Processing..." : "Share Commission"}
          </button>
        </div>
      </div>

      {/* Recent sharing history */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Commission Shares</h3>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No commission sharing history yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IB Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Recipient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{h.ibName}</td>
                  <td className="px-4 py-3 text-gray-700">{h.recipientName}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">${h.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(h.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
