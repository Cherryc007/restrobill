import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

// GET /api/restaurants/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();

    let restaurant;
    try {
      restaurant = await db.collection('restaurants').findOne({ _id: new ObjectId(id) });
    } catch {
      restaurant = await db.collection('restaurants').findOne({ _id: id });
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: restaurant._id.toString(),
      name: restaurant.name,
      gst: restaurant.gst,
      address: restaurant.address,
    });
  } catch (error) {
    console.error('GET /api/restaurants/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurant' }, { status: 500 });
  }
}
