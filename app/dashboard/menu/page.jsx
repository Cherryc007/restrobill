"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, syncMenuFromServer } from "@/lib/db";
import { apiGetMenu, apiCreateMenuItem, apiUpdateMenuItem, apiDeleteMenuItem } from "@/lib/api";
import AuthGuard from "@/app/components/AuthGuard";
import { Plus, Edit2, Trash2, ArrowLeft, X } from "lucide-react";
import Link from "next/link";

export default function MenuManagementPage() {
  const [user, setUser] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [itemId, setItemId] = useState(null); // server ID for editing
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Main Course");
  const [gst, setGst] = useState("5");
  
  const [hasPortions, setHasPortions] = useState(false);
  const [price, setPrice] = useState("");
  const [portions, setPortions] = useState([{ name: "Full", price: "" }]);

  useEffect(() => {
    const userStr = localStorage.getItem("restrobill_user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      // Fetch from API and sync to Dexie cache
      apiGetMenu(u.restaurantId)
        .then(items => syncMenuFromServer(items))
        .catch(err => console.warn('API fetch failed, using local cache:', err.message));
    }
  }, []);

  const menuItems = useLiveQuery(() => 
    user ? db.menuItems.where("restaurantId").equals(user.restaurantId).toArray() : []
  , [user]) || [];

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !category) return;
    
    if (!hasPortions && !price) return alert("Please enter a price");
    if (hasPortions && portions.some(p => !p.name || !p.price)) return alert("Please fill all portion details");

    setSaving(true);
    try {
      const payload = {
        name,
        category,
        gstPercentage: parseFloat(gst),
        restaurantId: user.restaurantId,
        hasPortions,
        price: hasPortions ? 0 : parseFloat(price),
        portions: hasPortions ? portions.map(p => ({ name: p.name, price: parseFloat(p.price) })) : []
      };

      if (itemId) {
        // Update on server
        await apiUpdateMenuItem(itemId, payload);
      } else {
        // Create on server
        await apiCreateMenuItem(payload);
      }

      // Re-sync cache from server
      const items = await apiGetMenu(user.restaurantId);
      await syncMenuFromServer(items);
      
      resetForm();
    } catch (err) {
      alert("Failed to save item: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const editItem = (item) => {
    setItemId(item.serverId || item.id); // Use server ID
    setName(item.name);
    setCategory(item.category);
    setGst(item.gstPercentage.toString());
    setHasPortions(!!item.hasPortions);
    setPrice(item.price ? item.price.toString() : "");
    setPortions(item.portions?.length ? item.portions.map(p => ({...p, price: p.price.toString()})) : [{ name: "Full", price: "" }]);
    setIsAdding(true);
  };

  const deleteItem = async (item) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await apiDeleteMenuItem(item.serverId || item.id);
        // Re-sync cache from server
        const items = await apiGetMenu(user.restaurantId);
        await syncMenuFromServer(items);
      } catch (err) {
        alert("Failed to delete item: " + err.message);
      }
    }
  };

  const togglePause = async (item) => {
    try {
      await apiUpdateMenuItem(item.serverId || item.id, { isPaused: !item.isPaused });
      // Re-sync cache from server
      const items = await apiGetMenu(user.restaurantId);
      await syncMenuFromServer(items);
    } catch (err) {
      alert("Failed to update item: " + err.message);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setItemId(null);
    setName("");
    setCategory("Main Course");
    setHasPortions(false);
    setPrice("");
    setPortions([{ name: "Full", price: "" }]);
    setGst("5");
  };

  return (
    <AuthGuard requiredRole="Admin">
      <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1000px' }}>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="btn btn-outline" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={16} />
            </Link>
            <h2 style={{ margin: 0 }}>Menu Management</h2>
          </div>
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="btn btn-primary">
              <Plus size={16} /> Add New Item
            </button>
          )}
        </div>

        {isAdding && (
          <div className="card mb-8 animate-in" style={{ background: '#f8fafc', border: '1px solid var(--primary)' }}>
            <h3 className="mb-4">{itemId ? "Edit Menu Item" : "Add Menu Item"}</h3>
            <form onSubmit={handleSave} className="flex-col gap-4">
              
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="flex-col gap-2">
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Item Name</label>
                  <input required type="text" className="input" placeholder="e.g. Masala Dosa" value={name} onChange={e => setName(e.target.value)} />
                </div>
                
                <div className="flex-col gap-2">
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Category</label>
                  <input required type="text" className="input" placeholder="e.g. South Indian" value={category} onChange={e => setCategory(e.target.value)} />
                </div>
                
                <div className="flex-col gap-2">
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>GST (%)</label>
                  <select className="input" value={gst} onChange={e => setGst(e.target.value)}>
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 border-t pt-4" style={{ borderTopColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <input type="checkbox" id="hasPortions" checked={hasPortions} onChange={e => setHasPortions(e.target.checked)} />
                  <label htmlFor="hasPortions" className="font-bold">Item has multiple portions (e.g. Half/Full)?</label>
                </div>

                {!hasPortions ? (
                  <div className="flex-col gap-2 max-w-xs">
                    <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Single Price (₹)</label>
                    <input required type="number" min="0" step="0.01" className="input" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
                  </div>
                ) : (
                  <div className="flex-col gap-2">
                    <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Define Portions</label>
                    {portions.map((p, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <input required type="text" className="input flex-1" placeholder="Portion Name (Default: Half)" value={p.name} onChange={e => {
                          const newP = [...portions]; newP[index].name = e.target.value; setPortions(newP);
                        }} />
                        <input required type="number" min="0" step="0.01" className="input flex-1" placeholder="Price (₹)" value={p.price} onChange={e => {
                          const newP = [...portions]; newP[index].price = e.target.value; setPortions(newP);
                        }} />
                        {portions.length > 1 && (
                          <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.5rem' }} onClick={() => setPortions(portions.filter((_, i) => i !== index))}>
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="btn btn-outline mt-2 text-sm" onClick={() => setPortions([...portions, {name: '', price: ''}])}>
                      <Plus size={14} /> Add Portion
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={resetForm} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : (itemId ? "Update Item" : "Save Item")}</button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Item Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Category</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>Pricing Detail</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b' }}>GST</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50" style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {item.name} {item.isPaused && <span className="badge badge-offline ml-2" style={{ marginLeft: '0.5rem' }}>Paused</span>}
                  </td>
                  <td style={{ padding: '1rem' }}><span className="badge badge-success">{item.category}</span></td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {item.hasPortions ? (
                      <div>
                        {item.portions?.map(p => (
                          <div key={p.name}><span className="text-secondary">{p.name}:</span> ₹{p.price.toFixed(2)}</div>
                        ))}
                      </div>
                    ) : (
                      <span>₹{item.price?.toFixed(2)}</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>{item.gstPercentage}%</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button onClick={() => togglePause(item)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }}>
                      {item.isPaused ? "Resume" : "Pause"}
                    </button>
                    <button onClick={() => editItem(item)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteItem(item)} className="btn outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {menuItems.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No menu items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </AuthGuard>
  );
}
