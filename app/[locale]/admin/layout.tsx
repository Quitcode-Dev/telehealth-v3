import {getServerSession} from "next-auth";
import {redirect} from "next/navigation";
import Link from "next/link";
import type {ReactNode} from "react";
import {authOptions, ADMIN_ROLE} from "@/src/lib/auth";

const adminNavItems = [
  {label: "Proxy Approvals", href: "proxy-approvals"},
  {label: "Booking Queue", href: "booking-queue"},
  {label: "Patient Search", href: "patient-search"},
];

type AdminLayoutProps = {
  children: ReactNode;
  params: Promise<{locale: string}>;
};

export default async function AdminLayout({children, params}: AdminLayoutProps) {
  const {locale} = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== ADMIN_ROLE) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1">
        <aside className="hidden w-64 border-r border-border lg:block">
          <nav aria-label="Admin navigation" className="h-full p-4">
            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin Panel
            </p>
            <ul className="space-y-2">
              {adminNavItems.map((item) => (
                <li key={item.label}>
                  <Link
                    href={`/${locale}/admin/${item.href}`}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
