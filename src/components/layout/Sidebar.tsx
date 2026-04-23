import Link from "next/link";

const navItems = [
  {label: "Dashboard", href: "/dashboard"},
  {label: "Appointments", href: "/appointments"},
  {label: "Results", href: "/results"},
  {label: "Messages", href: "/messages"},
  {label: "Profile", href: "/profile"},
  {label: "Family", href: "/family"},
];

type SidebarProps = {
  className?: string;
};

export function Sidebar({className}: SidebarProps) {
  return (
    <aside className={className}>
      <nav aria-label="Main navigation" className="h-full p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-secondary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
