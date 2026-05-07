import {getServerSession} from "next-auth";
import {authOptions} from "@/src/lib/auth";
import {DashboardPageClient} from "./DashboardPageClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isDemoPatient = session?.user?.isDemo === true && session.user.role === "patient";

  return <DashboardPageClient isDemoPatient={isDemoPatient} />;
}
