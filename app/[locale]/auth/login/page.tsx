import {LoginPageClient} from "./LoginPageClient";

type LoginPageProps = Readonly<{
  params: Promise<{locale: string}>;
  searchParams?: Promise<{callbackUrl?: string}>;
}>;

export default async function LoginPage({params, searchParams}: LoginPageProps) {
  const [{locale}, query] = await Promise.all([params, searchParams]);
  const callbackUrl = query?.callbackUrl ?? `/${locale}/dashboard`;

  return <LoginPageClient callbackUrl={callbackUrl} />;
}
