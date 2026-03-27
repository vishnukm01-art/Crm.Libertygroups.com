"use client";

import PageShell from "@/components/PageShell";
import { Shield, AlertTriangle, TrendingUp, Users } from "lucide-react";

const riskCards = [
  { label: "Total Exposure", value: "$0", icon: TrendingUp, color: "bg-rose-100 text-rose-600" },
  { label: "At-Risk Accounts", value: "0", icon: AlertTriangle, color: "bg-amber-100 text-amber-600" },
  { label: "Flagged Users", value: "0", icon: Users, color: "bg-red-100 text-red-600" },
  { label: "Compliance Score", value: "100%", icon: Shield, color: "bg-emerald-100 text-emerald-600" },
];

export default function RiskOverviewPage() {
  return (
    <PageShell title="Risk Overview" description="Risk management dashboard" icon={Shield}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {riskCards.map((card, i) => (
          <div key={i} className="stat-card card-stagger bg-white rounded-2xl p-5 border border-gray-100 animate-card-enter" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-xl`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Alerts</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm text-gray-500">No active risk alerts</p>
        </div>
      </div>
    </PageShell>
  );
}
