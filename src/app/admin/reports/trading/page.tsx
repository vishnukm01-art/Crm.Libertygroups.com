"use client";

import PageShell from "@/components/PageShell";
import DataTable from "@/components/DataTable";
import { TrendingUp } from "lucide-react";

const columns = [
  { key: "id", label: "ID" },
  { key: "client", label: "Client" },
  { key: "mt5Account", label: "MT5 Account" },
  { key: "totalTrades", label: "Total Trades" },
  { key: "volume", label: "Volume (Lots)" },
  { key: "profit", label: "Profit/Loss" },
  { key: "lastTradeAt", label: "Last Trade" },
];

export default function TradingReportPage() {
  return (
    <PageShell title="Trading Report" description="Trading activity and performance" icon={TrendingUp}>
      <DataTable columns={columns} data={[]} searchPlaceholder="Search trading reports..." emptyMessage="No trading data available" />
    </PageShell>
  );
}
