"use client";

import { TrendingUp, Star } from "lucide-react";

interface Mt5AccountCardProps {
  mt5Login: string;
  mt5Group: string;
  leverage: string;
  isDefault: boolean;
  balance: number;
  equity: number;
  margin?: number;
  freeMargin?: number;
  compact?: boolean;
}

export default function Mt5AccountCard({
  mt5Login,
  mt5Group,
  leverage,
  isDefault,
  balance,
  equity,
  margin,
  freeMargin,
  compact = false,
}: Mt5AccountCardProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-sky-50/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-sm">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900">{mt5Login}</p>
              {isDefault && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
            </div>
            <p className="text-xs text-gray-500">{mt5Group} | {leverage}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">${balance.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Equity: ${equity.toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-sky-50 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">{mt5Login}</span>
                {isDefault && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                    <Star className="w-2.5 h-2.5 fill-amber-500" /> Default
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{mt5Group} | {leverage}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase font-medium">Balance</p>
            <p className="text-lg font-bold text-gray-900">${balance.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase font-medium">Equity</p>
            <p className="text-lg font-bold text-gray-900">${equity.toLocaleString()}</p>
          </div>
          {margin !== undefined && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase font-medium">Margin</p>
              <p className="text-lg font-bold text-gray-900">${margin.toLocaleString()}</p>
            </div>
          )}
          {freeMargin !== undefined && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase font-medium">Free Margin</p>
              <p className="text-lg font-bold text-gray-900">${freeMargin.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
