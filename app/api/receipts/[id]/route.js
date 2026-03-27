import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

// GET /api/receipts/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();

    let receipt;
    // Try ObjectId first, then fall back to string id
    try {
      receipt = await db.collection('receipts').findOne({ _id: new ObjectId(id) });
    } catch {
      receipt = await db.collection('receipts').findOne({ _id: id });
    }

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    // Also fetch restaurant
    let restaurant = null;
    try {
      restaurant = await db.collection('restaurants').findOne({ _id: new ObjectId(receipt.restaurantId) });
    } catch {
      restaurant = await db.collection('restaurants').findOne({ _id: receipt.restaurantId });
    }

    return NextResponse.json({
      receipt: {
        ...receipt,
        id: receipt._id.toString(),
        _id: undefined,
      },
      restaurant: restaurant ? {
        id: restaurant._id.toString(),
        name: restaurant.name,
        gst: restaurant.gst,
        address: restaurant.address,
        _id: undefined,
      } : null,
    });
  } catch (error) {
    console.error('GET /api/receipts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}
