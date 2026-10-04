import { Suspense } from "react";
import { ResetPasswordPage } from "@/components/reset-password-page";

export const metadata = {
  title: "Criar senha nova",
  robots: { index: false, follow: false },
};

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}
