import { AdminPage } from "@/components/admin-page";

export const metadata = {
  title: "Painel admin",
  robots: { index: false, follow: false },
};

export default function AdminRoute() {
  return <AdminPage />;
}
