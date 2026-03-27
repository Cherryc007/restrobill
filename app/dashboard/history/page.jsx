"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import AuthGuard from "@/app/components/AuthGuard";
import { Search, ArrowLeft, Filter, Calendar } from "lucide-react";
import Link from "next/link";

export default function OrderHistoryPage() {
  const [user, setUser] = useState(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10)); // Today by default
  const [paymentFilter, setPaymentFilter] = useState("All"); // All, Cash, UPI / Card

  useEffect(() => {
    const userStr = localStorage.getItem("restrobill_user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  const receipts = useLiveQuery(() => 
    user ? db.receipts.where("restaurantId").equals(user.restaurantId).reverse().toArray() : []
  , [user]) || [];

  if (!user) return null;

  // Filter receipts
  let filteredReceipts = receipts;
  
  if (dateFilter) {
    filteredReceipts = filteredReceipts.filter(r => new Date(r.date).toISOString().slice(0, 10) === dateFilter);
  }

  if (paymentFilter !== "All") {
    filteredReceipts = filteredReceipts.filter(r => r.paymentMethod === paymentFilter || (paymentFilter === "UPI / Card" && r.paymentMethod !== "Cash"));
  }

  return (
    <AuthGuard requiredRole="Admin">
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1200px' }}>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn btn-outline" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={16} />
            </Link>
            <h2 style={{ margin: 0 }}>Order History</h2>
          </div>
        </div>

        <div className="card mb-6" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-secondary" />
            <strong>Filter by Date:</strong>
            <input 
              type="date" 
              className="input" 
              style={{ padding: '0.5rem', width: 'auto' }} 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2 border-l pl-4" style={{ borderColor: 'var(--border)' }}>
            <Filter size={18} className="text-secondary" />
            <strong>Payment Mode:</strong>
            <select 
              className="input" 
              style={{ padding: '0.5rem', width: 'auto' }}
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Cash">Cash</option>
              <option value="UPI / Card">UPI / Card</option>
            </select>
          </div>
          <div className="ml-auto">
            <button className="btn btn-outline text-secondary" onClick={() => {setDateFilter(""); setPaymentFilter("All");}}>Clear Filters</button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Bill No</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Date & Time</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Items</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Payment Mode</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Total</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{r.receiptNo}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem' }}>{new Date(r.date).toLocaleDateString()}</div>
                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{new Date(r.date).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {r.items.length} items
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className="badge" style={{ background: r.paymentMethod === 'Cash' ? '#ecfdf5' : '#eff6ff', color: r.paymentMethod === 'Cash' ? '#059669' : '#2563eb' }}>
                      {r.paymentMethod}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>₹{r.totalAmount.toFixed(2)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <Link href={`/invoice/${r.serverId || r.id}${r.synced ? '' : '?local=1'}`} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                      View / Reprint
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No bills found matching filters.</td>
                </tr>
              )}
            </tbody>
          </table>
          
          {filteredReceipts.length > 0 && (
            <div className="bg-slate-50 border-t p-4 flex justify-between" style={{ borderTopColor: 'var(--border)' }}>
              <span className="font-bold">Summary ({filteredReceipts.length} bills):</span>
              <span className="font-bold text-primary">₹{filteredReceipts.reduce((sum, r) => sum + r.totalAmount, 0).toFixed(2)} Total</span>
            </div>
          )}
        </div>

      </div>
    </AuthGuard>
  );
}
