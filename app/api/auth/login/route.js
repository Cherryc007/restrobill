import { getDb } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found. Try "admin" or "staff".' }, { status: 404 });
    }

    // Also fetch restaurant info for convenience
    const restaurant = await db.collection('restaurants').findOne({ _id: user.restaurantId });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        restaurantId: user.restaurantId.toString(),
      },
      restaurant: restaurant ? {
        id: restaurant._id.toString(),
        name: restaurant.name,
        gst: restaurant.gst,
        address: restaurant.address,
      } : null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
