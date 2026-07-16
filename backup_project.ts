import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, terminate } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function run() {
  console.log("Initializing Firebase for backup...");
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId || "(default)");

  const backupData: { settings: any[], rooms: any[], employees: any[] } = {
    settings: [],
    rooms: [],
    employees: []
  };

  // 1. Fetch settings
  console.log("Fetching settings...");
  const settingsSnap = await getDocs(collection(db, "settings"));
  settingsSnap.forEach(docSnap => {
    backupData.settings.push({ id: docSnap.id, ...docSnap.data() });
  });

  // 2. Fetch rooms
  console.log("Fetching rooms...");
  const roomsSnap = await getDocs(collection(db, "rooms"));
  roomsSnap.forEach(docSnap => {
    backupData.rooms.push({ id: docSnap.id, ...docSnap.data() });
  });

  // 3. Fetch employees
  console.log("Fetching employees...");
  const employeesSnap = await getDocs(collection(db, "employees"));
  employeesSnap.forEach(docSnap => {
    backupData.employees.push({ id: docSnap.id, ...docSnap.data() });
  });

  console.log(`Summary of data fetched:`);
  console.log(`- Settings docs: ${backupData.settings.length}`);
  console.log(`- Rooms docs: ${backupData.rooms.length}`);
  console.log(`- Employees docs: ${backupData.employees.length}`);

  const backupFileName = `backup_staffretreat_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
  console.log(`Backup written successfully to ${backupFileName}`);

  // Also write to a generic name for reference
  fs.writeFileSync('backup_staffretreat_latest.json', JSON.stringify(backupData, null, 2));
  console.log(`Backup also written successfully to backup_staffretreat_latest.json`);

  await terminate(db);
  console.log("Backup process finished successfully!");
  process.exit(0);
}

run().catch(async (e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});
