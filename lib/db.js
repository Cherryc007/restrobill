import Dexie from 'dexie';

export const db = new Dexie('RestroBillDB');

db.version(2).stores({
  restaurants: '++id, name, gst',
  users: '++id, username, role, restaurantId',
  menuItems: '++id, serverId, name, category, restaurantId',
  receipts: '++id, serverId, receiptNo, date, restaurantId, synced',
  syncQueue: '++id, action, status'
});

/**
 * =========================
 * MENU SYNC FROM SERVER
 * =========================
 */
export async function syncMenuFromServer(items) {
  if (!items) return;

  const restaurantId = items[0]?.restaurantId;

  // Clear existing menu for this restaurant
  if (restaurantId) {
    await db.menuItems.where('restaurantId').equals(restaurantId).delete();
  }

  if (items.length === 0) return;

  const docs = items.map(item => {
    const { _id, ...rest } = item;

    return {
      ...rest,
      serverId: _id, // ✅ Correct mapping
    };
  });

  await db.menuItems.bulkAdd(docs);
}

/**
 * =========================
 * RECEIPTS SYNC FROM SERVER
 * =========================
 */
export async function syncReceiptsFromServer(receipts) {
  if (!receipts) return;

  const restaurantId = receipts[0]?.restaurantId;

  // Clear old receipts for this restaurant
  if (restaurantId) {
    await db.receipts.where('restaurantId').equals(restaurantId).delete();
  }

  if (receipts.length === 0) return;

  const docs = receipts.map(r => {
    const { _id, ...rest } = r;

    return {
      ...rest,
      serverId: _id, // ✅ Correct mapping
      synced: 1,     // ✅ Mark as synced
    };
  });

  await db.receipts.bulkAdd(docs);
}

/**
 * =========================
 * CACHE RESTAURANT
 * =========================
 */
export async function cacheRestaurant(restaurant) {
  if (!restaurant) return;

  const existing = await db.restaurants
    .where('name')
    .equals(restaurant.name)
    .first();

  if (existing) {
    await db.restaurants.update(existing.id, restaurant);
  } else {
    await db.restaurants.add(restaurant);
  }
}

/**
 * =========================
 * CREATE RECEIPT (ONLINE)
 * =========================
 */
export async function saveReceiptOnline(apiCall, data) {
  try {
    const res = await apiCall(data); // backend call

    await db.receipts.add({
      ...data,
      serverId: res._id, // ✅ CRITICAL FIX
      synced: 1,
    });

    return res;
  } catch (error) {
    console.error("Online save failed, storing offline:", error);

    // fallback to offline
    await db.receipts.add({
      ...data,
      synced: 0,
    });
  }
}

/**
 * =========================
 * GET UNSYNCED RECEIPTS
 * =========================
 */
export async function getUnsyncedReceipts() {
  return db.receipts.where('synced').equals(0).toArray();
}

/**
 * =========================
 * SYNC OFFLINE RECEIPTS
 * =========================
 */
export async function syncOfflineReceipts(apiCall) {
  const unsynced = await getUnsyncedReceipts();

  for (let receipt of unsynced) {
    try {
      const res = await apiCall(receipt);

      await db.receipts.update(receipt.id, {
        serverId: res._id,
        synced: 1,
      });

    } catch (err) {
      console.error("Sync failed for receipt:", receipt, err);
    }
  }
}