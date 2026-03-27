import { getDb } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

/**
 * POST /api/seed
 * One-time seed of demo data (restaurant + users + menu items).
 * Skips if data already exists.
 */
export async function POST() {
  try {
    const db = await getDb();

    // Check if already seeded
    const existingRest = await db.collection('restaurants').findOne({});
    if (existingRest) {
      return NextResponse.json({
        message: 'Database already seeded',
        restaurantId: existingRest._id.toString(),
      });
    }

    // 1. Create restaurant
    const restResult = await db.collection('restaurants').insertOne({
      name: 'Southall Kitchens',
      gst: '22AAAAA0000A1Z5',
      address: '123 Cloud Kitchen Avenue',
    });
    const restaurantId = restResult.insertedId.toString();

    // 2. Create users
    await db.collection('users').insertMany([
      { username: 'admin', role: 'Admin', restaurantId },
      { username: 'staff', role: 'Staff', restaurantId },
    ]);

    // 3. Create menu items
    await db.collection('menuItems').insertMany([
      { name: 'Masala Chai', category: 'Beverages', price: 20, gstPercentage: 5, restaurantId, hasPortions: false, portions: [], isPaused: false },
      { name: 'Cold Coffee', category: 'Beverages', price: 80, gstPercentage: 5, restaurantId, hasPortions: false, portions: [], isPaused: false },
      { name: 'Butter Chicken', category: 'Main Course', price: 250, gstPercentage: 5, restaurantId, hasPortions: false, portions: [], isPaused: false },
      { name: 'Paneer Tikka Masala', category: 'Main Course', price: 220, gstPercentage: 5, restaurantId, hasPortions: false, portions: [], isPaused: false },
      { name: 'Garlic Naan', category: 'Breads', price: 40, gstPercentage: 5, restaurantId, hasPortions: false, portions: [], isPaused: false },
      { name: 'Tandoori Roti', category: 'Breads', price: 15, gstPercentage: 5, restaurantId, hasPortions: false, portions: [], isPaused: false },
      { name: 'Gulab Jamun', category: 'Desserts', price: 50, gstPercentage: 5, restaurantId, hasPortions: false, portions: [], isPaused: false },
    ]);

    return NextResponse.json({
      message: 'Database seeded successfully',
      restaurantId,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/seed error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
