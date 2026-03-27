"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { apiGetReceipt } from "@/lib/api";
import AuthGuard from "@/app/components/AuthGuard";
import { Printer, Share2, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const id = params.id;
        const isLocal = new URLSearchParams(window.location.search).get('local') === '1';
        
        console.log('Loading invoice:', id, 'isLocal:', isLocal);

        let bill = null;
        let rest = null;

        if (isLocal) {
          // Load from local Dexie using auto-increment ID
          bill = await db.receipts.get(parseInt(id));
        } else {
          // Try local cache first by serverId string
          bill = await db.receipts.where('serverId').equals(id).first();
          
          // If not in cache, fetch from API
          if (!bill) {
            console.log('Bill not in local cache, fetching from API...');
            const data = await apiGetReceipt(id);
            bill = data.receipt;
            rest = data.restaurant;
          }
        }

        if (bill) {
          setReceipt(bill);
          // If we don't have restaurant from API, load from local cache
          if (!rest) {
            rest = await db.restaurants.get(bill.restaurantId) || 
                   await db.restaurants.where('id').equals(bill.restaurantId).first();
          }
          setRestaurant(rest);
        } else {
          console.warn('Receipt not found in local or remote storage');
        }
      } catch (e) {
        console.error("Error loading invoice:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  if (loading) return <div className="container mt-4">Loading invoice...</div>;
  if (!receipt) return <div className="container mt-4 text-center">Receipt not found.</div>;

  const handlePrint = () => window.print();

  const handleWhatsAppShare = () => {
    const text = `*${restaurant?.name || 'Restaurant'}*\nInvoice: ${receipt.receiptNo}\nTotal: ₹${receipt.totalAmount.toFixed(2)}\nThank you for your visit!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const upiString = `upi://pay?pa=southallkitchens@ybl&pn=${encodeURIComponent(restaurant?.name || 'Southall Kitchens')}&am=${receipt.totalAmount.toFixed(2)}&cu=INR`;

  return (
    <AuthGuard>
      <div className="container flex-col items-center" style={{ maxWidth: '600px', padding: '2rem 1rem', margin: '0 auto' }}>
        
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6 print-hidden w-full">
          <button onClick={() => router.push('/pos')} className="btn btn-outline">
            <ArrowLeft size={16} /> New Bill
          </button>
          <div className="flex gap-2">
            <button onClick={handleWhatsAppShare} className="btn" style={{ background: '#25D366', color: 'white' }}>
              <Share2 size={16} /> WhatsApp
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* 80mm Thermal Print Area wrapper */}
        <div className="print-area receipt-container">
          <div className="text-center mb-4 pb-2 border-b-dashed flex flex-col items-center">
            <img src="/logo.jpg" alt="Logo" style={{ height: '50px', width: 'auto', marginBottom: '0.5rem', objectFit: 'contain' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{restaurant?.name || "Southall Kitchens"}</h2>
            <p style={{ margin: 0, fontSize: '0.75rem' }}>{restaurant?.address}</p>
            <p style={{ margin: 0, fontSize: '0.75rem' }}>GSTIN: {restaurant?.gst}</p>
          </div>

          <div className="flex justify-between mb-4" style={{ fontSize: '0.75rem' }}>
            <div>
              <strong>Inv No:</strong><br/>{receipt.receiptNo}<br/>
              <strong>Pay Mode:</strong><br/>{receipt.paymentMethod}
            </div>
            <div className="text-right">
              <strong>Date:</strong><br/>{new Date(receipt.date).toLocaleDateString()}<br/>
              <strong>Time:</strong><br/>{new Date(receipt.date).toLocaleTimeString()}
            </div>
          </div>

          <table className="w-full mb-4" style={{ borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr className="border-b-dashed">
                <th style={{ textAlign: 'left', padding: '0.25rem 0' }}>Itm</th>
                <th style={{ textAlign: 'center', padding: '0.25rem 0' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '0.25rem 0' }}>Amt</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '0.25rem 0' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '0.25rem 0' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right', padding: '0.25rem 0' }}>₹{item.price * item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col items-end mb-4 border-t-dashed pt-2" style={{ fontSize: '0.8rem' }}>
            <div className="w-full flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>₹{receipt.subtotal?.toFixed(2) || 0}</span>
            </div>
            {receipt.gstEnabled && (
              <div className="w-full flex justify-between mb-1">
                <span>GST:</span>
                <span>₹{receipt.totalTax?.toFixed(2) || 0}</span>
              </div>
            )}
            {receipt.discount > 0 && (
              <div className="w-full flex justify-between mb-1" style={{ color: 'var(--danger)' }}>
                <span>Discount:</span>
                <span>- ₹{receipt.discount?.toFixed(2) || 0}</span>
              </div>
            )}
            <div className="w-full flex justify-between mt-2 pt-2 border-t-dashed" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              <span>Total:</span>
              <span>₹{receipt.totalAmount?.toFixed(2) || 0}</span>
            </div>
          </div>

             <div className="flex flex-col justify-center items-center mt-6 mb-4">
               <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem' }}>Scan to Pay / Digital Receipt</p>
               <QRCodeSVG value={upiString} size={140} />
             </div>

          <div className="text-center mt-6 pt-2 border-t-dashed" style={{ fontSize: '0.75rem' }}>
            Thank you for dining with us!
          </div>
        </div>

      </div>

      <style jsx global>{`
        .border-b-dashed { border-bottom: 1px dashed #000; }
        .border-t-dashed { border-top: 1px dashed #000; }
        
        .receipt-container {
          background: white;
          color: black;
          padding: 1.5rem;
          margin: 0 auto;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          width: 100%;
          max-width: 350px;
          border-radius: 0.5rem;
          font-family: monospace, sans-serif;
        }

        @media print {
          @page {
            margin: 0;
            size: 80mm 297mm; /* 80mm thermal roll */
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
            margin: 0;
            box-shadow: none;
            border-radius: 0;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </AuthGuard>
  );
}
