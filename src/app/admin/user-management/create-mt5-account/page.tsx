import MT5AccountForm from "@/components/MT5AccountForm";

export default function CreateMT5AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create MT5 Account</h1>
        <p className="text-gray-500 text-sm mt-1">Create a MetaTrader 5 trading account for a user</p>
      </div>
      <MT5AccountForm />
    </div>
  );
}
