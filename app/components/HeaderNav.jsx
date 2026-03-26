"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";

export default function HeaderNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("restrobill_user");
    if (userStr) setUser(JSON.parse(userStr));
  }, [pathname]); // Refresh on route change

  const handleLogout = () => {
    localStorage.removeItem("restrobill_user");
    setUser(null);
    router.push("/");
  };

  if (!user && pathname === "/") {
    return null; // Don't show nav on login screen
  }

  return (
    <nav className="flex items-center gap-4">
      <Link href="/pos" className="btn btn-primary" style={{ textDecoration: 'none' }}>
        POS Terminal
      </Link>
      {user?.role === "Admin" && (
        <Link href="/dashboard" className="btn btn-outline" style={{ textDecoration: 'none', background: 'var(--surface)' }}>
          Dashboard
        </Link>
      )}
      
      {user && (
        <div className="flex items-center gap-4 ml-4 pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 text-secondary" style={{ fontSize: '0.875rem' }}>
            <User size={16} />
            {user.username} ({user.role})
          </div>
          <button onClick={handleLogout} className="btn" style={{ background: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.5rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </nav>
  );
}
