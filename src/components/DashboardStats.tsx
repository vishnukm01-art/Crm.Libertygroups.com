"use client";

import Link from "next/link";
import {
  Users, UserCheck, Clock, ArrowDownToLine, ArrowUpFromLine,
  Wallet, TrendingUp, UserX, Network, FileCheck, DollarSign
} from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalClients: number;
    totalIB: number;
    pendingClients: number;
    pendingDeposit: number;
    pendingWithdraw: number;
    pendingIBWithdraw: number;
    activeTraders: number;
    ftdUsers: number;
    nonFTDUsers: number;
    pendingIBRequest: number;
    pendingBankDetails: number;
  };
}

const statCards = [
  { key: "totalClients", label: "Total Clients", icon: Users, iconBg: "bg-sky-100 text-sky-600", href: "/admin/user-management/user-list" },
  { key: "totalIB", label: "Total IB", icon: Network, iconBg: "bg-violet-100 text-violet-600", href: "/admin/ib-management/list" },
  { key: "pendingClients", label: "Pending Clients", icon: Clock, iconBg: "bg-amber-100 text-amber-600", href: "/admin/user-management/pending-clients" },
  { key: "pendingDeposit", label: "Pending Deposit", icon: DollarSign, iconBg: "bg-emerald-100 text-emerald-600", href: "/admin/transaction/pending-deposits" },
  { key: "pendingWithdraw", label: "Pending Withdraw", icon: ArrowUpFromLine, iconBg: "bg-rose-100 text-rose-600", href: "/admin/transaction/pending-withdrawals" },
  { key: "pendingIBWithdraw", label: "Pending IB Withdraw", icon: Wallet, iconBg: "bg-cyan-100 text-cyan-600", href: "/admin/transaction/ib-withdrawals" },
  { key: "activeTraders", label: "Active Traders", icon: TrendingUp, iconBg: "bg-green-100 text-green-600", href: "/admin/user-management/active-traders" },
  { key: "ftdUsers", label: "FTD Users", icon: UserCheck, iconBg: "bg-blue-100 text-blue-600", href: "/admin/user-management/ftd-users" },
  { key: "nonFTDUsers", label: "Non FTD Users", icon: UserX, iconBg: "bg-orange-100 text-orange-600", href: "/admin/user-management/non-ftd-users" },
  { key: "pendingIBRequest", label: "Pending IB Request", icon: FileCheck, iconBg: "bg-indigo-100 text-indigo-600", href: "/admin/ib-management/requests" },
  { key: "pendingBankDetails", label: "Pending Bank Details Request", icon: ArrowDownToLine, iconBg: "bg-pink-100 text-pink-600", href: "/admin/user-management/pending-bank-details" },
] as const;

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof typeof stats] ?? 0;

        return (
          <div
            key={card.key}
            className="stat-card card-stagger bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer group animate-card-enter"
            style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 font-medium truncate">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2 transition-colors duration-300 group-hover:text-sky-700">
                  {value}
                </p>
                <Link
                  href={card.href}
                  className="text-xs text-sky-500 font-medium mt-2 inline-block hover:text-sky-700 transition-colors duration-200 hover:underline"
                >
                  View more
                </Link>
              </div>
              <div className={`${card.iconBg} p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
