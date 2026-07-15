import { db } from './src/lib/firebaseService.ts';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function main() {
  const roomsRef = collection(db, 'rooms');
  const roomsSnap = await getDocs(roomsRef);
  let targetRoom = null;
  roomsSnap.forEach(r => {
    if (r.data().capacity === 3) targetRoom = r.data();
  });
  
  if (!targetRoom) {
    console.log('No 3-capacity room found');
    process.exit(0);
  }
  
  const empRef = collection(db, 'employees');
  const empSnap = await getDocs(empRef);
  
  const allEmps = [];
  empSnap.forEach(e => allEmps.push(e.data()));
  
  const occupants = allEmps.filter(e => e.roomId === targetRoom.id);
  console.log(`Room ${targetRoom.id} has ${occupants.length} occupants.`);
  console.log(occupants.map(o => o.id));
  
  const unbooked = allEmps.filter(e => e.rsvpStatus === 'ไป' && !e.roomId);
  console.log(`Unbooked going employees: ${unbooked.length}`);
  
  process.exit(0);
}

main().catch(console.error);
