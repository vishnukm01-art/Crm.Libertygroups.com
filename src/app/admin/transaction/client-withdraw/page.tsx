"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { ArrowUpFromLine, CheckCircle, AlertCircle, DollarSign, User, MessageSquare } from "lucide-react";

interface Client { id: string; name: string; email: string; mt5Account: string | null; walletBalance: number }

export default function ClientWithdrawPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [userId, setUserId] = useState("");
  const [withdrawFrom, setWithdrawFrom] = useState("wallet");
  const [withdrawTo, setWithdrawTo] = useState("cash");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : data.users || []))
      .catch(() => {});
  }, []);

  const selectedClient = clients.find((c) => c.id === userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!userId || !amount || Number(amount) <= 0) {
      setError("Please select a client and enter a valid amount"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "client_withdraw", userId, withdrawFrom, withdrawTo, amount: Number(amount), comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to process withdrawal"); return; }
      setSuccess(`Successfully withdrew $${Number(amount).toFixed(2)} from ${selectedClient?.name || "client"}`);
      setUserId(""); setAmount(""); setComment("");
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Client Withdraw" description="Manually withdraw funds from client account" icon={ArrowUpFromLine}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
              <div><p className="font-semibold">Withdrawal Successful</p><p className="text-emerald-600 text-xs mt-0.5">{success}</p></div>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4 text-red-600" /></div>
              <div><p className="font-semibold">Error</p><p className="text-red-600 text-xs mt-0.5">{error}</p></div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <h3 className="text-white font-bold text-base">Client Withdrawal</h3>
              <p className="text-orange-100 text-xs mt-0.5">Process a manual withdrawal from client account</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Client <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 bg-white appearance-none">
                    <option value="">Please Choose...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                  </select>
                </div>
                {selectedClient && (
                  <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-3 py-1.5">Wallet Balance: <span className="font-bold text-gray-900">${selectedClient.walletBalance?.toFixed(2) || "0.00"}</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Withdraw From <span className="text-red-500">*</span></label>
                  <select value={withdrawFrom} onChange={(e) => setWithdrawFrom(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 bg-white appearance-none">
                    <option value="wallet">Wallet</option>
                    <option value="mt5">MT5 Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Withdraw To <span className="text-red-500">*</span></label>
                  <select value={withdrawTo} onChange={(e) => setWithdrawTo(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 bg-white appearance-none">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter reason for withdrawal..." rows={3} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold text-sm disabled:opacity-50 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</>
                ) : (
                  <><ArrowUpFromLine className="w-4 h-4" /> Submit Withdrawal</>
                )}
              </button>
            </div>
          </form>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-100 p-5">
            <h4 className="font-bold text-orange-900 text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" /> Important Notes
            </h4>
            <ul className="space-y-2 text-xs text-orange-800">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" /> Ensure client has sufficient balance</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" /> Verify withdrawal destination details</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" /> All withdrawals are logged in audit trail</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" /> Amount is deducted from wallet immediately</li>
            </ul>
          </div>
          {selectedClient && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Client Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Name</span><span className="font-medium text-gray-900">{selectedClient.name}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Email</span><span className="font-medium text-gray-700">{selectedClient.email}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">MT5</span><span className="font-medium text-gray-700 font-mono">{selectedClient.mt5Account || "N/A"}</span></div>
                <div className="flex justify-between text-xs border-t border-gray-100 pt-2 mt-2"><span className="text-gray-500">Wallet</span><span className="font-bold text-emerald-600">${selectedClient.walletBalance?.toFixed(2) || "0.00"}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
