"use client";

import { useState, useEffect } from "react";
import { Trophy, Gift, DollarSign, TrendingUp, Clock } from "lucide-react";

interface Reward { id: string; name: string; description: string | null; type: string; value: number; minDeposit: number; createdAt: string; }

const typeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  deposit_bonus: { label: "Deposit Bonus", color: "bg-emerald-100 text-emerald-700", icon: <DollarSign className="w-4 h-4" /> },
  volume_bonus: { label: "Volume Bonus", color: "bg-blue-100 text-blue-700", icon: <TrendingUp className="w-4 h-4" /> },
  loyalty: { label: "Loyalty Reward", color: "bg-purple-100 text-purple-700", icon: <Gift className="w-4 h-4" /> },
};

export default function TradeAndWinPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/rewards")
      .then((r) => r.ok ? r.json() : [])
      .then(setRewards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20"><Trophy className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">Trade And Win</h1><p className="text-sm text-gray-500">Earn rewards through trading activity</p></div></div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          <p className="text-sm font-semibold text-amber-900">Your Price Lots: 0</p>
        </div>
        <p className="text-xs text-amber-700">1 Traded Lot = 1 Price Lot. Trade more to earn more rewards!</p>
      </div>

      {rewards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No Rewards Added yet!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const typeInfo = typeLabels[reward.type] || { label: reward.type, color: "bg-gray-100 text-gray-700", icon: <Gift className="w-4 h-4" /> };
            return (
              <div key={reward.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeInfo.color}`}>{typeInfo.icon}</div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{reward.name}</h3>
                {reward.description && <p className="text-sm text-gray-600 mb-4">{reward.description}</p>}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Reward Value</span><span className="font-semibold text-emerald-600">${reward.value}</span></div>
                  {reward.minDeposit > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Min. Deposit</span><span className="font-semibold text-gray-900">${reward.minDeposit}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Helpline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Helpline</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="#" className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center"><Trophy className="w-4 h-4 text-white" /></div>
            <div><p className="text-sm font-semibold text-sky-900">Chat with us</p><p className="text-xs text-sky-600">Click here</p></div>
          </a>
          <a href="mailto:support@libertymarkets.com" className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center"><Gift className="w-4 h-4 text-white" /></div>
            <div><p className="text-sm font-semibold text-emerald-900">Mail us</p><p className="text-xs text-emerald-600">Click here</p></div>
          </a>
        </div>
      </div>
    </div>
  );
}
