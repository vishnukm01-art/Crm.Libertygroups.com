"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Network, DollarSign, Wallet, Users, UserCheck, Copy, Check,
  CheckCircle, Clock, AlertCircle, Send, ChevronDown, X,
} from "lucide-react";

interface Referral {
  id: string;
  name: string;
  email: string;
  status: string;
  isIB: boolean;
  totalCommission: number;
  availableCommission: number;
  mt5Account: string | null;
  createdAt: string;
}

interface ShareHistory {
  id: string;
  details: string;
  entityId: string;
  createdAt: string;
}

interface IBData {
  ib: {
    name: string;
    email: string;
    referralLink: string | null;
    totalCommission: number;
    availableCommission: number;
  };
  stats: { totalReferrals: number; activeReferrals: number };
  referrals: Referral[];
  recentShares: ShareHistory[];
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    inactive: "bg-gray-100 text-gray-600",
    blocked: "bg-red-100 text-red-700",
  };
  return map[status] || "bg-gray-100 text-gray-600";
};

export default function IBDashboardPage() {
  const [data, setData] = useState<IBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Share commission form
  const [shareRecipient, setShareRecipient] = useState("");
  const [shareAmount, setShareAmount] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch(`/api/portal/ib-dashboard?userId=${userId}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopy = async () => {
    if (!data?.ib.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.ib.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleShareCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError("");
    setShareSuccess("");

    const amount = parseFloat(shareAmount);
    if (!shareRecipient) { setShareError("Please select a recipient"); return; }
    if (!amount || amount <= 0) { setShareError("Please enter a valid amount"); return; }
    if (data && amount > data.ib.availableCommission) { setShareError("Amount exceeds available commission"); return; }

    setSharing(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/portal/ib-share-commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ibUserId: userId,
          recipientUserId: shareRecipient,
          amount,
          note: shareNote,
        }),
      });
      const result = await res.json();
      if (!res.ok) { setShareError(result.error || "Failed to share commission"); return; }
      setShareSuccess(result.message);
      setShareRecipient("");
      setShareAmount("");
      setShareNote("");
      fetchData();
    } catch {
      setShareError("An error occurred");
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Network className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IB Dashboard</h1>
            <p className="text-sm text-gray-500">Manage your referrals and commissions</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Network className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p>Unable to load IB dashboard. Make sure you are an approved IB.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Network className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IB Dashboard</h1>
          <p className="text-sm text-gray-500">Manage your referrals and commissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Commission</span>
          </div>
          <p className="text-xl font-bold text-gray-900">${data.ib.totalCommission.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Available</span>
          </div>
          <p className="text-xl font-bold text-gray-900">${data.ib.availableCommission.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Referrals</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{data.stats.totalReferrals}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Referrals</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{data.stats.activeReferrals}</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <h3 className="font-bold text-lg mb-1">Your Referral Link</h3>
        <p className="text-indigo-100 text-xs mb-4">Share this link with potential clients. When they register using your link, they will be linked to your IB account.</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-sm font-mono text-white/90 truncate border border-white/20">
            {data.ib.referralLink || "Referral link not generated"}
          </div>
          <button
            onClick={handleCopy}
            disabled={!data.ib.referralLink}
            className="flex items-center gap-2 bg-white text-indigo-700 px-5 py-3 rounded-xl font-medium text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 shrink-0"
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referred Users Table - 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Referred Users</h3>
            <p className="text-xs text-gray-500 mt-0.5">Users who registered using your referral link</p>
          </div>
          {data.referrals.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No referred users yet. Share your referral link to start building your network.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IB</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MT5</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map((ref) => (
                    <tr key={ref.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{ref.name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{ref.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(ref.status)}`}>
                          {ref.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ref.isIB ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            <Network className="w-3 h-3" /> IB
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Client</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono">{ref.mt5Account || "-"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(ref.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Share Commission - 1/3 width */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Send className="w-4.5 h-4.5 text-sky-500" />
              Share Commission
            </h3>
            <p className="text-xs text-gray-500 mb-4">Share from your available commission with your referrals</p>

            {shareSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs mb-3 flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{shareSuccess}</span>
              </div>
            )}
            {shareError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-3 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            <form onSubmit={handleShareCommission} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Recipient <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={shareRecipient}
                    onChange={(e) => setShareRecipient(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white"
                  >
                    <option value="">Select referral</option>
                    {data.referrals.map((ref) => (
                      <option key={ref.id} value={ref.id}>{ref.name} ({ref.email})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={data.ib.availableCommission}
                    value={shareAmount}
                    onChange={(e) => setShareAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Available: ${data.ib.availableCommission.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="Add a note..."
                />
              </div>

              <button
                type="submit"
                disabled={sharing || !shareRecipient || !shareAmount}
                className="w-full px-3 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sharing ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Sharing...</>
                ) : (
                  <><Send className="w-4 h-4" /> Share Commission</>
                )}
              </button>
            </form>
          </div>

          {/* Recent Shares */}
          {data.recentShares.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Recent Shares</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                {data.recentShares.map((share) => (
                  <div key={share.id} className="px-4 py-3">
                    <p className="text-xs text-gray-700">{share.details}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(share.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
