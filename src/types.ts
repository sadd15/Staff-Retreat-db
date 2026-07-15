export interface Employee {
  id: string;
  name: string;
  gender: 'ชาย' | 'หญิง';
  department: string;
  roomId: string; // empty string if not booked
  rsvpStatus?: 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ';
  checkedIn?: boolean;
}

export interface Room {
  id: string; // Used as unique ID
  roomType: string;
  capacity: number;
  genderRestriction: 'ชายล้วน' | 'หญิงล้วน' | 'ไม่จำกัด';
  pricePerNight?: number;
  floor?: string;
  notes?: string;
  employees?: string[];
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
}

export interface BookingSummary {
  totalEmployees: number;
  bookedCount: number;
  unbookedCount: number;
  totalRooms: number;
  occupiedRoomsCount: number;
  totalCost: number;
  occupancyRate: number; // percentage
  rsvpGoingCount: number;
  rsvpNotGoingCount: number;
  rsvpPendingCount: number;
}
