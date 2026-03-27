"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowUpFromLine, Clock, CheckCircle, XCircle, Building,
  AlertCircle, ChevronDown, AlertTriangle,
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

interface BankDetail {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
}

interface BalanceInfo {
  balance: number;
  equity: number;
  hasOpenPositions: boolean;
  openPositionCount: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  reference: string;
  notes: string | null;
  adminComment: string | null;
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

export default function PortalWithdrawPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [banks, setBanks] = useState<BankDetail[]>([]);
  const [mt5Accounts, setMt5Accounts] = useState<Mt5Acc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [mt5AccountId, setMt5AccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [bankDetailId, setBankDetailId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Balance / position check state for selected account
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const [wRes, bRes, mt5Res] = await Promise.all([
        fetch(`/api/portal/withdrawals?userId=${userId}`),
        fetch(`/api/portal/bank-details?userId=${userId}`),
        fetch(`/api/portal/mt5-accounts?userId=${userId}`),
      ]);
      if (wRes.ok) setWithdrawals(await wRes.json());
      if (bRes.ok) {
        const allBanks = await bRes.json();
        setBanks(allBanks.filter((b: BankDetail) => b.status === "approved"));
      }
      if (mt5Res.ok) {
        const accounts = await mt5Res.json();
        setMt5Accounts(accounts);
        const def = accounts.find((a: Mt5Acc) => a.isDefault);
        if (def) setMt5AccountId(def.id);
        else if (accounts.length > 0) setMt5AccountId(accounts[0].id);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // When MT5 account selection changes, check balance and open positions
  useEffect(() => {
    if (!mt5AccountId) {
      setBalanceInfo(null);
      return;
    }
    const checkBalance = async () => {
      setCheckingBalance(true);
      try {
        const userId = localStorage.getItem("portalUserId") || "demo";
        const res = await fetch(`/api/portal/mt5-accounts/${mt5AccountId}/balance?userId=${userId}`);
        if (res.ok) {
          setBalanceInfo(await res.json());
        }
      } catch { /* ignore */ } finally {
        setCheckingBalance(false);
      }
    };
    checkBalance();
  }, [mt5AccountId]);

  const selectedAccount = mt5Accounts.find((a) => a.id === mt5AccountId);
  const availableBalance = balanceInfo?.balance ?? selectedAccount?.balance ?? 0;
  const hasOpenPositions = balanceInfo?.hasOpenPositions ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!mt5AccountId) { setError("Please select an MT5 account"); return; }
    if (hasOpenPositions) { setError("Cannot withdraw: this account has open positions. Close all trades first."); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return; }
    if (parseFloat(amount) > availableBalance) { setError("Insufficient balance in selected MT5 account"); return; }
    if (!bankDetailId) { setError("Select a bank account"); return; }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/portal/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mt5AccountId, amount: parseFloat(amount), bankDetailId, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit"); return; }
      setSuccess(`Withdrawal submitted! Reference: ${data.reference}`);
      setAmount(""); setBankDetailId(""); setNotes("");
      fetchData();
    } catch { setError("An error occurred"); } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><ArrowUpFromLine className="w-5 h-5 text-red-600" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Withdraw Funds</h1><p className="text-sm text-gray-500">Withdraw from your MT5 trading account</p></div>
      </div>
      <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-md shadow-red-500/20"><ArrowUpFromLine className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-2xl font-bold text-gray-900">Withdraw Funds</h1><p className="text-sm text-gray-500">Withdraw from your MT5 trading account</p></div>
      </div>

      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm flex items-start gap-2"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{success}</span></div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><ArrowUpFromLine className="w-4 h-4 text-red-500" />Withdrawal Request</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* MT5 Account Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Withdraw From (MT5 Account) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={mt5AccountId}
                    onChange={(e) => setMt5AccountId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white"
                  >
                    <option value="">{mt5Accounts.length === 0 ? "No MT5 accounts" : "Select MT5 account"}</option>
                    {mt5Accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.mt5Login} ({acc.mt5Group}, {acc.leverage}) - ${acc.balance.toLocaleString()}{acc.isDefault ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {mt5Accounts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No MT5 accounts found. Please create one first.</p>
                )}
              </div>

              {/* Balance + Position Status */}
              {mt5AccountId && (
                <div className={`rounded-xl p-4 border ${hasOpenPositions ? "bg-red-50 border-red-200" : "bg-sky-50 border-sky-100"}`}>
                  {checkingBalance ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      Checking account balance...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-medium uppercase ${hasOpenPositions ? "text-red-600" : "text-sky-600"}`}>
                            Withdrawable Balance
                          </p>
                          <p className={`text-2xl font-bold ${hasOpenPositions ? "text-red-900" : "text-sky-900"}`}>
                            ${availableBalance.toLocaleString()}
                          </p>
                        </div>
                        {balanceInfo && (
                          <div className="text-right text-xs text-gray-500">
                            <p>Equity: ${balanceInfo.equity.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                      {hasOpenPositions && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-red-700">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>This account has {balanceInfo?.openPositionCount || ""} open position{(balanceInfo?.openPositionCount || 0) !== 1 ? "s" : ""}. Close all trades before withdrawing.</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Amount (USD) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                  <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Enter amount" />
                </div>
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={bankDetailId} onChange={(e) => setBankDetailId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white">
                    <option value="">Select bank account</option>
                    {banks.map((b) => <option key={b.id} value={b.id}>{b.bankName} - ****{b.accountNumber.slice(-4)}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {banks.length === 0 && <p className="text-xs text-amber-600 mt-1">No approved bank accounts. Please add bank details first.</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none" placeholder="Additional notes..." />
              </div>

              {/* Submit */}
              <button type="submit" disabled={submitting || banks.length === 0 || hasOpenPositions || mt5Accounts.length === 0}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Submitting...</> : <><ArrowUpFromLine className="w-4 h-4" />Submit Withdrawal</>}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
            <h3 className="font-semibold text-sky-900 text-sm mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" />How Withdrawals Work</h3>
            <ol className="space-y-2 text-xs text-sky-800">
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">1</span><span>Select the MT5 account to withdraw from. All open positions must be closed.</span></li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">2</span><span>Enter the withdrawal amount and select your bank account.</span></li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">3</span><span>Submit the withdrawal request for admin review.</span></li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-sky-200 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">4</span><span>Funds will be transferred to your bank within 1-3 business days.</span></li>
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Building className="w-4 h-4 text-sky-500" />Your Bank Accounts</h3>
            {banks.length === 0 ? (
              <p className="text-sm text-gray-400">No approved bank accounts yet.</p>
            ) : (
              <div className="space-y-3">
                {banks.map((bank) => (
                  <div key={bank.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="font-medium text-gray-900 text-sm">{bank.bankName}</p>
                    <p className="text-xs text-gray-500 mt-1">{bank.accountName} - ****{bank.accountNumber.slice(-4)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {withdrawals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Recent Withdrawals</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comment</th>
              </tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{w.reference || "-"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">${w.amount.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(w.status)}`}>{statusIcon(w.status)} {w.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(w.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{w.adminComment || "-"}</td>
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
