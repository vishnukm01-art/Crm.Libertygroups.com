"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet, FileCheck, Building, TrendingUp, Clock, AlertCircle,
  CheckCircle, XCircle, ArrowDownToLine, ArrowUpFromLine, ArrowRight,
  Shield, CreditCard, Users, Plus, Star, ArrowLeftRight
} from "lucide-react";

interface Mt5AccountInfo {
  id: string;
  mt5Login: string;
  mt5Group: string;
  leverage: string;
  isDefault: boolean;
  balance: number;
  equity: number;
  margin?: number;
  freeMargin?: number;
}

interface PortalData {
  user: {
    name: string; email: string; phone: string; country: string;
    status: string; kycStatus: string; walletBalance: number; mt5Account: string;
    isIB: boolean; totalCommission: number; availableCommission: number;
  };
  mt5Accounts?: Mt5AccountInfo[];
  totalBalance?: number;
  recentTransactions: { id: string; type: string; amount: number; status: string; createdAt: string }[];
  pendingDocuments: number;
  pendingBankDetails: number;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    active: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function PortalDashboard() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("portalUserId");
    if (userId) {
      fetch(`/api/portal/dashboard?userId=${userId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          setData(d);
          if (d?.user?.isIB) {
            try {
              const stored = localStorage.getItem("portalUser");
              if (stored) {
                const u = JSON.parse(stored);
                if (!u.isIB) {
                  u.isIB = true;
                  localStorage.setItem("portalUser", JSON.stringify(u));
                }
              }
            } catch { /* ignore */ }
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setData({
        user: {
          name: "Demo User", email: "demo@liberty.com", phone: "+1234567890",
          country: "United States", status: "active", kycStatus: "pending",
          walletBalance: 5000, mt5Account: "MT5-100234", isIB: false,
          totalCommission: 0, availableCommission: 0,
        },
        recentTransactions: [],
        pendingDocuments: 2,
        pendingBankDetails: 1,
      });
      setLoading(false);
    }
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-12 text-gray-500">Unable to load dashboard data.</div>
  );

  const kycLabel = data.user.kycStatus.charAt(0).toUpperCase() + data.user.kycStatus.slice(1);
  const statusLabel = data.user.status.charAt(0).toUpperCase() + data.user.status.slice(1);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <p className="text-sky-100 text-sm font-medium">Welcome back,</p>
          <h1 className="text-2xl font-bold mt-1">{data.user.name}</h1>
          <p className="text-sky-200 text-sm mt-1">Your account overview and recent activity</p>
        </div>
      </div>

      {/* Alert banners */}
      {data.user.kycStatus === "pending" && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">KYC Verification Pending</p>
            <p className="text-xs text-amber-700 mt-0.5">Please upload your identity documents to verify your account and enable full features.</p>
          </div>
          <Link href="/portal/documents" className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors flex-shrink-0">
            Verify <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {data.pendingBankDetails > 0 && (
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
            <Building className="w-4.5 h-4.5 text-sky-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-sky-900">Bank Details Required</p>
            <p className="text-xs text-sky-700 mt-0.5">Add your bank details to enable withdrawals.</p>
          </div>
          <Link href="/portal/bank-details" className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600 transition-colors flex-shrink-0">
            Add <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-sky-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Balance</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${(data.totalBalance ?? data.user.walletBalance).toLocaleString()}</p>
            {(data.mt5Accounts?.length ?? 0) > 0 && (
              <p className="text-xs text-gray-400 mt-1">Across {data.mt5Accounts!.length} account{data.mt5Accounts!.length !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${data.user.kycStatus === "approved" ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20" : "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/20"}`}>
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">KYC Status</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kycLabel}</p>
          </div>
        </div>

        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${data.user.status === "active" ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20" : "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/20"}`}>
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Status</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statusLabel}</p>
          </div>
        </div>

        <div className="stat-card bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">MT5 Accounts</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.mt5Accounts?.length ?? (data.user.mt5Account ? 1 : 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Max 5 accounts</p>
          </div>
        </div>
      </div>

      {/* MT5 Accounts Grid */}
      {data.mt5Accounts && data.mt5Accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-sky-500" />
              Your MT5 Trading Accounts
            </h3>
            {data.mt5Accounts.length < 5 && (
              <Link href="/portal/profile" className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700">
                <Plus className="w-3.5 h-3.5" /> Add Account
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.mt5Accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-sky-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-900">{acc.mt5Login}</p>
                      {acc.isDefault && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                    <p className="text-xs text-gray-500">{acc.mt5Group} | {acc.leverage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">${acc.balance.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Equity: ${acc.equity.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions + IB Commission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/portal/deposit" className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center group-hover:shadow-md group-hover:shadow-emerald-500/20 transition-shadow">
                <ArrowDownToLine className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Deposit</p>
                <p className="text-[11px] text-emerald-600">Fund account</p>
              </div>
            </Link>
            <Link href="/portal/withdraw" className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center group-hover:shadow-md group-hover:shadow-red-500/20 transition-shadow">
                <ArrowUpFromLine className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-900">Withdraw</p>
                <p className="text-[11px] text-red-600">Cash out</p>
              </div>
            </Link>
            <Link href="/portal/internal-transfer" className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center group-hover:shadow-md group-hover:shadow-indigo-500/20 transition-shadow">
                <ArrowLeftRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-900">Transfer</p>
                <p className="text-[11px] text-indigo-600">Between MT5s</p>
              </div>
            </Link>
            <Link href="/portal/transactions" className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center group-hover:shadow-md group-hover:shadow-sky-500/20 transition-shadow">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-900">Transactions</p>
                <p className="text-[11px] text-sky-600">View history</p>
              </div>
            </Link>
          </div>
        </div>

        {/* IB Commission card */}
        {data.user.isIB ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-white/80" />
                <h3 className="font-bold text-lg">IB Commission</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-sky-100 text-xs uppercase font-medium">Total Earned</p>
                  <p className="text-2xl font-bold mt-1">${data.user.totalCommission.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-sky-100 text-xs uppercase font-medium">Available</p>
                  <p className="text-2xl font-bold mt-1">${data.user.availableCommission.toLocaleString()}</p>
                </div>
              </div>
              <Link href="/portal/ib-dashboard" className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-white/90 hover:text-white transition-colors bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl hover:bg-white/20">
                View IB Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-sky-50 rounded-2xl border border-gray-100 p-6 flex flex-col justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-sky-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Become an IB Partner</h3>
              <p className="text-sm text-gray-500 mb-4">Earn commissions by referring new clients to Liberty Markets.</p>
              <Link href="/portal/ib-application" className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors shadow-md shadow-sky-500/20">
                Apply Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Transactions</h3>
          {data.recentTransactions.length > 0 && (
            <Link href="/portal/transactions" className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        {data.recentTransactions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">No recent transactions</p>
            <p className="text-xs text-gray-300 mt-1">Your transactions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === "deposit" ? "bg-emerald-100" : "bg-red-100"}`}>
                    {tx.type === "deposit" ? (
                      <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ArrowUpFromLine className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 capitalize">{tx.type.replace("_", " ")}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === "deposit" ? "text-emerald-600" : "text-red-600"}`}>
                    {tx.type === "deposit" ? "+" : "-"}${tx.amount.toLocaleString()}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
