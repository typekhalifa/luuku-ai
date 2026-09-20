import MainLayout from "@/layouts/MainLayout";
import OverviewPage from "@/pages/OverviewPage";
import AuthGate from "@/auth/AuthGate";

export default function App() {
  return (
    <AuthGate>
      <MainLayout>
        <OverviewPage />
      </MainLayout>
    </AuthGate>
  );
}
