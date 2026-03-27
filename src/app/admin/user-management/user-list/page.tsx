import UserList from "@/components/UserList";

export default function UserListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage all CRM users</p>
      </div>
      <UserList />
    </div>
  );
}
