"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUpFromLine, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown, Search, DollarSign } from "lucide-react";

interface BankDetail { id: string; bankName: string; accountNumber: string; accountName: string; status: string; }
interface Withdrawal { id: string; amount: number; status: string; reference: string; adminComment: string | null; createdAt: string; }

const statusBadge = (status: string) => ({ approved: "bg-emerald-100 text-emerald-700", completed: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" }[status] || "bg-gray-100 text-gray-600");

export default function IBWithdrawPage() {
  const [data, setData] = useState<{ availableCommission: number; withdrawals: Withdrawal[] } | null>(null);
  const [banks, setBanks] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankDetailId, setBankDetailId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async (f?: string, t?: string) => {
    const userId = localStorage.getItem("portalUserId") || "demo";
    let url = `/api/portal/ib-withdraw?userId=${userId}`;
    if (f) url += `&from=${f}`;
    if (t) url += `&to=${t}`;
    const [wRes, bRes] = await Promise.all([
      fetch(url).then((r) => r.ok ? r.json() : null),
      fetch(`/api/portal/bank-details?userId=${userId}`).then((r) => r.ok ? r.json() : []),
    ]);
    if (wRes) setData(wRes);
    setBanks(bRes.filter((b: BankDetail) => b.status === "approved"));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(from, to); }, [fetchData]);

  const handleSearch = () => { setLoading(true); fetchData(from, to); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return; }
    if (parseFloat(amount) > (data?.availableCommission || 0)) { setError("Insufficient commission balance"); return; }
    setSubmitting(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/portal/ib-withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, amount: parseFloat(amount), bankDetailId, notes }) });
      const result = await res.json();
      if (!res.ok) { setError(result.error || "Failed"); return; }
      setSuccess(`IB Withdrawal submitted! Ref: ${result.reference}`);
      setAmount(""); setBankDetailId(""); setNotes("");
      fetchData(from, to);
    } catch { setError("An error occurred"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20"><ArrowUpFromLine className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">IB Withdraw</h1><p className="text-sm text-gray-500">Withdraw your earned commissions</p></div></div>

      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 mt-0.5" />{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
            <p className="text-xs text-purple-600 font-medium uppercase">Available Commission</p>
            <p className="text-2xl font-bold text-purple-900">${(data?.availableCommission || 0).toLocaleString()}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD) <span className="text-red-500">*</span></label>
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter amount" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
              <div className="relative"><select value={bankDetailId} onChange={(e) => setBankDetailId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none appearance-none bg-white">
                <option value="">Select bank account</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.bankName} - ****{b.accountNumber.slice(-4)}</option>)}
              </select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none resize-none" /></div>
            <button type="submit" disabled={submitting} className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Submitting...</> : <><DollarSign className="w-4 h-4" />Submit IB Withdrawal</>}
            </button>
          </form>
        </div>

        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Withdraw Report</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none" /></div>
              <button onClick={handleSearch} className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-1"><Search className="w-4 h-4" />Search</button>
            </div>
          </div>

          {!data?.withdrawals?.length ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No transactions yet!</p></div> : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
            </tr></thead><tbody>
              {data.withdrawals.map((w) => (<tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(w.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-900 font-medium">${w.amount.toFixed(2)}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(w.status)}`}>{w.status === "approved" || w.status === "completed" ? <CheckCircle className="w-3 h-3" /> : w.status === "rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{w.status}</span></td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{w.reference}</td>
              </tr>))}
            </tbody></table></div></div>
          )}
        </div>
      </div>
    </div>
  );
}
