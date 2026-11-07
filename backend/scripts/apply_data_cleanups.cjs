const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const { db } = require('../src/config/firebase');

const bookingsUpdates = {
  booking_1789488199086: {
    customerName: "Aarav Sharma",
    phone: "+91 98201 11222",
    service: "Classic Precision Haircut",
    price: 500,
    status: "cancelled",
    date: "2026-09-16",
    time: "17:00"
  },
  booking_1790220159983: {
    customerName: "Priya Patel",
    phone: "+91 98202 33444",
    service: "Radiance Herbal Facial",
    price: 850,
    status: "completed",
    date: "2026-09-25",
    time: "11:00"
  },
  booking_1790222092875: {
    customerName: "Rohan Mehta",
    phone: "+91 98203 55666",
    service: "Beard Shaping & Styling",
    price: 250,
    status: "confirmed",
    date: "2026-09-24",
    time: "14:00"
  },
  booking_1790939120215: {
    customerName: "Kashyap Makwana",
    phone: "+91 98204 77888",
    service: "Executive Haircut & Styling",
    price: 600,
    status: "confirmed",
    date: "2026-10-03",
    time: "16:00"
  },
  booking_1791695687167: {
    customerName: "Ananya Roy",
    phone: "+91 98205 88999",
    service: "Ammonia-Free Global Color",
    price: 1500,
    status: "confirmed",
    date: "2026-10-12",
    time: "16:00"
  },
  booking_1791803251305: {
    customerName: "Tejasvi Rao",
    phone: "+91 98206 11333",
    service: "Ayurvedic Scalp & Head Massage",
    price: 450,
    status: "confirmed",
    date: "2026-10-13",
    time: "16:00"
  },
  booking_1791804138767: {
    customerName: "Neha Gupta",
    phone: "+91 98207 22444",
    service: "Keratin Smooth Hair Treatment",
    price: 2500,
    status: "confirmed",
    date: "2026-10-13",
    time: "17:00"
  },
  booking_1793255606968: {
    customerName: "Vikram Malhotra",
    phone: "+91 98208 33555",
    service: "Classic Precision Haircut",
    price: 500,
    status: "confirmed",
    date: "2026-10-29",
    time: "16:00"
  },
  booking_1793468571348_hc9c: {
    customerName: "Rahul Sharma",
    phone: "+91 98209 44666",
    service: "Organic Hair Spa & Deep Conditioning",
    price: 1200,
    status: "confirmed",
    date: "2026-10-31",
    time: "11:00"
  }
};

const customerUpdates = {
  'test-business-1': {
    cust_001: {
      name: "Aarav Sharma",
      customerName: "Aarav Sharma",
      phone: "+91 98201 11222"
    },
    cust_1793135377377_0zsk: {
      name: "Kashyap Makwana",
      customerName: "Kashyap Makwana",
      phone: "+91 98204 77888"
    }
  },
  'fine-look': {
    cust_1792090483138_e0pn: {
      name: "Leo D'Souza",
      customerName: "Leo D'Souza",
      phone: "+91 98206 55443"
    }
  }
};

async function runUpdates() {
  console.log("Updating bookings in test-business-1...");
  const bColl = db.collection('businesses').doc('test-business-1').collection('bookings');
  for (const [id, data] of Object.entries(bookingsUpdates)) {
    await bColl.doc(id).set(data, { merge: true });
    console.log(`Updated booking: ${id} -> ${data.customerName} (${data.service}, ₹${data.price})`);
  }

  console.log("\nUpdating customers with mocked numbers & names...");
  for (const [bId, custMap] of Object.entries(customerUpdates)) {
    const cColl = db.collection('businesses').doc(bId).collection('customers');
    for (const [id, data] of Object.entries(custMap)) {
      await cColl.doc(id).set(data, { merge: true });
      console.log(`Updated customer in ${bId}: ${id} -> ${data.name} (${data.phone})`);
    }
  }

  console.log("\nAll updates completed successfully!");
}

runUpdates().then(() => process.exit(0)).catch(err => {
  console.error("Error during updates:", err);
  process.exit(1);
});
