"use client";

import { ChevronDown } from "lucide-react";

export interface Mt5AccountOption {
  id: string;
  mt5Login: string;
  mt5Group: string;
  leverage: string;
  isDefault: boolean;
  balance?: number;
  equity?: number;
}

interface Mt5AccountSelectorProps {
  accounts: Mt5AccountOption[];
  selectedId: string;
  onChange: (id: string) => void;
  label?: string;
  required?: boolean;
  showBalance?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function Mt5AccountSelector({
  accounts,
  selectedId,
  onChange,
  label = "MT5 Account",
  required = false,
  showBalance = true,
  disabled = false,
  placeholder = "Select MT5 account",
}: Mt5AccountSelectorProps) {
  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || accounts.length === 0}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white disabled:opacity-50 disabled:bg-gray-50"
        >
          <option value="">{accounts.length === 0 ? "No MT5 accounts" : placeholder}</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.mt5Login} ({acc.mt5Group}, {acc.leverage})
              {showBalance && acc.balance !== undefined ? ` - $${acc.balance.toLocaleString()}` : ""}
              {acc.isDefault ? " (Default)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {selected && showBalance && selected.balance !== undefined && (
        <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-500">
          <span>Balance: <span className="font-medium text-gray-700">${selected.balance.toLocaleString()}</span></span>
          {selected.equity !== undefined && (
            <span>Equity: <span className="font-medium text-gray-700">${selected.equity.toLocaleString()}</span></span>
          )}
        </div>
      )}
      {accounts.length === 0 && (
        <p className="text-xs text-amber-600 mt-1">No MT5 accounts found. Please create one first.</p>
      )}
    </div>
  );
}
