"use client";

import PageShell from "@/components/PageShell";
import { Sliders } from "lucide-react";

const leverageOptions = ["1:50", "1:100", "1:200", "1:500", "1:1000"];

export default function LeverageSettingsPage() {
  return (
    <PageShell title="Leverage Settings" description="Configure leverage options for groups" icon={Sliders}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="space-y-4">
          {leverageOptions.map((lev, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 stat-card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-bold">{lev.split(":")[1]}</div>
                <span className="text-sm font-medium text-gray-700">{lev}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-sky-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
              </label>
            </div>
          ))}
        </div>
        <button className="btn-primary mt-6">Save Settings</button>
      </div>
    </PageShell>
  );
}
