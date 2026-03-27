"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { Network, CheckCircle, AlertCircle, DollarSign, User, MessageSquare } from "lucide-react";

interface IBUser { id: string; name: string; email: string; availableCommission: number }

export default function IBWithdrawPage() {
  const [ibs, setIbs] = useState<IBUser[]>([]);
  const [userId, setUserId] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("wallet");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ib/users")
      .then((r) => r.json())
      .then((data) => setIbs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const selectedIB = ibs.find((ib) => ib.id === userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!userId || !amount || Number(amount) <= 0) {
      setError("Please select an IB and enter a valid amount"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ib_withdraw", userId, withdrawTo, amount: Number(amount), comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to process IB withdrawal"); return; }
      setSuccess(`Successfully withdrew $${Number(amount).toFixed(2)} from ${selectedIB?.name || "IB"}'s commission`);
      setUserId(""); setAmount(""); setComment("");
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="IB Withdraw" description="Manually process IB commission withdrawal" icon={Network}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
              <div><p className="font-semibold">IB Withdrawal Successful</p><p className="text-emerald-600 text-xs mt-0.5">{success}</p></div>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4 text-red-600" /></div>
              <div><p className="font-semibold">Error</p><p className="text-red-600 text-xs mt-0.5">{error}</p></div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
              <h3 className="text-white font-bold text-base">IB Commission Withdrawal</h3>
              <p className="text-indigo-100 text-xs mt-0.5">Process IB commission payout manually</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select IB <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white appearance-none">
                    <option value="">Please Choose...</option>
                    {ibs.map((ib) => <option key={ib.id} value={ib.id}>{ib.name} ({ib.email})</option>)}
                  </select>
                </div>
                {selectedIB && (
                  <p className="text-xs mt-1.5 bg-indigo-50 rounded-lg px-3 py-1.5 text-indigo-800">Available Commission: <span className="font-bold text-indigo-900">${selectedIB.availableCommission?.toFixed(2) || "0.00"}</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Withdraw Type <span className="text-red-500">*</span></label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white appearance-none">
                    <option value="commission">Commission</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Withdraw To <span className="text-red-500">*</span></label>
                  <select value={withdrawTo} onChange={(e) => setWithdrawTo(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white appearance-none">
                    <option value="wallet">Wallet</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter reason for IB withdrawal..." rows={3} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-semibold text-sm disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</>
                ) : (
                  <><Network className="w-4 h-4" /> Process IB Withdrawal</>
                )}
              </button>
            </div>
          </form>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
            <h4 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600" /> Important Notes
            </h4>
            <ul className="space-y-2 text-xs text-indigo-800">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> Commission is deducted from available balance</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> Wallet option credits to IB&apos;s wallet</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> Bank transfer creates a pending payout</li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" /> All actions are logged in audit trail</li>
            </ul>
          </div>
          {selectedIB && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h4 className="font-bold text-gray-900 text-sm mb-3">IB Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Name</span><span className="font-medium text-gray-900">{selectedIB.name}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Email</span><span className="font-medium text-gray-700">{selectedIB.email}</span></div>
                <div className="flex justify-between text-xs border-t border-gray-100 pt-2 mt-2"><span className="text-gray-500">Commission</span><span className="font-bold text-indigo-600">${selectedIB.availableCommission?.toFixed(2) || "0.00"}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
