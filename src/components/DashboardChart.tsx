"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import PeriodSelector from "./PeriodSelector";

interface TransactionPoint {
  date: string;
  deposit: number;
  withdraw: number;
  ibWithdraw: number;
}

interface ClientPoint {
  date: string;
  newClients: number;
  activeClients: number;
  ibClients: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100">
        <p className="text-sm font-semibold text-gray-900 mb-1.5">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: {typeof entry.value === "number" && entry.value >= 100 ? `$${entry.value.toLocaleString()}` : entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardChart() {
  const [activeTab, setActiveTab] = useState<"transaction" | "clients">("transaction");
  const [period, setPeriod] = useState("monthly");
  const [transactionData, setTransactionData] = useState<TransactionPoint[]>([]);
  const [clientData, setClientData] = useState<ClientPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/dashboard/analytics?period=${period}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTransactionData(data.transactionTimeSeries || []);
          setClientData(data.clientTimeSeries || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const hasTransactionData = transactionData.some((d) => d.deposit > 0 || d.withdraw > 0 || d.ibWithdraw > 0);
  const hasClientData = clientData.some((d) => d.newClients > 0 || d.activeClients > 0 || d.ibClients > 0);
  const showEmpty = activeTab === "transaction" ? !hasTransactionData : !hasClientData;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("transaction")}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300
              ${activeTab === "transaction"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                : "bg-gray-100 text-gray-600 hover:bg-sky-50 hover:text-sky-600"
              }`}
          >
            Transaction
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-300
              ${activeTab === "clients"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/30"
                : "bg-gray-100 text-gray-600 hover:bg-sky-50 hover:text-sky-600"
              }`}
          >
            Clients
          </button>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Chart */}
      <div className="h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : showEmpty && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <p className="text-sm font-medium">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === "transaction" ? (
              <LineChart data={transactionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="deposit"
                  name="Deposit"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  dot={{ fill: "#EF4444", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="withdraw"
                  name="Withdraw"
                  stroke="#22C55E"
                  strokeWidth={2.5}
                  dot={{ fill: "#22C55E", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="ibWithdraw"
                  name="IB Withdraw"
                  stroke="#0EA5E9"
                  strokeWidth={2.5}
                  dot={{ fill: "#0EA5E9", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            ) : (
              <LineChart data={clientData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} />
                <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="newClients"
                  name="New Clients"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ fill: "#8B5CF6", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="activeClients"
                  name="Active Clients"
                  stroke="#0EA5E9"
                  strokeWidth={2.5}
                  dot={{ fill: "#0EA5E9", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="ibClients"
                  name="IB Clients"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ fill: "#F59E0B", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
