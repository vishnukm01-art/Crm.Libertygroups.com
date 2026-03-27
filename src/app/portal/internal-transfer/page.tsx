"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeftRight, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown,
} from "lucide-react";

interface Mt5Acc {
  id: string;
  mt5Login: string;
  mt5Group: string;
  leverage: string;
  isDefault: boolean;
  balance: number;
  equity: number;
}

interface Transfer {
  id: string;
  amount: number;
  currency: string;
  status: string;
  fromMt5Login: string | null;
  toMt5Login: string | null;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

const statusIcon = (status: string) => {
  if (status === "approved" || status === "completed") return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === "rejected") return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

export default function InternalTransferPage() {
  const [mt5Accounts, setMt5Accounts] = useState<Mt5Acc[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const [mt5Res, trRes] = await Promise.all([
        fetch(`/api/portal/mt5-accounts?userId=${userId}`),
        fetch(`/api/portal/internal-transfers?userId=${userId}`),
      ]);
      if (mt5Res.ok) {
        const accounts = await mt5Res.json();
        setMt5Accounts(accounts);
        if (accounts.length > 0 && !fromAccountId) setFromAccountId(accounts[0].id);
        if (accounts.length > 1 && !toAccountId) setToAccountId(accounts[1].id);
      }
      if (trRes.ok) setTransfers(await trRes.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fromAccount = mt5Accounts.find((a) => a.id === fromAccountId);
  const toAccount = mt5Accounts.find((a) => a.id === toAccountId);
  const availableToAccounts = mt5Accounts.filter((a) => a.id !== fromAccountId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!fromAccountId) { setError("Please select a source account"); return; }
    if (!toAccountId) { setError("Please select a destination account"); return; }
    if (fromAccountId === toAccountId) { setError("Source and destination must be different"); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return; }
    if (fromAccount && parseFloat(amount) > fromAccount.balance) {
      setError("Insufficient balance in source account"); return;
    }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/portal/internal-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fromMt5AccountId: fromAccountId,
          toMt5AccountId: toAccountId,
          amount: parseFloat(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Transfer failed"); return; }
      setSuccess(`Transfer of $${parseFloat(amount).toLocaleString()} completed successfully!`);
      setAmount("");
      fetchData();
    } catch { setError("An error occurred"); } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><ArrowLeftRight className="w-5 h-5 text-indigo-600" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Internal Transfer</h1><p className="text-sm text-gray-500">Transfer funds between your MT5 accounts</p></div>
      </div>
      <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20"><ArrowLeftRight className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Internal Transfer</h1><p className="text-sm text-gray-500">Transfer funds between your MT5 accounts</p></div>
      </div>

      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{success}</span></div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

      {mt5Accounts.length < 2 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <ArrowLeftRight className="w-7 h-7 text-indigo-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">You need at least 2 MT5 accounts to make internal transfers.</p>
          <p className="text-xs text-gray-400 mt-1">Create additional MT5 accounts from your profile page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-indigo-500" />New Transfer
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* From Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Account <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select value={fromAccountId} onChange={(e) => { setFromAccountId(e.target.value); if (e.target.value === toAccountId) setToAccountId(""); }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white">
                    <option value="">Select source account</option>
                    {mt5Accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.mt5Login} ({acc.mt5Group}) - ${acc.balance.toLocaleString()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {fromAccount && (
                  <p className="text-xs text-gray-500 mt-1">Available: <span className="font-medium text-gray-700">${fromAccount.balance.toLocaleString()}</span></p>
                )}
              </div>

              {/* To Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Account <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white">
                    <option value="">Select destination account</option>
                    {availableToAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.mt5Login} ({acc.mt5Group}) - ${acc.balance.toLocaleString()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {toAccount && (
                  <p className="text-xs text-gray-500 mt-1">Current balance: <span className="font-medium text-gray-700">${toAccount.balance.toLocaleString()}</span></p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Amount (USD) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                  <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter amount" />
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full px-4 py-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Transferring...</> : <><ArrowLeftRight className="w-4 h-4" />Transfer Funds</>}
              </button>
            </form>
          </div>

          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 h-fit">
            <h3 className="font-semibold text-sky-900 text-sm mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />About Internal Transfers</h3>
            <ul className="space-y-2 text-xs text-sky-800">
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" /><span>Transfers between your own MT5 accounts are instant and free.</span></li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" /><span>The transfer amount is debited from the source account and credited to the destination.</span></li>
              <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" /><span>You can only transfer up to the available balance in the source account.</span></li>
            </ul>
          </div>
        </div>
      )}

      {/* Transfer History */}
      {transfers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Transfer History</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">From</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr></thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{t.fromMt5Login || "-"}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{t.toMt5Login || "-"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">${t.amount.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(t.status)}`}>{statusIcon(t.status)} {t.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
