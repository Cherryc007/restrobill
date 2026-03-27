import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

// PUT /api/menu/[id] — update menu item
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const db = await getDb();

    // Remove fields that shouldn't be updated directly
    const { _id, id: bodyId, ...updateData } = body;

    const result = await db.collection('menuItems').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('PUT /api/menu/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

// DELETE /api/menu/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await db.collection('menuItems').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/menu/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}
