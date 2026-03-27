import Dexie from 'dexie';

export const db = new Dexie('RestroBillDB');

db.version(1).stores({
  restaurants: '++id, name, gst',
  users: '++id, username, role, restaurantId',
  menuItems: '++id, name, category, restaurantId',
  receipts: '++id, receiptNo, date, restaurantId, synced',
  syncQueue: '++id, action, status'
});

/**
 * Sync helpers — populate Dexie cache from server data.
 * These keep the local IndexedDB in sync with MongoDB.
 */

/**
 * Replace all local menu items for a restaurant with server data.
 * Maps server `id` to local records for consistency.
 */
export async function syncMenuFromServer(items) {
  if (!items || items.length === 0) return;
  const restaurantId = items[0].restaurantId;
  // Clear existing items for this restaurant
  await db.menuItems.where('restaurantId').equals(restaurantId).delete();
  // Add server items with their server id stored as `serverId`
  const docs = items.map(item => ({
    ...item,
    serverId: item.id, // Keep server ID reference
  }));
  await db.menuItems.bulkAdd(docs);
}

/**
 * Replace all local receipts for a restaurant with server data.
 */
export async function syncReceiptsFromServer(receipts) {
  if (!receipts || receipts.length === 0) return;
  const restaurantId = receipts[0].restaurantId;
  await db.receipts.where('restaurantId').equals(restaurantId).delete();
  const docs = receipts.map(r => ({
    ...r,
    serverId: r.id,
    synced: 1,
  }));
  await db.receipts.bulkAdd(docs);
}

/**
 * Cache restaurant info locally.
 */
export async function cacheRestaurant(restaurant) {
  if (!restaurant) return;
  const existing = await db.restaurants.where('name').equals(restaurant.name).first();
  if (existing) {
    await db.restaurants.update(existing.id, restaurant);
  } else {
    await db.restaurants.add(restaurant);
  }
}

/**
 * Get locally-cached unsynced receipts (created offline).
 */
export async function getUnsyncedReceipts() {
  return db.receipts.where('synced').equals(0).toArray();
}
