import UserForm from "@/components/UserForm";

export default function AddUserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add User</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new CRM user account</p>
      </div>
      <UserForm />
    </div>
  );
}
