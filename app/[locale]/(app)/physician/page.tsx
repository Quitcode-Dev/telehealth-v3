import {getServerSession} from "next-auth";
import {getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import {DemoExperienceCard} from "@/src/components/demo/DemoExperienceCard";
import {authOptions} from "@/src/lib/auth";

type PhysicianPageProps = {
  params: Promise<{locale: string}>;
};

export default async function PhysicianPage({params}: PhysicianPageProps) {
  const {locale} = await params;
  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations({locale, namespace: "PhysicianDemoPage"}),
  ]);

  if (!session?.user || session.user.role !== "physician" || !session.user.isDemo) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <DemoExperienceCard
        title={t("card.title")}
        description={t("card.description")}
        highlights={[t("highlights.schedule"), t("highlights.queue"), t("highlights.messages")]}
        actions={[
          {href: `/${locale}/appointments`, label: t("actions.viewPatientSchedule")},
          {href: `/${locale}/messages`, label: t("actions.openMessages")},
        ]}
      />
    </div>
  );
}
