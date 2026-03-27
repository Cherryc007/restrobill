import { getDb } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

// GET /api/receipts?restaurantId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const db = await getDb();
    const receipts = await db.collection('receipts')
      .find({ restaurantId })
      .sort({ date: -1 })
      .toArray();

    const mapped = receipts.map(r => ({
      ...r,
      id: r._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('GET /api/receipts error:', error);
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}

// POST /api/receipts — create new receipt
export async function POST(request) {
  try {
    const body = await request.json();
    const { receiptNo, restaurantId, items, subtotal, totalTax, discount, discountPercentage, gstEnabled, totalAmount, paymentMethod, date } = body;

    if (!receiptNo || !restaurantId) {
      return NextResponse.json({ error: 'receiptNo and restaurantId are required' }, { status: 400 });
    }

    const db = await getDb();
    const doc = {
      receiptNo,
      restaurantId,
      items: items || [],
      subtotal: subtotal || 0,
      totalTax: totalTax || 0,
      discount: discount || 0,
      discountPercentage: discountPercentage || 0,
      gstEnabled: gstEnabled !== false,
      totalAmount: totalAmount || 0,
      paymentMethod: paymentMethod || 'Cash',
      date: date || new Date().toISOString(),
      synced: 1, // Created on server = already synced
    };

    const result = await db.collection('receipts').insertOne(doc);

    console.log('Receipt created in MongoDB:', result.insertedId.toString());

    return NextResponse.json({
      ...doc,
      _id: result.insertedId.toString(),
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/receipts error:', error);
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 });
  }
}
