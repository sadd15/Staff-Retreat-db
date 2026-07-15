import { db } from './src/lib/firebaseService.ts';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function main() {
  const roomsRef = collection(db, 'rooms');
  const roomsSnap = await getDocs(roomsRef);
  let targetRoom = null;
  roomsSnap.forEach(r => {
    if (r.data().capacity === 3) targetRoom = r;
  });
  
  if (!targetRoom) {
    console.log('No 3-capacity room found');
    process.exit(0);
  }
  
  const empRef = collection(db, 'employees');
  const empSnap = await getDocs(empRef);
  
  const emps = [];
  empSnap.forEach(e => {
    if (e.data().rsvpStatus === 'ไป' && !e.data().roomId) {
      emps.push(e);
    }
  });
  
  if (emps.length < 3) {
    console.log('Not enough going employees without a room');
    process.exit(0);
  }
  
  console.log(`Setting 2 employees to room ${targetRoom.id}`);
  await updateDoc(doc(db, 'employees', emps[0].id), { roomId: targetRoom.id });
  await updateDoc(doc(db, 'employees', emps[1].id), { roomId: targetRoom.id });
  
  console.log(`Room ${targetRoom.id} now has 2 employees. Emp 3 is ${emps[2].id} (${emps[2].data().name}). Try to book them in UI.`);
  process.exit(0);
}

main().catch(console.error);
