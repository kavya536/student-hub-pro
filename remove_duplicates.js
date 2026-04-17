import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';

// Load config from App.tsx or use env if available
const firebaseConfig = {
  apiKey: "AIzaSyB...", // I need to get the real ones if I can, or just run a node script with the ones I can find
  authDomain: "eduqra-2026.firebaseapp.com",
  projectId: "eduqra-2026",
  storageBucket: "eduqra-2026.appspot.com",
  messagingSenderId: "360...",
  appId: "1:..."
};

// Actually, I'll check firebase.ts for the config
const firebaseTs = fs.readFileSync('src/firebase.ts', 'utf8');
const configMatch = firebaseTs.match(/const firebaseConfig = {([\s\S]+?)};/);
let finalConfig = {};
if (configMatch) {
    const configStr = configMatch[1];
    // Simple parsing - might need refinement
    const lines = configStr.split('\n');
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts[1].trim().replace(/['",]/g, '');
            finalConfig[key] = val;
        }
    });
}

const app = initializeApp(finalConfig);
const db = getFirestore(app);

async function cleanDuplicates() {
    console.log("🔍 Fetching bookings...");
    const snap = await getDocs(collection(db, 'bookings'));
    const allBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const seen = new Set();
    const toDelete = [];

    allBookings.forEach(b => {
        // Unique key: studentEmail + tutorId + date + time + subject
        const key = `${b.studentEmail || b.studentId}_${b.tutorId}_${b.date}_${b.time}_${b.subject}`;
        if (seen.has(key)) {
            toDelete.push(b.id);
        } else {
            seen.add(key);
        }
    });

    console.log(`🗑️ Found ${toDelete.length} duplicates. Deleting...`);

    for (const id of toDelete) {
        await deleteDoc(doc(db, 'bookings', id));
        console.log(`✅ Deleted: ${id}`);
    }

    console.log("✨ Cleanup complete!");
    process.exit(0);
}

cleanDuplicates().catch(console.error);
