"use client";

import Navigation from "@/components/Navigation";
import Header from "@/components/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <div className="lg:ml-[260px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 pt-6 page-transition">
          {children}
        </main>
      </div>
    </div>
  );
}
