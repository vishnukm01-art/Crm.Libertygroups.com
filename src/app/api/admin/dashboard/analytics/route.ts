import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Period = "daily" | "weekly" | "monthly" | "yearly";

function getDateRange(period: Period) {
  const now = new Date();
  let from: Date;
  let trunc: string;

  switch (period) {
    case "daily":
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      trunc = "day";
      break;
    case "weekly":
      from = new Date(now);
      from.setDate(from.getDate() - 84); // 12 weeks
      trunc = "week";
      break;
    case "monthly":
      from = new Date(now);
      from.setMonth(from.getMonth() - 12);
      trunc = "month";
      break;
    case "yearly":
      from = new Date("2020-01-01");
      trunc = "year";
      break;
  }

  return { from, to: now, trunc };
}

function formatDateLabel(dateStr: string, period: Period): string {
  const d = new Date(dateStr);
  switch (period) {
    case "daily": {
      const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      return `${month} ${d.getUTCDate()}`;
    }
    case "weekly": {
      const start = new Date(d);
      const oneJan = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil(((start.getTime() - oneJan.getTime()) / 86400000 + oneJan.getUTCDay() + 1) / 7);
      return `W${weekNum}`;
    }
    case "monthly":
      return d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
    case "yearly":
      return String(d.getUTCFullYear());
  }
}

interface RawTxnRow {
  period: Date;
  type: string;
  total_amount: number | bigint | null;
  tx_count: number | bigint;
}

interface RawClientRow {
  period: Date;
  new_clients: number | bigint;
  active_clients: number | bigint;
  ib_clients: number | bigint;
}

export async function GET(request: NextRequest) {
  try {
    const period = (request.nextUrl.searchParams.get("period") || "monthly") as Period;
    if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const { from, to, trunc } = getDateRange(period);
    // Prisma's tagged template parameterizes all values, but DATE_TRUNC
    // needs the interval as a SQL identifier/literal, not a $1 parameter.
    // Since `trunc` is already validated to one of 4 values, Prisma.raw is safe.
    const truncSql = Prisma.raw(`'${trunc}'`);

    const [
      transactionTimeSeriesRaw,
      clientTimeSeriesRaw,
      depositAgg,
      withdrawalAgg,
      ibWithdrawAgg,
      totalClients,
      activeTraders,
      ftdCount,
      topDepositorsRaw,
      topWithdrawersRaw,
    ] = await Promise.all([
      // 1. Transaction time series
      prisma.$queryRaw<RawTxnRow[]>`
        SELECT
          DATE_TRUNC(${truncSql}, "createdAt") as period,
          type,
          SUM(amount) as total_amount,
          COUNT(*)::int as tx_count
        FROM "Transaction"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
          AND status IN ('completed', 'approved')
        GROUP BY period, type
        ORDER BY period ASC
      `,

      // 2. Client time series
      prisma.$queryRaw<RawClientRow[]>`
        SELECT
          DATE_TRUNC(${truncSql}, "createdAt") as period,
          COUNT(*)::int as new_clients,
          COUNT(*) FILTER (WHERE status = 'active' AND "mt5Account" IS NOT NULL)::int as active_clients,
          COUNT(*) FILTER (WHERE "isIB" = true)::int as ib_clients
        FROM "User"
        WHERE role = 'client' AND "createdAt" >= ${from} AND "createdAt" <= ${to}
        GROUP BY period
        ORDER BY period ASC
      `,

      // 3. Summary aggregates
      prisma.transaction.aggregate({
        where: { type: "deposit", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { type: "withdraw", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { type: "ib_withdraw", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
        _count: true,
      }),

      // 4. Client counts
      prisma.user.count({ where: { role: "client" } }),
      prisma.user.count({ where: { status: "active", mt5Account: { not: null } } }),
      prisma.user.count({ where: { role: "client", mt5Account: { not: null } } }),

      // 5. Top 10 depositors
      prisma.transaction.groupBy({
        by: ["userId"],
        where: { type: "deposit", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),

      // 6. Top 10 withdrawers
      prisma.transaction.groupBy({
        by: ["userId"],
        where: { type: "withdraw", status: { in: ["completed", "approved"] } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),
    ]);

    // Build transaction time series map
    const txnMap = new Map<string, { deposit: number; withdraw: number; ibWithdraw: number }>();
    for (const row of transactionTimeSeriesRaw) {
      const key = new Date(row.period).toISOString();
      if (!txnMap.has(key)) {
        txnMap.set(key, { deposit: 0, withdraw: 0, ibWithdraw: 0 });
      }
      const entry = txnMap.get(key)!;
      const amount = Number(row.total_amount || 0);
      if (row.type === "deposit") entry.deposit = amount;
      else if (row.type === "withdraw") entry.withdraw = amount;
      else if (row.type === "ib_withdraw") entry.ibWithdraw = amount;
    }

    const transactionTimeSeries = Array.from(txnMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, data]) => ({
        date: formatDateLabel(dateStr, period),
        deposit: Math.round(data.deposit * 100) / 100,
        withdraw: Math.round(data.withdraw * 100) / 100,
        ibWithdraw: Math.round(data.ibWithdraw * 100) / 100,
      }));

    // Build client time series
    const clientTimeSeries = clientTimeSeriesRaw.map((row) => ({
      date: formatDateLabel(new Date(row.period).toISOString(), period),
      newClients: Number(row.new_clients),
      activeClients: Number(row.active_clients),
      ibClients: Number(row.ib_clients),
    }));

    // Hydrate top depositors/withdrawers with user names
    const allUserIds = [
      ...topDepositorsRaw.map((d) => d.userId),
      ...topWithdrawersRaw.map((w) => w.userId),
    ];
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true, email: true, country: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const topDepositors = topDepositorsRaw.map((d) => {
      const user = userMap.get(d.userId);
      return {
        userId: d.userId,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "",
        country: user?.country || "-",
        totalAmount: Math.round((d._sum.amount || 0) * 100) / 100,
        count: d._count,
      };
    });

    const topWithdrawers = topWithdrawersRaw.map((w) => {
      const user = userMap.get(w.userId);
      return {
        userId: w.userId,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "",
        country: user?.country || "-",
        totalAmount: Math.round((w._sum.amount || 0) * 100) / 100,
        count: w._count,
      };
    });

    const totalDepositAmount = depositAgg._sum.amount || 0;
    const totalWithdrawalAmount = withdrawalAgg._sum.amount || 0;

    return NextResponse.json({
      summary: {
        totalDepositAmount: Math.round(totalDepositAmount * 100) / 100,
        totalDepositCount: depositAgg._count,
        totalWithdrawalAmount: Math.round(totalWithdrawalAmount * 100) / 100,
        totalWithdrawalCount: withdrawalAgg._count,
        totalIBWithdrawAmount: Math.round((ibWithdrawAgg._sum.amount || 0) * 100) / 100,
        totalIBWithdrawCount: ibWithdrawAgg._count,
        netDeposit: Math.round((totalDepositAmount - totalWithdrawalAmount) * 100) / 100,
        totalClients,
        activeTraders,
        ftdCount,
      },
      transactionTimeSeries,
      clientTimeSeries,
      topDepositors,
      topWithdrawers,
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
