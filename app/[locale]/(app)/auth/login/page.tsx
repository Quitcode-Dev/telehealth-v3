import {LoginPageClient} from "./LoginPageClient";
import {getDemoLoginOptions} from "@/src/lib/demo-auth";

type LoginPageProps = Readonly<{
  params: Promise<{locale: string}>;
  searchParams?: Promise<{callbackUrl?: string; phoneNumber?: string; step?: string}>;
}>;

export default async function LoginPage({params, searchParams}: LoginPageProps) {
  const [{locale}, query] = await Promise.all([params, searchParams]);
  const callbackUrl = query?.callbackUrl ?? `/${locale}/dashboard`;
  const initialPhoneNumber = query?.phoneNumber;
  const initialStep = query?.step === "otp" ? "otp" : "phone";
  const demoLogins = getDemoLoginOptions(locale);

  return <LoginPageClient callbackUrl={callbackUrl} initialPhoneNumber={initialPhoneNumber} initialStep={initialStep} demoLogins={demoLogins} />;
}
