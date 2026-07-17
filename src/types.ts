export interface Employee {
  id: string;
  name: string;
  gender: 'ชาย' | 'หญิง';
  department: string;
  roomId: string; // empty string if not booked
  rsvpStatus?: 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ';
  checkedIn?: boolean;
  verified?: boolean;
}

export interface Room {
  id: string; // Used as unique ID
  roomName?: string; // Customizable room name (e.g., "บ้านริมธาร 881")
  roomType: string;
  capacity: number;
  genderRestriction: 'ชายล้วน' | 'หญิงล้วน' | 'ไม่จำกัด';
  pricePerNight?: number;
  floor?: string;
  notes?: string;
  sequence?: number; // Custom room sequence/order number (e.g. 1, 2, 3)
  employees?: string[];
  mapPosition?: { x: number; y: number }; // Coordinates on resort map
  mapPositionZone1?: { x: number; y: number };
  mapPositionZone2?: { x: number; y: number };
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  mapImageUrl?: string;
  mapImageUrlZone1?: string;
  mapImageUrlZone2?: string;
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
