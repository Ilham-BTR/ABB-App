import { Link, useLocation } from "react-router-dom";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", exact: true },
  { href: "/admin/maps", label: "Maps", exact: true },
  { href: "/admin", label: "Visits", exact: true },
  { href: "/admin/stores", label: "Stores", exact: true },
  { href: "/admin/stores/new", label: "Add / Import", exact: false },
];

export function AdminNav({ superadmin = false }: { superadmin?: boolean }) {
  const { pathname } = useLocation();
  const links = superadmin
    ? [
        ...LINKS,
        { href: "/admin/kunjungan-update", label: "Update Visits", exact: true },
        { href: "/admin/users", label: "Manage Users", exact: true },
      ]
    : LINKS;

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            to={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition ${
              active
                ? "bg-white text-brand"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
