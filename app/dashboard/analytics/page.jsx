"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import AuthGuard from "@/app/components/AuthGuard";
import { ArrowLeft, PieChart as PieChartIcon, BarChart as BarChartIcon } from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

export default function AnalyticsPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("restrobill_user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  const receipts = useLiveQuery(() => 
    user ? db.receipts.where("restaurantId").equals(user.restaurantId).toArray() : []
  , [user]) || [];

  if (!user) return null;

  // Process Daily Revenue Data
  const dailyDataMap = receipts.reduce((acc, r) => {
    const dateStr = new Date(r.date).toLocaleDateString();
    acc[dateStr] = (acc[dateStr] || 0) + r.totalAmount;
    return acc;
  }, {});

  const dailyTrendData = Object.entries(dailyDataMap)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Process Product Sales
  const productDataMap = receipts.reduce((acc, r) => {
    r.items.forEach(item => {
      acc[item.name] = (acc[item.name] || 0) + (item.qty * item.price);
    });
    return acc;
  }, {});

  const topProductsData = Object.entries(productDataMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8); // Top 8

  return (
    <AuthGuard requiredRole="Admin">
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1200px' }}>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn btn-outline" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={16} />
            </Link>
            <h2 style={{ margin: 0 }}>Advanced Analytics</h2>
          </div>
        </div>

        <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))' }}>
          
          <div className="card" style={{ padding: '1.5rem', height: '400px' }}>
            <h3 className="mb-4 flex items-center gap-2"><BarChartIcon size={20} className="text-primary"/> Daily Revenue Trend</h3>
            {dailyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={dailyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full text-secondary">No data available</div>
            )}
          </div>

          <div className="card" style={{ padding: '1.5rem', height: '400px' }}>
            <h3 className="mb-4 flex items-center gap-2"><PieChartIcon size={20} className="text-primary"/> Revenue by Product (Top 8)</h3>
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={topProductsData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => `₹${value}`} />
                  <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                  <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue generated']} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full text-secondary">No data available</div>
            )}
          </div>

        </div>

      </div>
    </AuthGuard>
  );
}
