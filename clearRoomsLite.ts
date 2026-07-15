import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, writeBatch } from 'firebase/firestore/lite';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function clearRooms() {
  try {
    const roomsRef = collection(db, 'rooms');
    const snapshot = await getDocs(roomsRef);
    const batch = writeBatch(db);
    let count = 0;
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    await batch.commit();
    console.log(`Cleared ${count} rooms in Firestore!`);
  } catch (err) {
    console.error('Error clearing rooms:', err);
  }
  process.exit(0);
}

clearRooms();
