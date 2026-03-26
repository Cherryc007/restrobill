import Dexie from 'dexie';

export const db = new Dexie('RestroBillDB');

db.version(1).stores({
  restaurants: '++id, name, gst',
  users: '++id, username, role, restaurantId',
  menuItems: '++id, name, category, restaurantId',
  receipts: '++id, receiptNo, date, restaurantId, synced',
  syncQueue: '++id, action, status'
});

// Helper functions to populate demo data if empty
export async function initializeDemoData() {
  const restCount = await db.restaurants.count();
  if (restCount === 0) {
    const restaurantId = await db.restaurants.add({
      name: 'Southall Kitchens',
      gst: '22AAAAA0000A1Z5',
      address: '123 Cloud Kitchen Avenue',
    });

    await db.users.add({
      username: 'admin',
      role: 'Admin',
      restaurantId
    });

    await db.users.add({
      username: 'staff',
      role: 'Staff',
      restaurantId
    });

    const categories = ['Beverages', 'Main Course', 'Desserts', 'Breads'];
    const sampleItems = [
      { name: 'Masala Chai', category: 'Beverages', price: 20, gstPercentage: 5, restaurantId },
      { name: 'Cold Coffee', category: 'Beverages', price: 80, gstPercentage: 5, restaurantId },
      { name: 'Butter Chicken', category: 'Main Course', price: 250, gstPercentage: 5, restaurantId },
      { name: 'Paneer Tikka Masala', category: 'Main Course', price: 220, gstPercentage: 5, restaurantId },
      { name: 'Garlic Naan', category: 'Breads', price: 40, gstPercentage: 5, restaurantId },
      { name: 'Tandoori Roti', category: 'Breads', price: 15, gstPercentage: 5, restaurantId },
      { name: 'Gulab Jamun', category: 'Desserts', price: 50, gstPercentage: 5, restaurantId },
    ];
    
    await db.menuItems.bulkAdd(sampleItems);
  }
}
