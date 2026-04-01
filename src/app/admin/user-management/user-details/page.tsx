"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import {
  User,
  ArrowLeft,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Monitor,
  Landmark,
  Activity,
  Users,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

interface MT5Account {
  id: string;
  mt5Login: string;
  mt5Group: string;
  leverage: string;
  isDefault: boolean;
  createdAt: string;
}

interface BankDetail {
  id: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string | null;
  swiftCode: string | null;
  accountType: string | null;
  status: string;
  createdAt: string;
}

interface Referral {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  createdAt: string;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  role: string;
  status: string;
  kycStatus: string;
  walletBalance: number;
  isIB: boolean;
  marketingName: string | null;
  createdAt: string;
  totalDeposit: number;
  totalWithdraw: number;
  totalMT5Accounts: number;
  deposits: Transaction[];
  withdrawals: Transaction[];
  mt5Accounts: MT5Account[];
  bankDetails: BankDetail[];
  ibParent: { id: string; name: string; email: string } | null;
  ibChildren: Referral[];
}

type TabKey =
  | "deposits"
  | "withdrawals"
  | "mt5"
  | "bank"
  | "activity"
  | "referrals";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "deposits", label: "Deposit List", icon: ArrowDownToLine },
  { key: "withdrawals", label: "Withdraw List", icon: ArrowUpFromLine },
  { key: "mt5", label: "MT5 Account", icon: Monitor },
  { key: "bank", label: "Bank Details", icon: Landmark },
  { key: "activity", label: "Login Activity", icon: Activity },
  { key: "referrals", label: "Referral By", icon: Users },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    blocked: "bg-red-100 text-red-700",
    inactive: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function UserDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id") || "";

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("deposits");

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}?details=true`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUser(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
        No user ID provided. Please go back to the User List.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
        User not found.
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to User List
      </button>

      {/* User Info Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-white text-xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <StatusBadge status={user.status} />
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                {user.role}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                KYC: {user.kycStatus}
              </span>
              {user.isIB && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  IB
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>
              Phone: <span className="text-gray-700">{user.phone || "--"}</span>
            </div>
            <div>
              Country:{" "}
              <span className="text-gray-700">{user.country || "--"}</span>
            </div>
            <div>
              Joined:{" "}
              <span className="text-gray-700">
                {new Date(user.createdAt).toLocaleDateString("en-CA")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Total Deposit
              </p>
              <p className="text-xl font-bold text-gray-900">
                ${user.totalDeposit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Total Withdraw
              </p>
              <p className="text-xl font-bold text-gray-900">
                ${user.totalWithdraw.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-100 text-sky-600">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                Total MT5 Account
              </p>
              <p className="text-xl font-bold text-gray-900">
                {user.totalMT5Accounts}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "deposits" && (
            <DepositTable data={user.deposits.filter((t) => t.type === "deposit")} />
          )}
          {activeTab === "withdrawals" && (
            <WithdrawTable data={user.withdrawals} />
          )}
          {activeTab === "mt5" && <MT5Table data={user.mt5Accounts} />}
          {activeTab === "bank" && <BankTable data={user.bankDetails} />}
          {activeTab === "activity" && <LoginActivityTab />}
          {activeTab === "referrals" && (
            <ReferralTable data={user.ibChildren} ibParent={user.ibParent} />
          )}
        </div>
      </div>
    </>
  );
}

function DepositTable({ data }: { data: Transaction[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No deposit records found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            {[
              "#",
              "Amount",
              "Currency",
              "Payment Method",
              "Status",
              "Reference",
              "Date",
            ].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((t, i) => (
            <tr
              key={t.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
            >
              <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2.5 font-medium text-gray-900">
                ${t.amount.toFixed(2)}
              </td>
              <td className="px-3 py-2.5 text-gray-600">{t.currency}</td>
              <td className="px-3 py-2.5 text-gray-600">
                {t.paymentMethod || "--"}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {t.reference || "--"}
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {new Date(t.createdAt).toLocaleDateString("en-CA")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WithdrawTable({ data }: { data: Transaction[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No withdrawal records found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            {[
              "#",
              "Amount",
              "Currency",
              "Payment Method",
              "Status",
              "Reference",
              "Date",
            ].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((t, i) => (
            <tr
              key={t.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
            >
              <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2.5 font-medium text-gray-900">
                ${t.amount.toFixed(2)}
              </td>
              <td className="px-3 py-2.5 text-gray-600">{t.currency}</td>
              <td className="px-3 py-2.5 text-gray-600">
                {t.paymentMethod || "--"}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {t.reference || "--"}
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {new Date(t.createdAt).toLocaleDateString("en-CA")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MT5Table({ data }: { data: MT5Account[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No MT5 accounts found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            {["#", "MT5 Login", "Group", "Leverage", "Default", "Created"].map(
              (h) => (
                <th
                  key={h}
                  className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((a, i) => (
            <tr
              key={a.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
            >
              <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2.5 font-medium text-gray-900">
                {a.mt5Login}
              </td>
              <td className="px-3 py-2.5 text-gray-600">{a.mt5Group}</td>
              <td className="px-3 py-2.5 text-gray-600">{a.leverage}</td>
              <td className="px-3 py-2.5">
                {a.isDefault ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    Yes
                  </span>
                ) : (
                  <span className="text-gray-400">No</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {new Date(a.createdAt).toLocaleDateString("en-CA")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BankTable({ data }: { data: BankDetail[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No bank details found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            {[
              "#",
              "Bank Name",
              "Account Number",
              "IFSC Code",
              "SWIFT Code",
              "Type",
              "Status",
              "Date",
            ].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((b, i) => (
            <tr
              key={b.id}
              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
            >
              <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2.5 font-medium text-gray-900">
                {b.bankName}
              </td>
              <td className="px-3 py-2.5 text-gray-600">{b.accountNumber}</td>
              <td className="px-3 py-2.5 text-gray-600">
                {b.ifscCode || "--"}
              </td>
              <td className="px-3 py-2.5 text-gray-600">
                {b.swiftCode || "--"}
              </td>
              <td className="px-3 py-2.5 text-gray-600">
                {b.accountType || "--"}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={b.status} />
              </td>
              <td className="px-3 py-2.5 text-gray-500">
                {new Date(b.createdAt).toLocaleDateString("en-CA")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoginActivityTab() {
  return (
    <div className="text-center py-8 text-gray-400">
      No login activity recorded.
    </div>
  );
}

function ReferralTable({
  data,
  ibParent,
}: {
  data: Referral[];
  ibParent: { id: string; name: string; email: string } | null;
}) {
  return (
    <div>
      {ibParent && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-sm">
          <span className="font-medium text-sky-700">Referred by:</span>{" "}
          <span className="text-sky-900">
            {ibParent.name} ({ibParent.email})
          </span>
        </div>
      )}
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No referrals found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {["#", "Name", "Email", "Phone", "Country", "Joined"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">
                    {r.name}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{r.email}</td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {r.phone || "--"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {r.country || "--"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString("en-CA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UserDetailsPage() {
  return (
    <PageShell
      title="User Details"
      description="View complete user information"
      icon={User}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        }
      >
        <UserDetailsContent />
      </Suspense>
    </PageShell>
  );
}
