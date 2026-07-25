import {
  Building2,
  Users,
  Briefcase,
  Activity,
} from "lucide-react";

import {
  DashboardLayout,
  MissionHero,
  TopNavigation,
} from "@/shared/components/layout";

import {
  KPICard,
} from "@/features/dashboard";

import {
  useCRM,
} from "@/features/crm";

export default function CRMPage() {

  const {

    data,

    loading,

    error,

  } = useCRM();

  if (loading) {

    return (

      <div className="flex h-screen items-center justify-center text-neutral-400">

        Loading CRM...

      </div>

    );

  }

  if (error) {

    return (

      <div className="flex h-screen items-center justify-center text-red-400">

        {error.message}

      </div>

    );

  }

  return (

    <DashboardLayout>

      <TopNavigation />

      <MissionHero />

      <div className="mt-10 space-y-10">

        <div>

          <h1 className="text-4xl font-bold">

            CRM

          </h1>

          <p className="mt-2 text-neutral-400">

            Manage companies, contacts, deals and activities.

          </p>

        </div>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          <KPICard
            title="Companies"
            value={data?.companies ?? 0}
            subtitle="Registered Companies"
            icon={Building2}
            trend="Connected"
          />

          <KPICard
            title="Contacts"
            value={data?.contacts ?? 0}
            subtitle="Business Contacts"
            icon={Users}
            trend="Connected"
          />

          <KPICard
            title="Deals"
            value={data?.deals ?? 0}
            subtitle="Open Opportunities"
            icon={Briefcase}
            trend="Connected"
          />

          <KPICard
            title="Activities"
            value={data?.activities ?? 0}
            subtitle="CRM Activities"
            icon={Activity}
            trend="Connected"
          />

        </section>

      </div>

    </DashboardLayout>

  );

}