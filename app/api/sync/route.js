import { getDb } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

/**
 * POST /api/sync
 * Accepts a batch of offline receipts and inserts them to the database.
 * Used when the device comes back online and has locally-cached bills.
 */
export async function POST(request) {
  try {
    const { receipts } = await request.json();

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return NextResponse.json({ error: 'No receipts to sync' }, { status: 400 });
    }

    const db = await getDb();

    // Prepare documents — strip local Dexie IDs, keep receiptNo as dedup key
    const docs = receipts.map(r => {
      const { id, _id, ...rest } = r;
      return { ...rest, synced: 1, syncedAt: new Date().toISOString() };
    });

    // Use receiptNo as dedup — skip receipts that already exist on server
    let inserted = 0;
    for (const doc of docs) {
      const existing = await db.collection('receipts').findOne({ receiptNo: doc.receiptNo });
      if (!existing) {
        await db.collection('receipts').insertOne(doc);
        inserted++;
      }
    }

    return NextResponse.json({
      message: `Synced ${inserted} of ${receipts.length} receipts`,
      inserted,
      total: receipts.length,
    });
  } catch (error) {
    console.error('POST /api/sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
