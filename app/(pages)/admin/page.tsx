import { redirect } from "next/navigation";
import { requireAdmin } from "@/libs/requireAdmin";

export default async function AdminPage() {
  await requireAdmin();
  redirect("/admin/stations");
}
