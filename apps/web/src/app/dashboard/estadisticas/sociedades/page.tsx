import { redirect } from "next/navigation";

// Societies now live in the stats "Química" tab; keep old links working.
export default function DashboardSocietiesPage() {
  redirect("/dashboard/estadisticas?tab=quimica");
}
