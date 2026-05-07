import {getTranslations} from "next-intl/server";
import {DemoExperienceCard} from "@/src/components/demo/DemoExperienceCard";

type AdminPageProps = {
  params: Promise<{locale: string}>;
};

export default async function AdminPage({params}: AdminPageProps) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminDemoPage"});

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <DemoExperienceCard
        title={t("card.title")}
        description={t("card.description")}
        highlights={[t("highlights.proxyApprovals"), t("highlights.bookings"), t("highlights.auditReadiness")]}
        actions={[
          {href: `/${locale}/admin/bookings`, label: t("actions.reviewBookings")},
          {href: `/${locale}/admin/proxy-approvals`, label: t("actions.openProxyApprovals")},
        ]}
      />
    </div>
  );
}
