"use client";

import { type LucideIcon } from "lucide-react";

interface TopListItem {
  rank?: number;
  name: string;
  email?: string;
  country?: string;
  amount: number;
  count?: number;
}

interface TopListCardProps {
  title: string;
  icon?: LucideIcon;
  items: TopListItem[];
  emptyMessage?: string;
  amountColor?: string;
}

export default function TopListCard({
  title,
  icon: Icon,
  items,
  emptyMessage = "No data available",
  amountColor = "text-emerald-600",
}: TopListCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-sky-50/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {item.rank ?? i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {item.country && item.country !== "-" ? item.country : ""}
                  {item.count !== undefined && (
                    <span>{item.country && item.country !== "-" ? " · " : ""}{item.count} txns</span>
                  )}
                </p>
              </div>
              <p className={`text-sm font-semibold ${amountColor} flex-shrink-0`}>
                ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
