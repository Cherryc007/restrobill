import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

// GET /api/menu?restaurantId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const db = await getDb();
    const items = await db.collection('menuItems')
      .find({ restaurantId })
      .toArray();

    // Convert _id to id for frontend compatibility
    const mapped = items.map(item => ({
      ...item,
      id: item._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('GET /api/menu error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

// POST /api/menu — create new menu item
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, category, gstPercentage, restaurantId, hasPortions, price, portions, isPaused } = body;

    if (!name || !category || !restaurantId) {
      return NextResponse.json({ error: 'name, category, and restaurantId are required' }, { status: 400 });
    }

    const db = await getDb();
    const doc = {
      name,
      category,
      gstPercentage: gstPercentage || 5,
      restaurantId,
      hasPortions: !!hasPortions,
      price: hasPortions ? 0 : (price || 0),
      portions: hasPortions ? (portions || []) : [],
      isPaused: !!isPaused,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection('menuItems').insertOne(doc);

    return NextResponse.json({
      ...doc,
      id: result.insertedId.toString(),
      _id: undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/menu error:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
