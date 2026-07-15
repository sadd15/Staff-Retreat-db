import { Employee, Room, SheetConfig } from '../types';

// Standard Google API URLs
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Search Drive for Google Sheets
 */
export async function listSpreadsheets(accessToken: string): Promise<Array<{ id: string; name: string; mimeType: string; modifiedTime: string }>> {
  const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `${GOOGLE_DRIVE_API_BASE}/files?q=${q}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc&pageSize=20`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to list spreadsheets from Google Drive');
  }
  
  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new Spreadsheet with default structure
 */
export async function createSpreadsheet(accessToken: string, title: string): Promise<SheetConfig> {
  const url = GOOGLE_SHEETS_API_BASE;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'ระบบจองห้องพักทริปบริษัท (Company Trip Room Booking)',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create a new spreadsheet');
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetName = data.properties.title;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetName,
    spreadsheetUrl,
  };
}

/**
 * Ensure sheets "Employees" and "Rooms" exist in the spreadsheet
 */
export async function setupSpreadsheetTabs(accessToken: string, spreadsheetId: string): Promise<void> {
  const metadataRes = await fetch(`${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metadataRes.ok) {
    const err = await metadataRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch spreadsheet metadata');
  }

  const metadata = await metadataRes.json();
  const existingSheets: string[] = (metadata.sheets || []).map((s: any) => s.properties.title);

  const sheetsToCreate = ['Employees', 'Rooms', 'Settings'].filter(name => !existingSheets.includes(name));

  if (sheetsToCreate.length === 0) {
    return; // Already setup
  }

  // Create missing sheets
  const requests = sheetsToCreate.map(title => ({
    addSheet: {
      properties: { title },
    },
  }));

  const updateRes = await fetch(`${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to setup spreadsheet tabs');
  }
}

/**
 * Fetch entire sheet data
 */
export async function getSheetValues(accessToken: string, spreadsheetId: string, range: string): Promise<any[][]> {
  const url = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch values from range ${range}`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Write sheet values
 */
export async function updateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const url = `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to write values to range ${range}`);
  }
}

/**
 * Read and parse employees from "Employees" tab
 */
export async function fetchEmployees(accessToken: string, spreadsheetId: string): Promise<Employee[]> {
  const rows = await getSheetValues(accessToken, spreadsheetId, 'Employees!A1:G200');
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => String(h).trim());
  const idIdx = headers.indexOf('ID');
  const nameIdx = headers.indexOf('Name');
  const genderIdx = headers.indexOf('Gender');
  const deptIdx = headers.indexOf('Department');
  const roomIdx = headers.indexOf('RoomNumber');
  const rsvpIdx = headers.indexOf('RSVPStatus');
  const checkedInIdx = headers.indexOf('CheckedIn');

  // fallback to hardcoded indices if headers are missing
  const getVal = (row: any[], index: number, fallback: string = '') => {
    if (index === -1 || index >= row.length) return fallback;
    return row[index] !== undefined ? String(row[index]).trim() : fallback;
  };

  const employees: Employee[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || !row[idIdx !== -1 ? idIdx : 0]) continue;

    employees.push({
      id: getVal(row, idIdx, `EMP${String(i).padStart(3, '0')}`),
      name: getVal(row, nameIdx !== -1 ? nameIdx : 1, 'ไม่มีชื่อ'),
      gender: (getVal(row, genderIdx !== -1 ? genderIdx : 2, 'ชาย') === 'หญิง' ? 'หญิง' : 'ชาย') as 'ชาย' | 'หญิง',
      department: getVal(row, deptIdx !== -1 ? deptIdx : 3, 'ทั่วไป'),
      roomId: getVal(row, roomIdx !== -1 ? roomIdx : 4, ''),
      rsvpStatus: (getVal(row, rsvpIdx !== -1 ? rsvpIdx : 5, 'ยังไม่ระบุ') as any) || 'ยังไม่ระบุ',
      checkedIn: getVal(row, checkedInIdx !== -1 ? checkedInIdx : 6, 'false') === 'true',
    });
  }

  return employees;
}

/**
 * Read and parse rooms from "Rooms" tab
 */
export async function fetchRooms(accessToken: string, spreadsheetId: string): Promise<Room[]> {
  const rows = await getSheetValues(accessToken, spreadsheetId, 'Rooms!A1:G100');
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => String(h).trim());
  const roomNumIdx = headers.indexOf('RoomNumber');
  const typeIdx = headers.indexOf('RoomType');
  const capacityIdx = headers.indexOf('Capacity');
  const genderIdx = headers.indexOf('GenderRestriction');
  const priceIdx = headers.indexOf('PricePerNight');
  const floorIdx = headers.indexOf('Floor');
  const notesIdx = headers.indexOf('Notes');

  const getVal = (row: any[], index: number, fallback: string = '') => {
    if (index === -1 || index >= row.length) return fallback;
    return row[index] !== undefined ? String(row[index]).trim() : fallback;
  };

  const rooms: Room[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || !row[roomNumIdx !== -1 ? roomNumIdx : 0]) continue;

    const capacityStr = getVal(row, capacityIdx !== -1 ? capacityIdx : 2, '2');
    const priceStr = getVal(row, priceIdx !== -1 ? priceIdx : 4, '0');
    const floorStr = getVal(row, floorIdx !== -1 ? floorIdx : 5, '1');

    rooms.push({
      id: getVal(row, roomNumIdx !== -1 ? roomNumIdx : 0, `R${i}`),
      roomType: getVal(row, typeIdx !== -1 ? typeIdx : 1, 'Standard'),
      capacity: parseInt(capacityStr, 10) || 2,
      genderRestriction: (getVal(row, genderIdx !== -1 ? genderIdx : 3, 'ไม่จำกัด') as any) || 'ไม่จำกัด',
      pricePerNight: parseFloat(priceStr.replace(/,/g, '')) || 0,
      floor: floorStr || '1',
      notes: getVal(row, notesIdx !== -1 ? notesIdx : 6, ''),
    });
  }

  return rooms;
}

/**
 * Save all employees to "Employees" sheet
 */
export async function saveEmployees(accessToken: string, spreadsheetId: string, employees: Employee[]): Promise<void> {
  const headers = ['ID', 'Name', 'Gender', 'Department', 'RoomNumber', 'RSVPStatus', 'CheckedIn'];
  const rows = [
    headers,
    ...employees.map(e => [e.id, e.name, e.gender, e.department, e.roomId, e.rsvpStatus || 'ยังไม่ระบุ', e.checkedIn ? 'true' : 'false']),
  ];

  // We write to A1:G{N+1} to clean any excess rows
  const paddedRows = [...rows];
  while (paddedRows.length < 150) {
    paddedRows.push(['', '', '', '', '', '', '']);
  }

  await updateSheetValues(accessToken, spreadsheetId, 'Employees!A1:G150', paddedRows);
}

/**
 * Save all rooms to "Rooms" sheet
 */
export async function saveRooms(accessToken: string, spreadsheetId: string, rooms: Room[]): Promise<void> {
  const headers = ['RoomNumber', 'RoomType', 'Capacity', 'GenderRestriction', 'PricePerNight', 'Floor', 'Notes'];
  const rows = [
    headers,
    ...rooms.map(r => [r.id, r.roomType, r.capacity, r.genderRestriction, r.pricePerNight, r.floor, r.notes]),
  ];

  const paddedRows = [...rows];
  while (paddedRows.length < 50) {
    paddedRows.push(['', '', '', '', '', '', '']);
  }

  await updateSheetValues(accessToken, spreadsheetId, 'Rooms!A1:G50', paddedRows);
}

/**
 * Fetch settings like RSVP close configuration
 */
export async function fetchSettings(accessToken: string, spreadsheetId: string): Promise<{ rsvpClosed: boolean }> {
  try {
    const rows = await getSheetValues(accessToken, spreadsheetId, 'Settings!A1:B10');
    const settings = { rsvpClosed: false };
    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (row[0] === 'rsvpClosed') {
          settings.rsvpClosed = row[1] === 'true';
        }
      }
    }
    return settings;
  } catch (e) {
    console.warn('Settings tab not found or unreadable, returning defaults', e);
    return { rsvpClosed: false };
  }
}

/**
 * Save settings like RSVP close configuration
 */
export async function saveSettings(accessToken: string, spreadsheetId: string, settings: { rsvpClosed: boolean }): Promise<void> {
  const rows = [
    ['Key', 'Value'],
    ['rsvpClosed', settings.rsvpClosed ? 'true' : 'false'],
  ];
  await updateSheetValues(accessToken, spreadsheetId, 'Settings!A1:B5', rows);
}

/**
 * Load default mock data into a new sheet
 */
export async function seedDefaultData(accessToken: string, spreadsheetId: string): Promise<{ employees: Employee[]; rooms: Room[] }> {
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

  const defaultRooms: Room[] = [];

  await saveEmployees(accessToken, spreadsheetId, defaultEmployees);
  await saveRooms(accessToken, spreadsheetId, defaultRooms);
  await saveSettings(accessToken, spreadsheetId, { rsvpClosed: false });

  return {
    employees: defaultEmployees,
    rooms: defaultRooms,
  };
}
