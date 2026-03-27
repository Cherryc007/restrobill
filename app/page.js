"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiLogin, apiSeed } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Seed the database on first visit (idempotent — skips if already done)
    apiSeed()
      .then(() => setLoading(false))
      .catch(() => setLoading(false)); // If API unreachable, still show login
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username) {
      setError("Please enter username (admin or staff)");
      return;
    }

    try {
      const data = await apiLogin(username);

      // Store session in localStorage (keep existing pattern)
      const userSession = {
        ...data.user,
        restaurantId: data.user.restaurantId,
      };
      localStorage.setItem("restrobill_user", JSON.stringify(userSession));

      // Cache restaurant info
      if (data.restaurant) {
        localStorage.setItem("restrobill_restaurant", JSON.stringify(data.restaurant));
      }

      // Redirect based on role
      if (data.user.role === "Admin") {
        router.push("/dashboard");
      } else {
        router.push("/pos");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  if (loading) {
    return (
      <div className="container flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <p>Loading application data...</p>
      </div>
    );
  }

  return (
    <div className="container flex justify-center items-center" style={{ minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <img src="/logo.jpg" alt="Southall Kitchens Logo" style={{ height: '80px', width: 'auto', margin: '0 auto 1rem', objectFit: 'contain' }} />
          <h2>Welcome Back</h2>
          <p>Login to your restaurant account</p>
        </div>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</div>}
          
          <div>
            <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. admin or staff"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          
          <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '0.75rem' }}>
            Login to Account
          </button>
        </form>

        <div className="mt-4 text-center">
          <p style={{ fontSize: '0.875rem' }}>For demo, use <strong>admin</strong> or <strong>staff</strong> (no password required)</p>
        </div>
      </div>
    </div>
  );
}
