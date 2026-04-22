const navItems = ["Dashboard", "Appointments", "Results", "Messages", "Profile"];

type SidebarProps = {
  className?: string;
};

export function Sidebar({className}: SidebarProps) {
  return (
    <aside className={className}>
      <nav aria-label="Main navigation" className="h-full p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item}>
              <a
                href="#"
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
