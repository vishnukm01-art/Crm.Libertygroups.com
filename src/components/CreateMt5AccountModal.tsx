"use client";

import { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";

interface CreateMt5AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  groups: { name: string; leverage?: string }[];
  accountCount: number;
  maxAccounts?: number;
}

const LEVERAGE_OPTIONS = ["1:50", "1:100", "1:200", "1:500", "1:1000"];

export default function CreateMt5AccountModal({
  isOpen,
  onClose,
  onCreated,
  groups,
  accountCount,
  maxAccounts = 5,
}: CreateMt5AccountModalProps) {
  const [group, setGroup] = useState("");
  const [leverage, setLeverage] = useState("1:100");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const remaining = maxAccounts - accountCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!group) { setError("Please select an account group"); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setSubmitting(true);
    try {
      const userId = localStorage.getItem("portalUserId") || "demo";
      const res = await fetch("/api/mt5/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, group, leverage, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create MT5 account");
        return;
      }
      onCreated();
      onClose();
      setGroup("");
      setLeverage("1:100");
      setPassword("");
    } catch {
      setError("An error occurred while creating the account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-sky-500" />
            Create MT5 Account
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          {remaining > 0
            ? `You can create ${remaining} more account${remaining !== 1 ? "s" : ""} (${accountCount}/${maxAccounts} used).`
            : "Maximum account limit reached."}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {remaining <= 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">You have reached the maximum of {maxAccounts} MT5 accounts.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Group <span className="text-red-500">*</span>
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white"
              >
                <option value="">Select group</option>
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Leverage <span className="text-red-500">*</span>
              </label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 appearance-none bg-white"
              >
                {LEVERAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trading Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="Min 6 characters"
                minLength={6}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Account
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
