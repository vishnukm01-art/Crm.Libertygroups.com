"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { ArrowDownToLine, CheckCircle, AlertCircle, DollarSign, User, Monitor, MessageSquare } from "lucide-react";

interface Client { id: string; name: string; email: string; mt5Account: string | null }

export default function ClientDepositPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [userId, setUserId] = useState("");
  const [mt5Id, setMt5Id] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.users || [];
        setClients(list);
      })
      .catch(() => {});
  }, []);

  const selectedClient = clients.find((c) => c.id === userId);

  useEffect(() => {
    if (selectedClient?.mt5Account) setMt5Id(selectedClient.mt5Account);
  }, [selectedClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!userId || !amount || Number(amount) <= 0) {
      setError("Please select a client and enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "client_deposit", userId, mt5Id, amount: Number(amount), comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to process deposit"); return; }
      setSuccess(`Successfully deposited $${Number(amount).toFixed(2)} to ${selectedClient?.name || "client"}`);
      setUserId(""); setMt5Id(""); setAmount(""); setComment("");
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Client Deposit" description="Manually deposit funds to client account" icon={ArrowDownToLine}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div><p className="font-semibold">Deposit Successful</p><p className="text-emerald-600 text-xs mt-0.5">{success}</p></div>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div><p className="font-semibold">Error</p><p className="text-red-600 text-xs mt-0.5">{error}</p></div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <h3 className="text-white font-bold text-base">New Client Deposit</h3>
              <p className="text-emerald-100 text-xs mt-0.5">Fund a client&apos;s trading account directly</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Client <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 bg-white appearance-none">
                    <option value="">Please Choose...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select MT5 ID <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Monitor className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={mt5Id} onChange={(e) => setMt5Id(e.target.value)} placeholder="MT5 Account ID" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter comment or reason for deposit..." rows={3} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-semibold text-sm disabled:opacity-50 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</>
                ) : (
                  <><ArrowDownToLine className="w-4 h-4" /> Submit Deposit</>
                )}
              </button>
            </div>
          </form>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-2xl border border-emerald-100 p-5">
            <h4 className="font-bold text-emerald-900 text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600" /> Instructions
            </h4>
            <ul className="space-y-2 text-xs text-emerald-800">
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">1</span> Select the client from the dropdown</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">2</span> Enter or confirm the MT5 Account ID</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">3</span> Enter the deposit amount in USD</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">4</span> Add a comment and submit</li>
            </ul>
          </div>
          {selectedClient && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Client Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Name</span><span className="font-medium text-gray-900">{selectedClient.name}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Email</span><span className="font-medium text-gray-700">{selectedClient.email}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">MT5</span><span className="font-medium text-gray-700 font-mono">{selectedClient.mt5Account || "N/A"}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
