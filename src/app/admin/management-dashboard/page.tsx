"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import DashboardChart from "@/components/DashboardChart";
import PeriodSelector from "@/components/PeriodSelector";
import TopListCard from "@/components/TopListCard";
import {
  BarChart3, Users, TrendingUp, DollarSign,
  ArrowUpFromLine, ArrowDownToLine, Activity,
} from "lucide-react";

interface Summary {
  totalDepositAmount: number;
  totalDepositCount: number;
  totalWithdrawalAmount: number;
  totalWithdrawalCount: number;
  netDeposit: number;
  totalClients: number;
  activeTraders: number;
  ftdCount: number;
}

interface TopEntry {
  userId: string;
  userName: string;
  country: string;
  totalAmount: number;
  count: number;
}

interface IB {
  id: string;
  name: string;
  email: string;
  totalCommission: number;
  totalClients: number;
}

interface Transaction {
  id: string;
  userName: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function ManagementDashboard() {
  const [period, setPeriod] = useState("monthly");
  const [summary, setSummary] = useState<Summary>({
    totalDepositAmount: 0, totalDepositCount: 0,
    totalWithdrawalAmount: 0, totalWithdrawalCount: 0,
    netDeposit: 0, totalClients: 0, activeTraders: 0, ftdCount: 0,
  });
  const [topDepositors, setTopDepositors] = useState<TopEntry[]>([]);
  const [topWithdrawers, setTopWithdrawers] = useState<TopEntry[]>([]);
  const [topIBs, setTopIBs] = useState<IB[]>([]);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/dashboard/analytics?period=${period}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ib/users").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/transactions").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([analytics, ibs, txns]) => {
        if (analytics) {
          setSummary(analytics.summary);
          setTopDepositors(analytics.topDepositors || []);
          setTopWithdrawers(analytics.topWithdrawers || []);
        }
        setTopIBs(
          ibs
            .sort((a: IB, b: IB) => (b.totalCommission || 0) - (a.totalCommission || 0))
            .slice(0, 5)
        );
        setRecentTxns(txns.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const fmt = (val: number) =>
    `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const summaryCards = [
    { label: "Total Deposits", value: fmt(summary.totalDepositAmount), sub: `${summary.totalDepositCount} transactions`, icon: DollarSign, color: "bg-emerald-100 text-emerald-600" },
    { label: "Total Withdrawals", value: fmt(summary.totalWithdrawalAmount), sub: `${summary.totalWithdrawalCount} transactions`, icon: ArrowUpFromLine, color: "bg-rose-100 text-rose-600" },
    { label: "Net Deposit", value: fmt(summary.netDeposit), sub: "Deposits minus withdrawals", icon: TrendingUp, color: summary.netDeposit >= 0 ? "bg-sky-100 text-sky-600" : "bg-amber-100 text-amber-600" },
    { label: "Total Clients", value: String(summary.totalClients), sub: `${summary.activeTraders} active traders`, icon: Users, color: "bg-violet-100 text-violet-600" },
    { label: "Active Traders", value: String(summary.activeTraders), sub: "With MT5 accounts", icon: Activity, color: "bg-cyan-100 text-cyan-600" },
    { label: "FTD Users", value: String(summary.ftdCount), sub: "First-time depositors", icon: ArrowDownToLine, color: "bg-amber-100 text-amber-600" },
  ];

  if (loading) {
    return (
      <PageShell title="Management Dashboard" description="High-level performance overview" icon={BarChart3}>
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Management Dashboard"
      description="High-level performance overview"
      icon={BarChart3}
      actions={<PeriodSelector value={period} onChange={setPeriod} />}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="stat-card card-stagger bg-white rounded-2xl p-5 border border-gray-100 animate-card-enter"
            style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
              <div className={`${card.color} p-3 rounded-xl`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Chart */}
      <div className="mt-6">
        <DashboardChart />
      </div>

      {/* Top 10 Depositors & Withdrawers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <TopListCard
          title="Top 10 Depositors"
          icon={ArrowDownToLine}
          items={topDepositors.map((d) => ({
            name: d.userName,
            country: d.country,
            amount: d.totalAmount,
            count: d.count,
          }))}
          emptyMessage="No deposit data available"
          amountColor="text-emerald-600"
        />
        <TopListCard
          title="Top 10 Withdrawers"
          icon={ArrowUpFromLine}
          items={topWithdrawers.map((w) => ({
            name: w.userName,
            country: w.country,
            amount: w.totalAmount,
            count: w.count,
          }))}
          emptyMessage="No withdrawal data available"
          amountColor="text-rose-600"
        />
      </div>

      {/* Top IBs & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing IBs</h3>
          {topIBs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No IB data available</p>
          ) : (
            <div className="space-y-2.5">
              {topIBs.map((ib, i) => (
                <div key={ib.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-sky-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ib.name}</p>
                    <p className="text-xs text-gray-400">{ib.totalClients} clients</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-600">
                    ${(ib.totalCommission || 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          {recentTxns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No recent transactions</p>
          ) : (
            <div className="space-y-2.5">
              {recentTxns.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-sky-50/50 transition-colors">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      txn.type === "deposit"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {txn.type === "deposit" ? "D" : "W"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{txn.userName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(txn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">${txn.amount.toFixed(2)}</p>
                    <p
                      className={`text-xs capitalize ${
                        txn.status === "completed"
                          ? "text-emerald-500"
                          : txn.status === "pending"
                          ? "text-amber-500"
                          : "text-gray-400"
                      }`}
                    >
                      {txn.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
