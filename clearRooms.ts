import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function clearRooms() {
  const roomsRef = collection(db, 'rooms');
  const snapshot = await getDocs(roomsRef);
  const batch = writeBatch(db);
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log('Cleared all rooms in Firestore!');
  process.exit(0);
}

clearRooms();
