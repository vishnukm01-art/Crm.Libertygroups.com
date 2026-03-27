export interface SubMenuItem {
  name: string;
  href: string;
  icon?: string;
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
  children?: SubMenuItem[];
}

export const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: "LayoutDashboard",
  },
  {
    name: "Management Dashboard",
    href: "/admin/management-dashboard",
    icon: "BarChart3",
  },
  {
    name: "User Management",
    href: "/admin/user-management",
    icon: "Users",
    children: [
      { name: "Add User", href: "/admin/user-management/add-user", icon: "UserPlus" },
      { name: "User List", href: "/admin/user-management/user-list", icon: "List" },
      { name: "Create MT5 Account", href: "/admin/user-management/create-mt5-account", icon: "PlusCircle" },
      { name: "MT5 User List", href: "/admin/user-management/mt5-user-list", icon: "Monitor" },
      { name: "Follow Up List", href: "/admin/user-management/follow-up-list", icon: "PhoneCall" },
      { name: "Pending Documents List", href: "/admin/user-management/pending-documents", icon: "FileCheck" },
      { name: "Approved Documents List", href: "/admin/user-management/approved-documents", icon: "CheckCircle" },
      { name: "Upload User Documents", href: "/admin/user-management/upload-documents", icon: "Upload" },
      { name: "Add Bank Details", href: "/admin/user-management/add-bank-details", icon: "Building" },
      { name: "Bank Details List", href: "/admin/user-management/bank-details-list", icon: "CreditCard" },
      { name: "User Password List", href: "/admin/user-management/user-password-list", icon: "KeyRound" },
      { name: "Change User Password", href: "/admin/user-management/change-password", icon: "Lock" },
      { name: "Add Existing Client", href: "/admin/user-management/add-existing-client", icon: "UserPlus2" },
      { name: "Change MT5 Password", href: "/admin/user-management/change-mt5-password", icon: "ShieldCheck" },
      { name: "Update MT5 Leverage", href: "/admin/user-management/change-leverage", icon: "Sliders" },
      { name: "Resend Verification Mail", href: "/admin/user-management/resend-verification", icon: "MailCheck" },
      { name: "Resend MT5 Data Mail", href: "/admin/user-management/resend-mt5-data", icon: "MailPlus" },
    ],
  },
  {
    name: "Bonus",
    href: "/admin/bonus",
    icon: "Gift",
    children: [
      { name: "Credit Bonus", href: "/admin/bonus/credit", icon: "ArrowUpCircle" },
      { name: "Debit Bonus", href: "/admin/bonus/debit", icon: "ArrowDownCircle" },
      { name: "Bonus History", href: "/admin/bonus/history", icon: "History" },
    ],
  },
  {
    name: "IB Management",
    href: "/admin/ib-management",
    icon: "Network",
    children: [
      { name: "IB Users", href: "/admin/ib-management/list", icon: "List" },
      { name: "IB Requests", href: "/admin/ib-management/requests", icon: "UserCheck" },
      { name: "Set IB Commission", href: "/admin/ib-management/commission", icon: "Settings" },
      { name: "Share Commission", href: "/admin/ib-management/share-commission", icon: "DollarSign" },
      { name: "Move Client to IB", href: "/admin/ib-management/move-client", icon: "UserRoundPlus" },
    ],
  },
  {
    name: "Group Management",
    href: "/admin/group-management",
    icon: "Layers",
    children: [
      { name: "Group List", href: "/admin/group-management/list", icon: "List" },
      { name: "Add Group", href: "/admin/group-management/add", icon: "Plus" },
      { name: "Leverage Settings", href: "/admin/group-management/leverage", icon: "Sliders" },
    ],
  },
  {
    name: "Transaction",
    href: "/admin/transaction",
    icon: "ArrowLeftRight",
    children: [
      { name: "Client Deposit", href: "/admin/transaction/client-deposit", icon: "ArrowDownToLine" },
      { name: "Client Withdraw", href: "/admin/transaction/client-withdraw", icon: "ArrowUpFromLine" },
      { name: "Wallet Deposit", href: "/admin/transaction/wallet-deposit", icon: "Wallet" },
      { name: "Wallet Withdraw", href: "/admin/transaction/wallet-withdraw", icon: "Wallet" },
      { name: "IB Withdraw", href: "/admin/transaction/ib-withdraw", icon: "Network" },
      { name: "Internal Transfer", href: "/admin/transaction/internal-transfer", icon: "ArrowLeftRight" },
      { name: "Pending Deposits", href: "/admin/transaction/pending-deposits", icon: "Clock" },
      { name: "Pending Withdrawals", href: "/admin/transaction/pending-withdrawals", icon: "Clock" },
      { name: "Pending IB Withdrawals", href: "/admin/transaction/ib-withdrawals", icon: "Clock" },
      { name: "Deposits", href: "/admin/transaction/deposits", icon: "ArrowDownToLine" },
      { name: "Withdrawals", href: "/admin/transaction/withdrawals", icon: "ArrowUpFromLine" },
      { name: "Transaction History", href: "/admin/transaction/history", icon: "History" },
    ],
  },
  {
    name: "Marketing",
    href: "/admin/marketing",
    icon: "Megaphone",
    children: [
      { name: "Add Marketing User", href: "/admin/marketing/add", icon: "UserPlus" },
      { name: "Marketing List", href: "/admin/marketing/list", icon: "Users" },
      { name: "Partners", href: "/admin/marketing/partners", icon: "Handshake" },
      { name: "Lead List", href: "/admin/marketing/lead-list", icon: "List" },
      { name: "Bulk Lead Upload", href: "/admin/marketing/bulk-lead", icon: "Upload" },
      { name: "Incentive Report", href: "/admin/marketing/incentive-report", icon: "DollarSign" },
      { name: "Withdraw Report", href: "/admin/marketing/withdraw-report", icon: "ArrowUpFromLine" },
      { name: "Campaigns", href: "/admin/marketing/campaigns", icon: "Target" },
      { name: "Tracking Links", href: "/admin/marketing/links", icon: "Link" },
    ],
  },
  {
    name: "Send Email",
    href: "/admin/send-email",
    icon: "Mail",
  },
  {
    name: "News",
    href: "/admin/news",
    icon: "Newspaper",
  },
  {
    name: "Notification",
    href: "/admin/notifications",
    icon: "Bell",
    badge: 13,
    children: [
      { name: "All Notifications", href: "/admin/notifications/all", icon: "Bell" },
      { name: "Send Notification", href: "/admin/notifications/send", icon: "Send" },
      { name: "Templates", href: "/admin/notifications/templates", icon: "FileText" },
    ],
  },
  {
    name: "Rewards Management",
    href: "/admin/rewards",
    icon: "Trophy",
    children: [
      { name: "Reward List", href: "/admin/rewards/list", icon: "List" },
      { name: "Create Reward", href: "/admin/rewards/create", icon: "Plus" },
      { name: "Reward History", href: "/admin/rewards/history", icon: "History" },
    ],
  },
  {
    name: "All Reports",
    href: "/admin/reports",
    icon: "FileBarChart",
    children: [
      { name: "IB Commission Report", href: "/admin/reports/ib-commission", icon: "DollarSign" },
      { name: "Reward History", href: "/admin/reports/reward-history", icon: "Trophy" },
      { name: "Deposit Report", href: "/admin/reports/deposits", icon: "ArrowDownToLine" },
      { name: "Withdraw Report", href: "/admin/reports/withdrawals", icon: "ArrowUpFromLine" },
      { name: "IB Withdraw Report", href: "/admin/reports/ib-withdraw", icon: "Wallet" },
      { name: "Internal Transfer", href: "/admin/reports/internal-transfer", icon: "ArrowLeftRight" },
      { name: "Wallet History", href: "/admin/reports/wallet-history", icon: "Wallet" },
      { name: "Position Report", href: "/admin/reports/position", icon: "TrendingUp" },
      { name: "History Report", href: "/admin/reports/history", icon: "History" },
      { name: "Login Activity", href: "/admin/reports/login-activity", icon: "UserCheck" },
      { name: "Lot Report", href: "/admin/reports/lot", icon: "BarChart3" },
      { name: "Client Report", href: "/admin/reports/clients", icon: "Users" },
      { name: "IB Report", href: "/admin/reports/ib", icon: "Network" },
      { name: "Trading Report", href: "/admin/reports/trading", icon: "TrendingUp" },
    ],
  },
  {
    name: "Risk Management Reports",
    href: "/admin/risk-management",
    icon: "ShieldAlert",
    children: [
      { name: "Risk Overview", href: "/admin/risk-management/overview", icon: "Shield" },
      { name: "Exposure Report", href: "/admin/risk-management/exposure", icon: "AlertTriangle" },
      { name: "Compliance", href: "/admin/risk-management/compliance", icon: "CheckCircle" },
    ],
  },
  {
    name: "Tickets",
    href: "/admin/tickets",
    icon: "Ticket",
  },
  {
    name: "Voice Jar",
    href: "/voice-jar",
    icon: "Mic",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: "Settings",
    children: [
      { name: "Deposit Bank Details", href: "/admin/settings/deposit-bank", icon: "Building" },
      { name: "Promotion List", href: "/admin/settings/promotion-list", icon: "Image" },
      { name: "PSP Setting", href: "/admin/settings/psp-setting", icon: "CreditCard" },
      { name: "Default Setting", href: "/admin/settings/default-setting", icon: "Settings" },
      { name: "IB Request Terms", href: "/admin/settings/ib-request-terms", icon: "FileText" },
      { name: "General", href: "/admin/settings/general", icon: "Settings" },
      { name: "Payment Methods", href: "/admin/settings/payment", icon: "CreditCard" },
      { name: "Email Templates", href: "/admin/settings/email-templates", icon: "Mail" },
      { name: "Platform Config", href: "/admin/settings/platform", icon: "Server" },
    ],
  },
  {
    name: "Sub Admin",
    href: "/admin/sub-admin",
    icon: "UserCog",
    children: [
      { name: "Admin List", href: "/admin/sub-admin/list", icon: "List" },
      { name: "Add Admin", href: "/admin/sub-admin/add", icon: "UserPlus" },
      { name: "Permissions", href: "/admin/sub-admin/permissions", icon: "Lock" },
    ],
  },
];
