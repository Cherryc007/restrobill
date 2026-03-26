"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, initializeDemoData } from "@/lib/db";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Prep offline DB on load
    initializeDemoData().then(() => setLoading(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username) {
      setError("Please enter username (admin or staff)");
      return;
    }

    try {
      const user = await db.users.where("username").equalsIgnoreCase(username).first();
      
      if (user) {
        // Store session simply in localStorage for this MVP
        localStorage.setItem("restrobill_user", JSON.stringify(user));
        
        // Redirect based on role
        if (user.role === "Admin") {
          router.push("/dashboard");
        } else {
          router.push("/pos");
        }
      } else {
        setError("User not found. Try 'admin' or 'staff'.");
      }
    } catch (err) {
      setError("Login failed: " + err.message);
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
