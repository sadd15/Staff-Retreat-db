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

export interface MapZone {
  id: string;
  name: string;
  imageUrl?: string;
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
  mapPosition?: { x: number; y: number }; // Coordinates on resort map (backward compatibility)
  mapPositionZone1?: { x: number; y: number };
  mapPositionZone2?: { x: number; y: number };
  zonePositions?: Record<string, { x: number; y: number }>; // Dynamic coordinates per zone ID
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  mapImageUrl?: string;
  mapImageUrlZone1?: string;
  mapImageUrlZone2?: string;
  zones?: MapZone[];
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

export interface TripFeedback {
  id: string; // Unique ID (e.g. employeeId)
  employeeId: string;
  employeeName: string;
  department: string;
  ratingOverall: number; // 1 to 5
  ratingAccommodation: number; // 1 to 5
  ratingFood: number; // 1 to 5
  ratingActivities: number; // 1 to 5
  ratingSchedule: number; // 1 to 5
  ratingRestTime: number; // 1 to 5
  ratingBeverages: number; // 1 to 5
  ratingMusic: number; // 1 to 5
  likedMost?: string;
  suggestions?: string;
  shoutout?: string;
  isAnonymous: boolean;
  submittedAt: any;
}
