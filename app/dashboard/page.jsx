"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, syncReceiptsFromServer, getUnsyncedReceipts } from "@/lib/db";
import { apiGetReceipts, apiSyncReceipts } from "@/lib/api";
import AuthGuard from "@/app/components/AuthGuard";
import { TrendingUp, FileText, WifiOff, AlertCircle, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("restrobill_user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      // Fetch receipts from API and sync to Dexie cache
      apiGetReceipts(u.restaurantId)
        .then(receipts => syncReceiptsFromServer(receipts))
        .catch(err => console.warn('API fetch failed, using local cache:', err.message));
    }

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const receipts = useLiveQuery(() => 
    user ? db.receipts.where("restaurantId").equals(user.restaurantId).reverse().toArray() : []
  , [user]) || [];

  const handleSyncBills = async () => {
    if (!isOnline) return alert("Cannot sync while offline.");
    
    try {
      // Get locally-cached unsynced receipts
      const unsynced = await getUnsyncedReceipts();
      if (unsynced.length === 0) return alert("All bills are already synced!");

      // Push to server
      const result = await apiSyncReceipts(unsynced);
      
      // Mark local copies as synced
      await Promise.all(unsynced.map(r => db.receipts.update(r.id, { synced: 1 })));
      alert(`Successfully synced ${result.inserted} bills to cloud.`);
    } catch (e) {
      alert("Sync failed: " + e.message);
    }
  };

  const todayReceipts = receipts.filter(r => new Date(r.date).toDateString() === new Date().toDateString());
  const todayRevenue = todayReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const todayCash = todayReceipts
    .filter(r => r.paymentMethod === 'Cash')
    .reduce((sum, r) => sum + r.totalAmount, 0);
  const todayUPI = todayReceipts
    .filter(r => r.paymentMethod !== 'Cash')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const unsyncedCount = receipts.filter(r => !r.synced).length;

  // Product Analysis
  const productSales = receipts.reduce((acc, r) => {
    r.items.forEach(item => {
      if (!acc[item.name]) acc[item.name] = { qty: 0, revenue: 0 };
      acc[item.name].qty += item.qty;
      acc[item.name].revenue += (item.price * item.qty);
    });
    return acc;
  }, {});

  const topProducts = Object.entries(productSales)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  return (
    <AuthGuard requiredRole="Admin">
      <div className="container" style={{ padding: '2rem 1rem' }}>
        
        <div className="flex justify-between items-center mb-6">
          <h2>Admin Dashboard</h2>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/analytics" className="btn btn-outline" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              Advanced Analytics Mode
            </Link>
            <span className={`badge ${isOnline ? 'badge-success' : 'badge-offline'} flex items-center gap-1`}>
              {!isOnline && <WifiOff size={14} />}
              {isOnline ? 'Online' : 'Offline Mode Active'}
            </span>
          </div>
        </div>

        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          
          <div className="card flex items-center gap-4 border-l-4" style={{ borderLeftColor: 'var(--primary)', padding: '1.5rem' }}>
            <div className="bg-blue-100 text-blue-600 rounded-full" style={{ padding: '1rem', background: '#e0f2fe', color: '#2563eb' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>Today&apos;s Revenue</p>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>₹{todayRevenue.toFixed(2)}</h3>
              <div className="flex gap-2 mt-2" style={{ fontSize: '0.75rem' }}>
                <span className="badge" style={{ background: '#ecfdf5', color: '#059669' }}>Cash: ₹{todayCash.toFixed(2)}</span>
                <span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>UPI/Card: ₹{todayUPI.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card flex items-center gap-4 border-l-4" style={{ borderLeftColor: 'var(--success)', padding: '1.5rem' }}>
            <div className="bg-green-100 text-green-600 rounded-full" style={{ padding: '1rem', background: '#dcfce7', color: '#16a34a' }}>
              <FileText size={24} />
            </div>
            <div>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>Total Bills</p>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{receipts.length}</h3>
            </div>
          </div>

          <div className="card flex items-center gap-4 border-l-4" style={{ borderLeftColor: unsyncedCount > 0 ? 'var(--danger)' : '#cbd5e1', padding: '1.5rem' }}>
            <div className="bg-red-100 text-red-600 rounded-full" style={{ padding: '1rem', background: '#fee2e2', color: '#dc2626' }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.875rem' }}>Pending Cloud Sync</p>
              <div className="flex items-center gap-2">
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{unsyncedCount}</h3>
                {unsyncedCount > 0 && isOnline && (
                  <button onClick={handleSyncBills} className="btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: 'var(--primary)' }}>Sync Now</button>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: 'revert' }}>
          {/* Top Products Analysis */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2" style={{ margin: 0 }}><BarChart3 size={20} className="text-primary"/> Top Selling Products</h3>
              <Link href="/dashboard/menu" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>Manage Menu</Link>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#64748b' }}>Item Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#64748b', textAlign: 'center' }}>Total Qty Sold</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map(([name, stats]) => (
                  <tr key={name} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{name}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{stats.qty}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>₹{stats.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No sales data yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3>Recent Transactions</h3>
              <div className="flex gap-2">
                <Link href="/dashboard/history" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>View Order History</Link>
                <Link href="/pos" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Open POS Terminal</Link>
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Bill No</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Date & Time</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Payment</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Total</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.slice(0, 5).map((r) => (
                    <tr key={r.id || r.receiptNo} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>{r.receiptNo}</td>
                      <td style={{ padding: '1rem' }}>{new Date(r.date).toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge" style={{ background: r.paymentMethod === 'Cash' ? '#ecfdf5' : '#eff6ff', color: r.paymentMethod === 'Cash' ? '#059669' : '#2563eb' }}>
                          {r.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>₹{r.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: '1rem' }}>
                        {r.synced ? (
                          <span style={{ color: '#10b981', fontSize: '0.875rem' }}>Synced</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>Pending Sync</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <Link href={`/invoice/${r.serverId || r.id}${r.synced ? '' : '?local=1'}`} className="text-primary hover:underline" style={{ fontSize: '0.875rem' }}>View</Link>
                      </td>
                    </tr>
                  ))}
                  {receipts.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AuthGuard>
  );
}
