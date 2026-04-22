import {LoginPageClient} from "./LoginPageClient";

type LoginPageProps = Readonly<{
  params: Promise<{locale: string}>;
  searchParams?: Promise<{callbackUrl?: string; phoneNumber?: string; step?: string}>;
}>;

export default async function LoginPage({params, searchParams}: LoginPageProps) {
  const [{locale}, query] = await Promise.all([params, searchParams]);
  const callbackUrl = query?.callbackUrl ?? `/${locale}/dashboard`;
  const initialPhoneNumber = query?.phoneNumber;
  const initialStep = query?.step === "otp" ? "otp" : "phone";

  return <LoginPageClient callbackUrl={callbackUrl} initialPhoneNumber={initialPhoneNumber} initialStep={initialStep} />;
}
