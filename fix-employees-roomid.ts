import { db } from './src/lib/firebaseService.ts';
import { collection, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore';

async function main() {
  const empRef = collection(db, 'employees');
  const snapshot = await getDocs(empRef);
  let count = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.roomNumber !== undefined) {
      const docRef = doc(db, 'employees', docSnap.id);
      const updateData: any = { roomNumber: deleteField() };
      
      // Only set roomId if it was actually set to a truthy value and roomId doesn't exist
      if (data.roomNumber && !data.roomId) {
        updateData.roomId = data.roomNumber;
      }
      
      await updateDoc(docRef, updateData);
      count++;
    }
  }
  console.log(`Updated ${count} employees.`);
  process.exit(0);
}

main().catch(console.error);
