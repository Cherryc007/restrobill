"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, syncMenuFromServer, saveReceiptOnline } from "@/lib/db";
import { apiGetMenu, apiCreateReceipt } from "@/lib/api";
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

  // Use Dexie as reactive cache — data is populated from API on mount
  const menuItems = useLiveQuery(() =>
    user ? db.menuItems.where("restaurantId").equals(user.restaurantId).toArray() : []
    , [user]) || [];

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

  const activeMenuItems = menuItems.filter(i => !i.isPaused);
  const categories = ["All", ...new Set(activeMenuItems.map(item => item.category))];
  const filteredItems = activeCategory === "All" ? activeMenuItems : activeMenuItems.filter(item => item.category === activeCategory);

  const handleItemClick = (item) => {
    if (item.hasPortions) {
      setPortionItem(item);
    } else {
      addToCart(item, item.name, item.price);
    }
  };

  const addToCart = (item, displayName, displayPrice) => {
    setCart(prev => {
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
    setPortionItem(null);
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

  // Format portion prices for display (e.g. "₹250/₹400")
  const formatPortionPrices = (item) => {
    if (!item.portions || item.portions.length === 0) return "—";
    return item.portions.map(p => `₹${p.price}`).join("/");
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

    const receiptNo = `INV-${Date.now().toString().slice(-7)}`;
    const receipt = {
      receiptNo,
      restaurantId: user.restaurantId,
      items: cart.map(({ cartId, serverId, id, ...rest }) => rest), // Clean cart items
      subtotal,
      totalTax,
      discount: discountAmount,
      discountPercentage: discount,
      gstEnabled,
      totalAmount,
      paymentMethod: method,
      date: new Date().toISOString(),
      synced: 0,
    };

    try {
      console.log('Starting checkout for receipt:', receiptNo);
      // Use the helper from lib/db.js to handle online/offline logic
      const result = await saveReceiptOnline(apiCreateReceipt, receipt);
      
      setCart([]);
      setDiscount(0);
      
      // Navigate to invoice using the server _id if available, else local id
      const invoiceId = result._id || result.id;
      console.log('Navigating to invoice:', invoiceId);
      router.push(`/invoice/${invoiceId}${result._id ? '' : '?local=1'}`);
    } catch (err) {
      alert("Error saving bill: " + err.message);
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <AuthGuard>
      <div style={{ padding: '0.75rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="pos-grid">

          {/* Main POS Menu Section */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '0.5rem', flexShrink: 0 }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: '99px', whiteSpace: 'nowrap', fontSize: '0.875rem', padding: '0.4rem 0.75rem' }}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="menu-scroll" style={{ marginTop: '0.5rem' }}>
              <div className="item-grid">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="card card-interactive"
                    style={{ padding: '0.75rem', userSelect: 'none', cursor: 'pointer' }}
                    onClick={() => handleItemClick(item)}
                  >
                    <h3 style={{ fontSize: '0.95rem', marginBottom: '0.15rem', lineHeight: 1.3 }}>{item.name}</h3>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{item.category}</span>
                    <div style={{ marginTop: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                      {item.hasPortions ? formatPortionPrices(item) : `₹${item.price}`}
                    </div>
                  </div>
                ))}
                {filteredItems.length === 0 && <p>No items found.</p>}
              </div>
            </div>
          </div>

          {/* Cart Section */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 0 }}>
            <div className="cart-container">
              <div className="cart-header" style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <div className="flex justify-between items-center">
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Current Bill</h2>
                  <button onClick={clearCart} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', color: 'var(--danger)', fontSize: '0.8rem' }}>Clear</button>
                </div>
              </div>

              <div className="cart-items">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-secondary" style={{ padding: '2rem 0' }}>
                    <p>Cart is empty. Tap items to add.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cart.map(item => (
                      <div key={item.cartId} className="flex justify-between items-center" style={{ padding: '0.5rem 0.6rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>₹{item.price} × {item.qty}</div>
                        </div>
                        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                          <button onClick={() => updateQty(item.cartId, -1)} className="btn btn-outline" style={{ padding: '0.15rem', borderRadius: '50%', width: '26px', height: '26px' }}><Minus size={14} /></button>
                          <span style={{ width: '1.5rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.cartId, 1)} className="btn btn-outline" style={{ padding: '0.15rem', borderRadius: '50%', width: '26px', height: '26px' }}><Plus size={14} /></button>
                        </div>
                        <div style={{ width: '3.5rem', textAlign: 'right', fontWeight: 'bold', fontSize: '0.875rem', flexShrink: 0 }}>₹{item.price * item.qty}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cart-footer" style={{ padding: '0.75rem 1rem', background: '#f8fafc' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    <input type="checkbox" checked={gstEnabled} onChange={e => setGstEnabled(e.target.checked)} /> GST
                  </label>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
                    <strong>Disc %:</strong>
                    <input type="number" min="0" max="100" className="input" style={{ width: '55px', padding: '0.2rem 0.3rem', fontSize: '0.8rem' }} value={discount} onChange={e => setDiscount(Number(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="flex justify-between" style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                  <span className="text-secondary">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>

                {gstEnabled && Object.entries(taxDetails).map(([rate, amt]) => (
                  <div key={rate} className="flex justify-between" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                    <span className="text-secondary">GST ({rate}%)</span>
                    <span>₹{amt.toFixed(2)}</span>
                  </div>
                ))}

                {discount > 0 && (
                  <div className="flex justify-between" style={{ marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--danger)' }}>
                    <span>Discount ({discount}%)</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Total</span>
                  <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>₹{totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex gap-2" style={{ marginTop: '0.75rem' }}>
                  <button onClick={() => checkout('Cash')} disabled={cart.length === 0} className="btn btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem' }}>
                    <Banknote size={18} /> Cash
                  </button>
                  <button onClick={() => checkout('UPI / Card')} disabled={cart.length === 0} className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', background: '#ca7403', color: 'white' }}>
                    <CreditCard size={18} /> UPI / Card
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Portion Selection Modal */}
      {portionItem && (
        <div className="portion-overlay" onClick={() => setPortionItem(null)}>
          <div className="portion-modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Select Portion</h3>
              <button onClick={() => setPortionItem(null)} className="btn" style={{ background: 'transparent', padding: '0.25rem' }}><X size={20} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>{portionItem.name}</p>
            <div className="flex flex-col gap-2">
              {portionItem.portions?.map(p => (
                <button
                  key={p.name}
                  onClick={() => addToCart(portionItem, `${portionItem.name} (${p.name})`, p.price)}
                  className="btn btn-outline w-full"
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', fontSize: '1rem',
                    borderRadius: 'var(--radius)', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span>{p.name}</span>
                  <span style={{ fontWeight: 700 }}>₹{p.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
