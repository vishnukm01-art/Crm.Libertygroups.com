"use client";

import { DollarSign, ArrowUpFromLine, TrendingUp, Wallet } from "lucide-react";

interface FinancialSummaryProps {
  totalDeposits: number;
  totalWithdrawals: number;
  netDeposit: number;
  totalIBWithdrawals: number;
}

const formatCurrency = (val: number) =>
  `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardFinancialSummary({
  totalDeposits,
  totalWithdrawals,
  netDeposit,
  totalIBWithdrawals,
}: FinancialSummaryProps) {
  const cards = [
    { label: "Total Deposits", value: formatCurrency(totalDeposits), icon: DollarSign, color: "bg-emerald-100 text-emerald-600" },
    { label: "Total Withdrawals", value: formatCurrency(totalWithdrawals), icon: ArrowUpFromLine, color: "bg-rose-100 text-rose-600" },
    { label: "Net Deposit", value: formatCurrency(netDeposit), icon: TrendingUp, color: netDeposit >= 0 ? "bg-sky-100 text-sky-600" : "bg-amber-100 text-amber-600" },
    { label: "IB Withdrawals", value: formatCurrency(totalIBWithdrawals), icon: Wallet, color: "bg-violet-100 text-violet-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="stat-card card-stagger bg-white rounded-2xl p-5 border border-gray-100 animate-card-enter"
            style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-xl transition-all duration-300`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
