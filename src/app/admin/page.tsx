import { prisma } from "@/lib/prisma";
import DashboardStats from "@/components/DashboardStats";
import DashboardChart from "@/components/DashboardChart";
import DashboardFinancialSummary from "@/components/DashboardFinancialSummary";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  let stats = {
    totalClients: 0,
    totalIB: 0,
    pendingClients: 0,
    pendingDeposit: 0,
    pendingWithdraw: 0,
    pendingIBWithdraw: 0,
    activeTraders: 0,
    ftdUsers: 0,
    nonFTDUsers: 0,
    pendingIBRequest: 0,
    pendingBankDetails: 0,
  };

  let financials = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    netDeposit: 0,
    totalIBWithdrawals: 0,
  };

  try {
    const [
      totalClients,
      totalIB,
      pendingClients,
      pendingDeposit,
      pendingWithdraw,
      pendingIBWithdraw,
      activeTraders,
      nonFTDUsers,
      pendingIBRequest,
      pendingBankDetails,
      depositAgg,
      withdrawalAgg,
      ibWithdrawAgg,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "client" } }),
      prisma.user.count({ where: { isIB: true } }),
      prisma.user.count({ where: { status: "pending" } }),
      prisma.transaction.count({ where: { type: "deposit", status: "pending" } }),
      prisma.transaction.count({ where: { type: "withdrawal", status: "pending" } }),
      prisma.transaction.count({ where: { type: "ib_withdraw", status: "pending" } }),
      prisma.user.count({ where: { status: "active", mt5Account: { not: null } } }),
      prisma.user.count({ where: { mt5Account: null, role: "client" } }),
      prisma.iBRequest.count({ where: { status: "pending" } }),
      prisma.bankDetail.count({ where: { status: "pending" } }),
      prisma.transaction.aggregate({
        where: { type: "deposit", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "withdraw", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: "ib_withdraw", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
      }),
    ]);

    stats = {
      totalClients,
      totalIB,
      pendingClients,
      pendingDeposit,
      pendingWithdraw,
      pendingIBWithdraw,
      activeTraders,
      ftdUsers: totalClients - nonFTDUsers,
      nonFTDUsers,
      pendingIBRequest,
      pendingBankDetails,
    };

    const totalDep = depositAgg._sum.amount || 0;
    const totalWith = withdrawalAgg._sum.amount || 0;
    const totalIBWith = ibWithdrawAgg._sum.amount || 0;

    financials = {
      totalDeposits: Math.round(totalDep * 100) / 100,
      totalWithdrawals: Math.round(totalWith * 100) / 100,
      netDeposit: Math.round((totalDep - totalWith) * 100) / 100,
      totalIBWithdrawals: Math.round(totalIBWith * 100) / 100,
    };
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here&apos;s your CRM overview.</p>
      </div>

      <DashboardStats stats={stats} />

      <DashboardFinancialSummary
        totalDeposits={financials.totalDeposits}
        totalWithdrawals={financials.totalWithdrawals}
        netDeposit={financials.netDeposit}
        totalIBWithdrawals={financials.totalIBWithdrawals}
      />

      <DashboardChart />
    </div>
  );
}
