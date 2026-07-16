import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Employee, Room, SheetConfig } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Error logging handler as per the firebase-integration skill instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Standard CSV Parser supporting quotes, commas, and newlines
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      row.push(currentVal.trim());
      lines.push(row);
      row = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal.trim());
    lines.push(row);
  }
  return lines;
}

/**
 * Fetch and parse data from a public Google Sheet (Requires no API Key or OAuth!)
 */
export async function fetchFromPublicGoogleSheet(spreadsheetId: string): Promise<{ employees: Employee[], rooms: Room[] }> {
  try {
    // 1. Fetch Employees
    const employeesUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Employees&t=${Date.now()}`;
    const empRes = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(employeesUrl)}&t=${Date.now()}`);
    if (!empRes.ok) throw new Error('ไม่สามารถเข้าถึงแท็บ Employees ได้ โปรดตรวจสอบว่าเปิดแชร์แบบ "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน"');
    const empText = await empRes.text();

    // Check if response is HTML (which happens when Google Sheets redirects to login page for private sheets)
    const trimmedText = empText.trim().toLowerCase();
    if (trimmedText.startsWith('<!doctype html') || trimmedText.includes('<html') || trimmedText.includes('<head>') || trimmedText.includes('google-site-verification') || trimmedText.includes('sign in - google accounts')) {
      throw new Error('ลิงก์ Google Sheets นี้ไม่สามารถเข้าถึงได้แบบสาธารณะ หรือระบบต้องการรหัสผ่าน (ตรวจพบหน้าเว็บ HTML แทนที่จะเป็นข้อมูล CSV)! โปรดเปลี่ยนการตั้งค่าแชร์ใน Google Sheets ของคุณให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with the link can view) แล้วลองใหม่อีกครั้ง');
    }

    const empRows = parseCSV(empText);

    const employees: Employee[] = [];
    if (empRows.length > 1) {
      // User mapping: A=Name, B=Department, C=Index (ignore)
      
      const getVal = (row: any[], index: number, fallback: string = '') => {
        if (index === -1 || index >= row.length) return fallback;
        return row[index] !== undefined ? String(row[index]).trim() : fallback;
      };

      const detectGender = (name: string): 'ชาย' | 'หญิง' => {
        if (name.startsWith('นาย') || name.startsWith('ว่าที่')) return 'ชาย';
        if (name.startsWith('นาง') || name.startsWith('นางสาว')) return 'หญิง';
        return 'ชาย';
      };

      let validEmpCount = 0;
      for (let i = 1; i < empRows.length; i++) {
        const row = empRows[i];
        if (!row || row.length === 0) continue;

        const name = getVal(row, 0, '').trim();
        const dept = getVal(row, 1, 'ทั่วไป').trim();
        
        // Strict Filter: Skip empty rows, headers, or lines without a real name
        if (!name || name === 'ไม่มีชื่อ' || name === 'Name' || name === 'ชื่อ' || name === 'ชื่อ-นามสกุล' || name === 'ชื่อ - นามสกุล' || name === 'ชื่อ - สกุล') {
          continue;
        }

        // Debugging the row structure
        console.log(`Row ${i} -> Valid Employee ${validEmpCount + 1}: Name="${name}", Dept="${dept}"`);

        validEmpCount++;
        const empId = `EMP${String(validEmpCount).padStart(3, '0')}`;

        employees.push({
          id: empId,
          name: name,
          gender: detectGender(name),
          department: dept,
          roomId: '',
          rsvpStatus: 'ยังไม่ระบุ',
          checkedIn: false,
        });
      }
      console.log(`Parsed ${validEmpCount} valid employees from Google Sheet.`);
    }

    // 2. Fetch Rooms (We no longer fetch from Google Sheets, returning empty array here)
    const rooms: Room[] = [];

    return { employees, rooms };
  } catch (error: any) {
    console.error('Error fetching public sheet CSV:', error);
    throw new Error(error.message || 'ไม่สามารถดึงข้อมูลจากลิงก์สเปรดชีตนี้ได้ โปรดตรวจสอบสิทธิ์การแชร์ให้ทุกคนเข้าถึงได้');
  }
}

/**
 * Sync public Google Sheet data into Firestore
 */
export async function syncSheetToFirestore(spreadsheetId: string, customConfig?: SheetConfig): Promise<{ employees: Employee[], rooms: Room[] }> {
  try {
    const { employees, rooms } = await fetchFromPublicGoogleSheet(spreadsheetId);

    // Save configuration in settings doc
    await setDoc(doc(db, 'settings', 'config'), {
      rsvpClosed: false,
      spreadsheetId,
      spreadsheetName: customConfig?.spreadsheetName || 'สเปรดชีตส่วนตัวที่ซิงค์ผ่านลิงก์',
      spreadsheetUrl: customConfig?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    });

    // Save Employees to Firestore in Batches (Update existing or add new)
    const BATCH_LIMIT = 450;
    for (let i = 0; i < employees.length; i += BATCH_LIMIT) {
      const empBatch = writeBatch(db);
      const chunk = employees.slice(i, i + BATCH_LIMIT);
      chunk.forEach(emp => {
        const ref = doc(db, 'employees', emp.id);
        empBatch.set(ref, {
          id: emp.id,
          name: emp.name,
          gender: emp.gender,
          department: emp.department,
          roomId: emp.roomId || '',
          rsvpStatus: emp.rsvpStatus || 'ยังไม่ระบุ',
          checkedIn: emp.checkedIn || false
        }, { merge: true }); // Use merge to avoid overwriting rsvpStatus if they already exist
      });
      await empBatch.commit();
    }

    // Smart Cleanup: Delete any employees from Firestore whose IDs are not in the new Sheet list
    const activeEmpIds = new Set(employees.map(e => e.id));
    const currentEmployeesSnapshot = await getDocs(collection(db, 'employees'));
    const idsToDelete: string[] = [];
    currentEmployeesSnapshot.forEach(docSnap => {
      if (!activeEmpIds.has(docSnap.id)) {
        idsToDelete.push(docSnap.id);
      }
    });

    if (idsToDelete.length > 0) {
      for (let i = 0; i < idsToDelete.length; i += BATCH_LIMIT) {
        const deleteBatch = writeBatch(db);
        const chunk = idsToDelete.slice(i, i + BATCH_LIMIT);
        chunk.forEach(id => {
          deleteBatch.delete(doc(db, 'employees', id));
        });
        await deleteBatch.commit();
      }

      // Clean up room bookings for deleted employees
      const existingRoomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsBatch = writeBatch(db);
      existingRoomsSnapshot.forEach(roomSnap => {
        const roomData = roomSnap.data();
        const roomEmpIds: string[] = roomData.employees || [];
        const updatedRoomEmpIds = roomEmpIds.filter(id => !idsToDelete.includes(id));
        if (updatedRoomEmpIds.length !== roomEmpIds.length) {
          roomsBatch.update(roomSnap.ref, {
            employees: updatedRoomEmpIds,
            updatedAt: serverTimestamp()
          });
        }
      });
      await roomsBatch.commit();
    }

    // We no longer sync rooms from Google Sheets, as they are managed via the web UI.
    // Just fetch the existing rooms from Firestore to return them.
    const existingRoomsSnapshot = await getDocs(collection(db, 'rooms'));
    const existingRooms: Room[] = [];
    existingRoomsSnapshot.forEach(docSnap => {
      existingRooms.push(docSnap.data() as Room);
    });

    return { employees, rooms: existingRooms };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'sync');
    throw error;
  }
}

/**
 * Clean re-sync of Google Sheet: Deletes all existing employees in Firestore,
 * clears all room assignments (resets bookings), and then imports the new employee list from the Sheet.
 */
export async function cleanSyncSheetToFirestore(spreadsheetId: string, customConfig?: SheetConfig): Promise<{ employees: Employee[], rooms: Room[] }> {
  try {
    // 1. Fetch from sheet first to verify URL/access works before destructive action
    const { employees: newEmployees } = await fetchFromPublicGoogleSheet(spreadsheetId);

    // 2. Clear Google Sheet configuration in settings doc (set active state)
    await setDoc(doc(db, 'settings', 'config'), {
      rsvpClosed: false,
      spreadsheetId,
      spreadsheetName: customConfig?.spreadsheetName || 'สเปรดชีตส่วนตัวที่ซิงค์ผ่านลิงก์',
      spreadsheetUrl: customConfig?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    }, { merge: true });

    // 3. Fetch all current employees in Firestore to delete them
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    const allDocRefs = employeesSnapshot.docs.map(docSnap => docSnap.ref);
    
    // Deleting in batches of 450 (Firestore limit is 500)
    const BATCH_LIMIT = 450;
    for (let i = 0; i < allDocRefs.length; i += BATCH_LIMIT) {
      const deleteBatch = writeBatch(db);
      const chunk = allDocRefs.slice(i, i + BATCH_LIMIT);
      chunk.forEach(ref => {
        deleteBatch.delete(ref);
      });
      await deleteBatch.commit();
    }

    // 4. Fetch all current rooms in Firestore to clear their employee arrays (unbook all)
    const roomsSnapshot = await getDocs(collection(db, 'rooms'));
    const roomsBatch = writeBatch(db);
    const existingRooms: Room[] = [];
    roomsSnapshot.forEach(docSnap => {
      roomsBatch.update(docSnap.ref, {
        employees: [],
        updatedAt: serverTimestamp()
      });
      existingRooms.push({
        ...(docSnap.data() as Room),
        employees: []
      });
    });
    await roomsBatch.commit();

    // 5. Save the fresh sheet employees into Firestore (without merge, just set cleanly)
    for (let i = 0; i < newEmployees.length; i += BATCH_LIMIT) {
      const insertBatch = writeBatch(db);
      const chunk = newEmployees.slice(i, i + BATCH_LIMIT);
      chunk.forEach(emp => {
        const ref = doc(db, 'employees', emp.id);
        insertBatch.set(ref, {
          id: emp.id,
          name: emp.name,
          gender: emp.gender,
          department: emp.department,
          roomId: '',
          rsvpStatus: 'ยังไม่ระบุ',
          checkedIn: false
        });
      });
      await insertBatch.commit();
    }

    return { employees: newEmployees, rooms: existingRooms };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'cleanSync');
    throw error;
  }
}

/**
 * Set up real-time listener for Employees
 */
export function listenToEmployees(callback: (employees: Employee[]) => void) {
  const path = 'employees';
  return onSnapshot(collection(db, path), (snapshot) => {
    const emps: Employee[] = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      emps.push({
        id: doc.id,
        name: d.name,
        gender: d.gender,
        department: d.department,
        roomId: d.roomId || '',
        rsvpStatus: d.rsvpStatus || 'ยังไม่ระบุ',
        checkedIn: d.checkedIn || false,
        verified: d.verified || false,
      });
    });
    callback(emps);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

/**
 * Set up real-time listener for Rooms
 */
export function listenToRooms(callback: (rooms: Room[]) => void) {
  const path = 'rooms';
  return onSnapshot(collection(db, path), (snapshot) => {
    const rms: Room[] = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      rms.push({
        id: doc.id,
        roomType: d.roomType,
        capacity: d.capacity,
        genderRestriction: d.genderRestriction,
        pricePerNight: d.pricePerNight,
        floor: d.floor,
        notes: d.notes || '',
        roomName: d.roomName || '',
        sequence: d.sequence !== undefined ? Number(d.sequence) : undefined,
        employees: d.employees || [],
      });
    });
    callback(rms);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

/**
 * Set up real-time listener for Settings
 */
export function listenToSettings(callback: (settings: { rsvpClosed: boolean; spreadsheetId?: string; spreadsheetName?: string; spreadsheetUrl?: string }) => void) {
  const path = 'settings';
  return onSnapshot(doc(db, 'settings', 'config'), (docSnap) => {
    if (docSnap.exists()) {
      const d = docSnap.data();
      callback({
        rsvpClosed: d.rsvpClosed || false,
        spreadsheetId: d.spreadsheetId,
        spreadsheetName: d.spreadsheetName,
        spreadsheetUrl: d.spreadsheetUrl
      });
    } else {
      callback({ rsvpClosed: false });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

/**
 * Update an employee's RSVP state
 */
export async function updateEmployeeRSVP(id: string, rsvpStatus: 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ'): Promise<void> {
  const path = `employees/${id}`;
  try {
    const ref = doc(db, 'employees', id);
    const updates: Partial<Employee> = { rsvpStatus };
    if (rsvpStatus === 'ไม่ไป') {
      updates.roomId = ''; // automatically clear room booking if not going
    }
    await updateDoc(ref, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Book room for employee
 */
export async function bookRoom(employeeId: string, roomId: string): Promise<void> {
  const path = `employees/${employeeId}`;
  try {
    const ref = doc(db, 'employees', employeeId);
    await updateDoc(ref, { roomId, rsvpStatus: 'ไป' }); // automatically set RSVP as Going when booking room
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Cancel/Unbook room for employee
 */
export async function cancelBooking(employeeId: string): Promise<void> {
  const path = `employees/${employeeId}`;
  try {
    const ref = doc(db, 'employees', employeeId);
    await updateDoc(ref, { roomId: '' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update global settings (e.g. toggle RSVP status)
 */
export async function updateSettings(rsvpClosed: boolean): Promise<void> {
  const path = 'settings/config';
  try {
    const ref = doc(db, 'settings', 'config');
    await updateDoc(ref, { rsvpClosed });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Clear the Google Sheet configuration in Firestore
 */
export async function clearSheetConfig(): Promise<void> {
  const path = 'settings/config';
  try {
    const ref = doc(db, 'settings', 'config');
    await updateDoc(ref, {
      spreadsheetId: '',
      spreadsheetName: '',
      spreadsheetUrl: ''
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update an employee's Check-In state
 */
export async function updateCheckInStatus(id: string, checkedIn: boolean): Promise<void> {
  const path = `employees/${id}`;
  try {
    const ref = doc(db, 'employees', id);
    await updateDoc(ref, { 
      checkedIn,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update an employee's Verification state
 */
export async function updateEmployeeVerification(id: string, verified: boolean): Promise<void> {
  const path = `employees/${id}`;
  try {
    const ref = doc(db, 'employees', id);
    await updateDoc(ref, { 
      verified,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Update Admin PIN in settings
 */
export async function updateAdminPin(newPin: string): Promise<void> {
  const settingsRef = doc(db, 'settings', 'admin_config');
  await setDoc(settingsRef, { pin: newPin }, { merge: true });
}

/**
 * Get Admin PIN from settings
 */
export async function getAdminPin(): Promise<string> {
  const settingsRef = doc(db, 'settings', 'admin_config');
  const snap = await getDoc(settingsRef);
  if (snap.exists() && snap.data().pin) {
    return snap.data().pin;
  }
  return '24052529'; // Default as requested
}

/**
 * Write current Firestore state back to Google Sheets
 */
export async function syncFirestoreToSheet(spreadsheetId: string, employees: Employee[], rooms: Room[], accessToken?: string): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/sheets/write', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        spreadsheetId,
        employees,
        rooms
      })
    });

    if (!response.ok) {
      let errorMsg = 'Failed to sync to Google Sheets';
      const rawText = await response.text().catch(() => '');
      try {
        const errorData = JSON.parse(rawText);
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        errorMsg = rawText ? `Error (${response.status}): ${rawText.slice(0, 250)}` : `HTTP Error ${response.status}`;
      }
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    throw error;
  }
}

/**
 * Seed the default demo dataset directly into Firestore
 */
export async function seedDemoDataToFirestore(): Promise<void> {
  try {
    const defaultEmployees: Employee[] = [
      { id: 'EMP001', name: 'นายอนันต์ รักดี', gender: 'ชาย', department: 'ผู้บริหาร', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP002', name: 'นางสาววิภา ศรีสวัสดิ์', gender: 'หญิง', department: 'ผู้บริหาร', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP003', name: 'นายมานะ สมบูรณ์', gender: 'ชาย', department: 'ไอที', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP004', name: 'นายประเสริฐ เลิศล้ำ', gender: 'ชาย', department: 'ไอที', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP005', name: 'นางสาวสมศรี มีสุข', gender: 'หญิง', department: 'บัญชี', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP006', name: 'นางสาววรรณภรณ์ งามดี', gender: 'หญิง', department: 'บัญชี', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP007', name: 'นายพงศกร มุ่งมั่น', gender: 'ชาย', department: 'การตลาด', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP008', name: 'นายณัฐพงษ์ ยอดเยี่ยม', gender: 'ชาย', department: 'การตลาด', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP009', name: 'นางสาวพิมพิศา รักสงบ', gender: 'หญิง', department: 'การตลาด', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP010', name: 'นางสาวชลลดา สวยงาม', gender: 'หญิง', department: 'ฝ่ายบุคคล', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP011', name: 'นายธนวัฒน์ เกียรติภูมิ', gender: 'ชาย', department: 'การตลาด', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP012', name: 'นางสาวนภัสสร ขวัญดี', gender: 'หญิง', department: 'ไอที', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP013', name: 'นายธนกร รุ่งเรือง', gender: 'ชาย', department: 'ไอที', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP014', name: 'นางสาวกนกวรรณ ปรีชา', gender: 'หญิง', department: 'การตลาด', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP015', name: 'นายพิพัฒน์ เจริญพร', gender: 'ชาย', department: 'บัญชี', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
      { id: 'EMP016', name: 'นางสาวมณีรัตน์ จิตรเจริญ', gender: 'หญิง', department: 'ฝ่ายบุคคล', roomId: '', rsvpStatus: 'ยังไม่ระบุ' },
    ];

    const defaultRooms: Room[] = [
      { id: '101', roomName: 'Deluxe Suite 101', sequence: 1, roomType: 'Deluxe Suite', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 2500, floor: '1', notes: 'วิวทะเล เตียงคู่', employees: [] },
      { id: '102', roomName: 'Deluxe Suite 102', sequence: 2, roomType: 'Deluxe Suite', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 2500, floor: '1', notes: 'วิวทะเล เตียงคู่', employees: [] },
      { id: '103', roomName: 'Grand Deluxe 103', sequence: 3, roomType: 'Grand Deluxe', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 3000, floor: '1', notes: 'วิวสวน อ่างอาบน้ำ', employees: [] },
      { id: '201', roomName: 'Superior 201', sequence: 4, roomType: 'Superior Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 2000, floor: '2', notes: 'วิวภูเขา เตียงเดี่ยวใหญ่', employees: [] },
      { id: '202', roomName: 'Superior 202', sequence: 5, roomType: 'Superior Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 2000, floor: '2', notes: 'วิวภูเขา เตียงเดี่ยวใหญ่', employees: [] },
      { id: '203', roomName: 'Superior 203', sequence: 6, roomType: 'Superior Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 2000, floor: '2', notes: 'วิวภูเขา เตียงเดี่ยวใหญ่', employees: [] },
      { id: '301', roomName: 'Family Villa 301', sequence: 7, roomType: 'Family Villa', capacity: 4, genderRestriction: 'ไม่จำกัด', pricePerNight: 5000, floor: '3', notes: 'พูลวิลล่าสไตล์ครอบครัว 2 ห้องนอน', employees: [] },
      { id: '302', roomName: 'Presidential Suite 302', sequence: 8, roomType: 'Presidential Suite', capacity: 4, genderRestriction: 'ไม่จำกัด', pricePerNight: 6000, floor: '3', notes: 'ห้องหรูชั้นบนสุด วิวพานอรามา', employees: [] },
    ];

    // Update settings in Firestore
    await setDoc(doc(db, 'settings', 'config'), {
      rsvpClosed: false,
      spreadsheetId: '1e36OFOh6KBkDHIojH3L3wv9xfJqXp1FXm1RFgnR0A0A',
      spreadsheetName: 'ทำเนียบรายชื่อและผังห้องพักทริปบริษัท (ข้อมูลจำลอง)',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1e36OFOh6KBkDHIojH3L3wv9xfJqXp1FXm1RFgnR0A0A/edit'
    });

    // Write Employees in a batch
    const empBatch = writeBatch(db);
    defaultEmployees.forEach(emp => {
      const ref = doc(db, 'employees', emp.id);
      empBatch.set(ref, sanitizeData(emp));
    });
    await empBatch.commit();

    // Write Rooms in a batch
    const roomBatch = writeBatch(db);
    defaultRooms.forEach(rm => {
      const ref = doc(db, 'rooms', rm.id);
      roomBatch.set(ref, sanitizeData(rm));
    });
    await roomBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
  }
}

function sanitizeData<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  for (const key in sanitized) {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    } else if (typeof sanitized[key] === 'number' && Number.isNaN(sanitized[key])) {
      sanitized[key] = 0 as any;
    }
  }
  return sanitized;
}

/**
 * Bulk update employees in Firestore
 */
export async function updateEmployeesInFirestore(updatedEmployees: Employee[]): Promise<void> {
  const path = 'employees';
  try {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const newIds = new Set(updatedEmployees.map(emp => emp.id));

    const batch = writeBatch(db);

    // Delete removed employees
    querySnapshot.forEach(docSnap => {
      if (!newIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Write/update current employees
    updatedEmployees.forEach(emp => {
      const ref = doc(db, 'employees', emp.id);
      batch.set(ref, sanitizeData(emp));
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Reset all bookings in the system (clears both employee roomId and room occupants list)
 */
export async function resetAllBookingsInFirestore(): Promise<void> {
  const path = 'bulk-reset';
  try {
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    const roomsSnapshot = await getDocs(collection(db, 'rooms'));
    
    const batch = writeBatch(db);
    
    // 1. Clear roomId for all employees
    employeesSnapshot.forEach(docSnap => {
      batch.update(docSnap.ref, { 
        roomId: '',
        updatedAt: serverTimestamp()
      });
    });
    
    // 2. Clear employees array for all rooms
    roomsSnapshot.forEach(docSnap => {
      batch.update(docSnap.ref, { 
        employees: [],
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Wipe all employees in the system (deletes all employee records and clears all room bookings)
 */
export async function wipeAllEmployeesInFirestore(): Promise<void> {
  const path = 'bulk-wipe-employees';
  try {
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    const allDocRefs = employeesSnapshot.docs.map(docSnap => docSnap.ref);
    
    const BATCH_LIMIT = 450;
    for (let i = 0; i < allDocRefs.length; i += BATCH_LIMIT) {
      const deleteBatch = writeBatch(db);
      const chunk = allDocRefs.slice(i, i + BATCH_LIMIT);
      chunk.forEach(ref => {
        deleteBatch.delete(ref);
      });
      await deleteBatch.commit();
    }

    const roomsSnapshot = await getDocs(collection(db, 'rooms'));
    const roomsBatch = writeBatch(db);
    roomsSnapshot.forEach(docSnap => {
      roomsBatch.update(docSnap.ref, { 
        employees: [],
        updatedAt: serverTimestamp()
      });
    });
    await roomsBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Bulk update rooms in Firestore
 */
export async function updateRoomsInFirestore(updatedRooms: Room[]): Promise<void> {
  const path = 'rooms';
  try {
    const querySnapshot = await getDocs(collection(db, 'rooms'));
    const newRoomNumbers = new Set(updatedRooms.map(r => r.id));

    const batch = writeBatch(db);

    // Delete removed rooms
    querySnapshot.forEach(docSnap => {
      if (!newRoomNumbers.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    // Write/update current rooms
    updatedRooms.forEach(rm => {
      const ref = doc(db, 'rooms', rm.id);
      batch.set(ref, sanitizeData(rm));
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}


export async function updateBookingInFirestore(employeeIds: string[], roomId: string): Promise<void> {
  const path = `rooms/${roomId}/booking`;
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Get the target room
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) throw new Error("ไม่พบข้อมูลห้องพัก");
      
      const roomData = roomSnap.data();
      const capacity = Number(roomData.capacity) || 0;
      const currentRoomOccupants = (roomData.employees || []) as string[];
      
      // 2. Get current state of all employees to be moved
      const employeeData: { id: string, oldRoomId: string }[] = [];
      for (const id of employeeIds) {
        const empRef = doc(db, 'employees', id);
        const empSnap = await transaction.get(empRef);
        if (empSnap.exists()) {
          employeeData.push({ 
            id, 
            oldRoomId: empSnap.data().roomId || '' 
          });
        }
      }
      
      // 3. Calculate new occupants for the target room
      // People already in this room stay. New people are added.
      const newIdsToTarget = employeeIds.filter(id => !currentRoomOccupants.includes(id));
      
      if (currentRoomOccupants.length + newIdsToTarget.length > capacity) {
        throw new Error(`ห้องพักเต็มแล้ว (จุได้สูงสุด ${capacity} ท่าน, ปัจจุบันมีผู้เข้าพักแล้ว ${currentRoomOccupants.length} ท่าน) ไม่สามารถเพิ่มอีก ${newIdsToTarget.length} ท่านได้ครับ`);
      }
      
      // 4. Handle removals from old rooms if this is a move
      const roomsToUpdateRemovals: Record<string, string[]> = {};
      employeeData.forEach(emp => {
        if (emp.oldRoomId && emp.oldRoomId !== roomId) {
          if (!roomsToUpdateRemovals[emp.oldRoomId]) roomsToUpdateRemovals[emp.oldRoomId] = [];
          roomsToUpdateRemovals[emp.oldRoomId].push(emp.id);
        }
      });
      
      for (const [oldId, empIdsToRemove] of Object.entries(roomsToUpdateRemovals)) {
        const oldRoomRef = doc(db, 'rooms', oldId);
        transaction.update(oldRoomRef, {
          employees: arrayRemove(...empIdsToRemove),
          updatedAt: serverTimestamp()
        });
      }
      
      // 5. Update target room
      transaction.update(roomRef, {
        employees: arrayUnion(...employeeIds),
        updatedAt: serverTimestamp()
      });
      
      // 6. Update each employee doc
      employeeIds.forEach(id => {
        const empRef = doc(db, 'employees', id);
        transaction.update(empRef, { 
          roomId, 
          rsvpStatus: 'ไป',
          updatedAt: serverTimestamp() 
        });
      });
    });
  } catch (error) {
    // If it's our specific capacity error, throw it directly for UI to show
    if (error instanceof Error && error.message.includes('ห้องพักเต็มแล้ว')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function cancelBookingInFirestore(employeeId: string, oldRoomId?: string): Promise<void> {
  const path = `employees/${employeeId}/cancel`;
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Get the employee to find their current roomId if not provided
      const employeeRef = doc(db, 'employees', employeeId);
      const empSnap = await transaction.get(employeeRef);
      
      let actualRoomId = oldRoomId;
      if (!actualRoomId && empSnap.exists()) {
        actualRoomId = empSnap.data().roomId;
      }
      
      // 2. Clear employee's room
      transaction.update(employeeRef, { 
        roomId: '',
        updatedAt: serverTimestamp() 
      });
      
      // 3. Remove employee from the room document
      if (actualRoomId) {
        const roomRef = doc(db, 'rooms', actualRoomId);
        transaction.update(roomRef, {
          employees: arrayRemove(employeeId),
          updatedAt: serverTimestamp()
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Reset all verification states in Firestore
 */
export async function resetAllVerificationsInFirestore(): Promise<void> {
  const path = 'bulk-reset-verifications';
  try {
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    const batch = writeBatch(db);
    employeesSnapshot.forEach(docSnap => {
      batch.update(docSnap.ref, { 
        verified: false,
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
