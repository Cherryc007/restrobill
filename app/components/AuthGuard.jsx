"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children, requiredRole = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const userJson = localStorage.getItem("restrobill_user");
    if (!userJson) {
      if (pathname !== "/") {
        router.push("/");
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAuthorized(true);
      }
      return;
    }

    try {
      const user = JSON.parse(userJson);
      
      // If trying to access login page while logged in
      if (pathname === "/") {
        router.push(user.role === "Admin" ? "/dashboard" : "/pos");
        return;
      }

      // Check role
      if (requiredRole && user.role !== requiredRole && user.role !== "Admin") {
        router.push("/pos");
        return;
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(true);
    } catch (e) {
      router.push("/");
    }
  }, [pathname, router, requiredRole]);

  if (!authorized && pathname !== "/") {
    return (
      <div className="flex justify-center items-center" style={{ height: "60vh" }}>
        Loading...
      </div>
    );
  }

  return children;
}
