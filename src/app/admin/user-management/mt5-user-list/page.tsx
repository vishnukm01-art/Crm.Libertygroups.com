import MT5UserList from "@/components/MT5UserList";

export default function MT5UserListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MT5 Accounts</h1>
        <p className="text-gray-500 text-sm mt-1">View all users with MT5 trading accounts</p>
      </div>
      <MT5UserList />
    </div>
  );
}
