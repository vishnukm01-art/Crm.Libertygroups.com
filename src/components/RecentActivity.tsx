"use client";

import { Clock, User, Monitor } from "lucide-react";

interface Activity {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  createdAt: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

const iconForAction = (action: string) => {
  if (action.includes("MT5") || action.includes("mt5")) return Monitor;
  if (action.includes("USER") || action.includes("user")) return User;
  return Clock;
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-sky-400" />
          </div>
          <p className="text-sm text-gray-400">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = iconForAction(activity.action);
            return (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-sky-50/50 transition-colors duration-200">
                <div className="bg-sky-50 p-2 rounded-lg">
                  <Icon className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-gray-500 truncate">{activity.details || activity.entity}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
