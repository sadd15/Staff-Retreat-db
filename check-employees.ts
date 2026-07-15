import { db } from './src/lib/firebaseService.ts';
import { collection, getDocs } from 'firebase/firestore';

async function main() {
  const empRef = collection(db, 'employees');
  const snapshot = await getDocs(empRef);
  let count = 0;
  snapshot.docs.forEach(doc => {
    console.log(doc.id, doc.data());
    count++;
  });
  console.log(`Found ${count} employees.`);
  process.exit(0);
}

main().catch(console.error);
