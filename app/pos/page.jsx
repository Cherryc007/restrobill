"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Plus, Minus, X, CreditCard, Banknote } from "lucide-react";
import AuthGuard from "@/app/components/AuthGuard";
import { useRouter } from "next/navigation";

export default function POSPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");

  // Cart & Modifiers State
  const [cart, setCart] = useState([]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [discount, setDiscount] = useState(0);

  // Portion Modal State
  const [portionItem, setPortionItem] = useState(null);

  const menuItems = useLiveQuery(() =>
    user ? db.menuItems.where("restaurantId").equals(user.restaurantId).toArray() : []
    , [user]) || [];

  useEffect(() => {
    const userStr = localStorage.getItem("restrobill_user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  const activeMenuItems = menuItems.filter(i => !i.isPaused);
  const categories = ["All", ...new Set(activeMenuItems.map(item => item.category))];
  const filteredItems = activeCategory === "All" ? activeMenuItems : activeMenuItems.filter(item => item.category === activeCategory);

  const handleItemClick = (item) => {
    if (item.hasPortions) {
      setPortionItem(item); // Open Portion Selector Modal
    } else {
      addToCart(item, item.name, item.price);
    }
  };

  const addToCart = (item, displayName, displayPrice) => {
    setCart(prev => {
      // Use displayName as unique cart key so Half/Full are treated separately
      const existing = prev.find(i => i.cartId === displayName);
      if (existing) {
        return prev.map(i => i.cartId === displayName ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        ...item,
        cartId: displayName,
        name: displayName,
        price: displayPrice,
        qty: 1
      }];
    });
    setPortionItem(null); // Close modal if open
  };

  const updateQty = (cartId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const clearCart = () => {
    if (confirm("Clear current bill?")) {
      setCart([]);
      setDiscount(0);
    }
  };

  // Cart Math
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const taxDetails = cart.reduce((taxes, item) => {
    if (!gstEnabled) return taxes;
    const itemTax = (item.price * item.qty) * (item.gstPercentage / 100);
    taxes[item.gstPercentage] = (taxes[item.gstPercentage] || 0) + itemTax;
    return taxes;
  }, {});
  const totalTax = Object.values(taxDetails).reduce((sum, tax) => sum + tax, 0);

  const discountAmount = subtotal * (discount / 100);
  const totalAmount = Math.max(0, subtotal + totalTax - discountAmount);

  const checkout = async (method) => {
    if (cart.length === 0) return;

    // eslint-disable-next-line react-hooks/purity
    const receiptNo = `INV-${Date.now().toString().slice(-6)}`;
    const receipt = {
      receiptNo,
      restaurantId: user.restaurantId,
      items: cart,
      subtotal,
      totalTax,
      discount: discountAmount,
      discountPercentage: discount,
      gstEnabled,
      totalAmount,
      paymentMethod: method,
      date: new Date().toISOString(),
      synced: 0 // offline first
    };

    try {
      const id = await db.receipts.add(receipt);
      setCart([]);
      setDiscount(0);
      router.push(`/invoice/${id}`);
    } catch (e) {
      alert("Error saving bill");
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <AuthGuard>
      <div className="container" style={{ padding: '1rem', maxWidth: '1400px' }}>
        <div className="pos-grid">

          {/* Main POS Menu Section */}
          <div className="flex-col gap-4">
            <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: '99px', whiteSpace: 'nowrap' }}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="item-grid mt-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="card card-interactive flex flex-col justify-between"
                  style={{ padding: '1rem', userSelect: 'none' }}
                  onClick={() => handleItemClick(item)}
                >
                  <div>
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{item.name}</h3>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{item.category}</span>
                  </div>
                  <div className="mt-4 font-bold text-primary" style={{ fontSize: '1.25rem' }}>
                    {item.hasPortions ? "Multiple Portions" : `₹${item.price.toFixed(2)}`}
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && <p>No items found.</p>}
            </div>
          </div>

          {/* Cart Section */}
          <div className="card flex flex-col" style={{ padding: '0', height: '100%', overflow: 'hidden' }}>
            <div className="bg-slate-50 border-b border-gray-200" style={{ padding: '1rem', borderBottomColor: 'var(--border)' }}>
              <div className="flex justify-between items-center">
                <h2 style={{ margin: 0 }}>Current Bill</h2>
                <button onClick={clearCart} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}>Clear</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: '1rem' }}>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-secondary">
                  <p>Cart is empty.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {cart.map(item => (
                    <div key={item.cartId} className="flex justify-between items-center bg-slate-50 rounded" style={{ padding: '0.75rem' }}>
                      <div className="flex-1">
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>₹{item.price} x {item.qty}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.cartId, -1)} className="btn btn-outline" style={{ padding: '0.25rem', borderRadius: '50%' }}><Minus size={16} /></button>
                        <span style={{ width: '2rem', textAlign: 'center', fontWeight: 'bold' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.cartId, 1)} className="btn btn-outline" style={{ padding: '0.25rem', borderRadius: '50%' }}><Plus size={16} /></button>
                      </div>
                      <div style={{ width: '4rem', textAlign: 'right', fontWeight: 'bold' }}>₹{item.price * item.qty}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modifiers & Totals */}
            <div className="bg-slate-50 border-t border-gray-200" style={{ padding: '1rem', borderTopColor: 'var(--border)' }}>

              <div className="flex justify-between items-center mb-4 pb-4 border-b" style={{ borderBottomColor: 'var(--border)' }}>
                <label className="flex items-center gap-2 cursor-pointer font-bold" style={{ fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} /> Apply GST
                </label>
                <div className="flex items-center gap-2" style={{ fontSize: '0.875rem' }}>
                  <strong>Discount (%):</strong>
                  <input type="number" min="0" max="100" className="input" style={{ width: '80px', padding: '0.25rem' }} value={discount} onChange={e => setDiscount(Number(e.target.value) || 0)} />
                </div>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-secondary">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              {gstEnabled && Object.entries(taxDetails).map(([rate, amt]) => (
                <div key={rate} className="flex justify-between mb-2">
                  <span className="text-secondary">GST ({rate}%)</span>
                  <span>₹{amt.toFixed(2)}</span>
                </div>
              ))}

              {discount > 0 && (
                <div className="flex justify-between mb-2 text-danger">
                  <span>Discount ({discount}%)</span>
                  <span>- ₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between mt-4 pt-4 border-t" style={{ borderTopColor: 'var(--border)' }}>
                <span className="font-bold" style={{ fontSize: '1.25rem' }}>Total</span>
                <span className="font-bold text-primary" style={{ fontSize: '1.5rem' }}>₹{totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={() => checkout('Cash')} disabled={cart.length === 0} className="btn btn-primary flex-1 py-3" style={{ fontSize: '1rem' }}>
                  <Banknote size={20} /> Cash
                </button>
                <button onClick={() => checkout('UPI / Card')} disabled={cart.length === 0} className="btn bg-slate-800 text-white flex-1 py-3" style={{ fontSize: '1rem', background: '#ca7403ff' }}>
                  <CreditCard size={20} /> UPI / Card
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Portion Selection Modal */}
      {portionItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center" style={{ zIndex: 50, background: 'rgba(0,0,0,0.5)' }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: '350px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>Select Portion</h3>
              <button onClick={() => setPortionItem(null)} className="btn btn-outline" style={{ border: 'none' }}><X size={20} /></button>
            </div>
            <p className="mb-4 text-secondary">{portionItem.name}</p>
            <div className="flex-col gap-2">
              {portionItem.portions?.map(p => (
                <button
                  key={p.name}
                  onClick={() => addToCart(portionItem, `${portionItem.name} (${p.name})`, p.price)}
                  className="btn btn-outline w-full flex justify-between px-4 py-3"
                  style={{ fontSize: '1rem' }}
                >
                  <span>{p.name}</span>
                  <span className="font-bold">₹{p.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
