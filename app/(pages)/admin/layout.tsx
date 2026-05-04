import type { ReactNode } from "react";
import { requireAdmin } from "@/libs/requireAdmin";
import AdminTabs from "./AdminTabs";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex-1 min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Operations dashboard for platform-wide monitoring and management.
        </p>
      </div>

      <AdminTabs />

      <div className="p-6">{children}</div>
    </div>
  );
}
