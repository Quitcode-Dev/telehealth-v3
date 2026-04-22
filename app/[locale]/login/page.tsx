type LoginPageProps = Readonly<{
  searchParams?: Promise<{callbackUrl?: string}>;
}>;

export default async function LoginPage({searchParams}: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="text-sm text-muted-foreground">
        Authenticate with your phone number and SMS OTP via the NextAuth credentials provider.
      </p>
      {params?.callbackUrl ? (
        <p className="text-xs text-muted-foreground">
          After sign in, you will be redirected to: <span className="font-mono">{params.callbackUrl}</span>
        </p>
      ) : null}
    </main>
  );
}
