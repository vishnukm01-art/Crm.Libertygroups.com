"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { ArrowLeftRight, CheckCircle, AlertCircle, DollarSign, User, MessageSquare, ArrowRight } from "lucide-react";

interface Account { id: string; name: string; email: string; walletBalance: number }

export default function InternalTransferPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setAccounts(Array.isArray(data) ? data : data.users || []))
      .catch(() => {});
  }, []);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!fromId || !toId || fromId === toId) {
      setError("Please select different from and to accounts"); return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter a valid amount"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "internal_transfer", userId: fromId, toAccountId: toId, amount: Number(amount), comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to process transfer"); return; }
      setSuccess(`Successfully transferred $${Number(amount).toFixed(2)} from ${fromAccount?.name || "source"} to ${toAccount?.name || "destination"}`);
      setFromId(""); setToId(""); setAmount(""); setComment("");
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Internal Transfer" description="Transfer funds between accounts" icon={ArrowLeftRight}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
              <div><p className="font-semibold">Transfer Successful</p><p className="text-emerald-600 text-xs mt-0.5">{success}</p></div>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4 text-red-600" /></div>
              <div><p className="font-semibold">Error</p><p className="text-red-600 text-xs mt-0.5">{error}</p></div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-600 px-6 py-4">
              <h3 className="text-white font-bold text-base">Internal Fund Transfer</h3>
              <p className="text-cyan-100 text-xs mt-0.5">Move funds between client wallets</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">From Account <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 bg-white appearance-none">
                      <option value="">Select source...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  {fromAccount && (
                    <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-3 py-1.5">Balance: <span className="font-bold">${fromAccount.walletBalance?.toFixed(2) || "0.00"}</span></p>
                  )}
                </div>
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-600 self-center mb-2">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">To Account <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select value={toId} onChange={(e) => setToId(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 bg-white appearance-none">
                      <option value="">Select destination...</option>
                      {accounts.filter((a) => a.id !== fromId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  {toAccount && (
                    <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-3 py-1.5">Balance: <span className="font-bold">${toAccount.walletBalance?.toFixed(2) || "0.00"}</span></p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment..." rows={3} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 resize-none" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-xl hover:from-cyan-600 hover:to-teal-700 transition-all font-semibold text-sm disabled:opacity-50 shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 active:scale-[0.98] flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</>
                ) : (
                  <><ArrowLeftRight className="w-4 h-4" /> Execute Transfer</>
                )}
              </button>
            </div>
          </form>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 p-5">
            <h4 className="font-bold text-teal-900 text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-teal-600" /> Transfer Rules
            </h4>
            <ul className="space-y-2 text-xs text-teal-800">
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-teal-200 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">1</span> Select source and destination accounts</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-teal-200 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">2</span> Source must have sufficient balance</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-teal-200 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">3</span> Both wallets update atomically</li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-teal-200 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">4</span> Transfers are recorded in transaction log</li>
            </ul>
          </div>
          {(fromAccount || toAccount) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h4 className="font-bold text-gray-900 text-sm mb-3">Transfer Summary</h4>
              <div className="space-y-2">
                {fromAccount && <div className="flex justify-between text-xs"><span className="text-gray-500">From</span><span className="font-medium text-gray-900">{fromAccount.name}</span></div>}
                {toAccount && <div className="flex justify-between text-xs"><span className="text-gray-500">To</span><span className="font-medium text-gray-900">{toAccount.name}</span></div>}
                {amount && Number(amount) > 0 && <div className="flex justify-between text-xs border-t border-gray-100 pt-2 mt-2"><span className="text-gray-500">Amount</span><span className="font-bold text-teal-600">${Number(amount).toFixed(2)}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
