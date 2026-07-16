import React, { useState, useMemo } from 'react';
import { Employee, Room } from '../types';
import { 
  Users, 
  Bed, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Search, 
  Filter, 
  ShieldAlert, 
  Check,
  User,
  ArrowRight,
  ArrowLeft,
  Info,
  Sparkles,
  ChevronRight,
  RefreshCw,
  X,
  UserX,
  Grid,
  Layers,
  Compass,
  DollarSign,
  List,
  Building2
} from 'lucide-react';

interface EmployeeBookingProps {
  employees: Employee[];
  rooms: Room[];
  onBook: (employeeId: string, roommateIds: string[], roomId: string) => Promise<void>;
  onCancelBooking: (employeeId: string) => Promise<void>;
  syncing: boolean;
  onUpdateRooms?: (updatedRooms: Room[]) => Promise<void>;
  userRole: 'visitor' | 'employee' | 'admin' | null;
  selectedEmployeeId: string | null;
  selectedDepartment: string | null;
  isReadOnlyEmployee?: boolean;
}

export default function EmployeeBooking({
  employees,
  rooms,
  onBook,
  onCancelBooking,
  syncing,
  onUpdateRooms,
  userRole,
  selectedEmployeeId,
  selectedDepartment,
  isReadOnlyEmployee = false,
}: EmployeeBookingProps) {
  // Stepper / Wizard state: 1 = Select Employee, 2 = Select Room, 3 = Select Roommates & Confirm
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Core selection state
  const [selectedMainEmpId, setSelectedMainEmpId] = useState<string>('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [selectedRoommateIds, setSelectedRoommateIds] = useState<string[]>([]);
  const [mixedGenderConsent, setMixedGenderConsent] = useState(false);

  // Auto-initialize selectedMainEmpId for employees
  React.useEffect(() => {
    if (userRole === 'employee' && selectedEmployeeId) {
      setSelectedMainEmpId(selectedEmployeeId);
    }
  }, [userRole, selectedEmployeeId]);
  const [isCheckingRealtime, setIsCheckingRealtime] = useState(false);
  const [realtimeCheckStep, setRealtimeCheckStep] = useState<number>(0);
  const [viewingOccupantsRoomId, setViewingOccupantsRoomId] = useState<string | null>(null);

  // Search & Filter state for the wizard
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [roomFilterType, setRoomFilterType] = useState<string>('all');
  const [roomFilterGender, setRoomFilterGender] = useState<string>('all');
  const [roommateSearchQuery, setRoommateSearchQuery] = useState('');

  // Search & Filter state for the Interactive Room Directory (Bottom section)

  // Room Creation state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomType, setNewRoomType] = useState('Standard Twin');
  const [newRoomCapacity, setNewRoomCapacity] = useState(2);
  const [newRoomGender, setNewRoomGender] = useState('ไม่จำกัด');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSequence, setNewRoomSequence] = useState<number | undefined>(undefined);
  const [newRoomFloor, setNewRoomFloor] = useState(1);

  // Step 2 lists sub-filters (important for 120+ employees)
  const [bookingMainEmpDeptFilter, setBookingMainEmpDeptFilter] = useState<string>('all');
  const [bookingMainEmpGenderFilter, setBookingMainEmpGenderFilter] = useState<string>('all');
  const [bookingRoommateDeptFilter, setBookingRoommateDeptFilter] = useState<string>('all');

  // Derive unique departments list from employees list
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  // Submit / action feedback states
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Map each room to its current occupants
  const roomOccupantsMap = useMemo(() => {
    const map: Record<string, Employee[]> = {};
    rooms.forEach(r => {
      map[r.id] = [];
    });
    employees.forEach(e => {
      if (e.roomId && map[e.roomId]) {
        map[e.roomId].push(e);
      }
    });
    return map;
  }, [rooms, employees]);

  // Overall Room Stats (Bento Dashboard)
  const roomStats = useMemo(() => {
    const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const occupiedBeds = employees.filter(e => e.roomId).length;
    const availableBeds = totalBeds - occupiedBeds;
    const totalRoomsCount = rooms.length;
    
    let fullyBookedCount = 0;
    let emptyRoomsCount = 0;
    let maleRestrictedCount = 0;
    let femaleRestrictedCount = 0;
    let unrestrictedCount = 0;

    rooms.forEach(r => {
      const occupantsCount = roomOccupantsMap[r.id]?.length || 0;
      if (occupantsCount >= r.capacity) fullyBookedCount++;
      if (occupantsCount === 0) emptyRoomsCount++;
      
      if (r.genderRestriction === 'ชายล้วน') maleRestrictedCount++;
      else if (r.genderRestriction === 'หญิงล้วน') femaleRestrictedCount++;
      else unrestrictedCount++;
    });

    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      totalRoomsCount,
      fullyBookedCount,
      emptyRoomsCount,
      maleRestrictedCount,
      femaleRestrictedCount,
      unrestrictedCount,
      occupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
    };
  }, [rooms, employees, roomOccupantsMap]);

  // List of all unbooked employees who are attending (RSVP = ไป)
  const unbookedEmployees = useMemo(() => {
    return employees.filter(e => !e.roomId && e.rsvpStatus === 'ไป');
  }, [employees]);

  // Selected main employee details
  const selectedMainEmp = useMemo(() => {
    return employees.find(e => e.id === selectedMainEmpId);
  }, [selectedMainEmpId, employees]);

  // Filtered list of unbooked employees for main selection
  const filteredMainEmployees = useMemo(() => {
    let result = unbookedEmployees;

    // If logged in as employee, restrict main booker choice to oneself
    if (userRole === 'employee' && selectedEmployeeId) {
      result = result.filter(e => e.id === selectedEmployeeId);
    } else {
      // Apply department filter
      if (bookingMainEmpDeptFilter !== 'all') {
        result = result.filter(e => e.department === bookingMainEmpDeptFilter);
      }

      // Apply gender filter
      if (bookingMainEmpGenderFilter !== 'all') {
        result = result.filter(e => e.gender === bookingMainEmpGenderFilter);
      }
    }

    if (!bookingSearchQuery) return result;
    const q = bookingSearchQuery.toLowerCase();
    return result.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  }, [unbookedEmployees, bookingSearchQuery, bookingMainEmpDeptFilter, bookingMainEmpGenderFilter, userRole, selectedEmployeeId]);

  // Filtered list of booked employees for lookup/manage
  const filteredBookedEmployees = useMemo(() => {
    const booked = employees.filter(e => e.roomId);
    if (!bookingSearchQuery) return booked;
    const q = bookingSearchQuery.toLowerCase();
    return booked.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  }, [employees, bookingSearchQuery]);

  // Selected room details
  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomNumber);
  }, [selectedRoomNumber, rooms]);

  // Occupants in the selected room currently
  const currentRoomOccupants = useMemo(() => {
    if (!selectedRoomNumber) return [];
    return roomOccupantsMap[selectedRoomNumber] || [];
  }, [selectedRoomNumber, roomOccupantsMap]);

  // Unique Room Types for filtering
  const roomTypes = useMemo(() => {
    const types = new Set<string>();
    rooms.forEach(r => types.add(r.roomType));
    return Array.from(types);
  }, [rooms]);

  // Filtered Rooms for Wizard selection (Step 2)
  const filteredRoomsForWizard = useMemo(() => {
    const result = rooms.filter(room => {
      // Type filter
      if (roomFilterType !== 'all' && room.roomType !== roomFilterType) return false;
      
      // Gender restriction & availability filter
      if (roomFilterGender !== 'all') {
        const occupantsCount = roomOccupantsMap[room.id]?.length || 0;
        if (roomFilterGender === 'empty' && occupantsCount > 0) return false;
        if (roomFilterGender === 'available' && occupantsCount >= Number(room.capacity)) return false;
        if (roomFilterGender === 'male' && room.genderRestriction !== 'ชายล้วน') return false;
        if (roomFilterGender === 'female' && room.genderRestriction !== 'หญิงล้วน') return false;
        if (roomFilterGender === 'mixed' && room.genderRestriction !== 'ไม่จำกัด') return false;
      }
      
      return true;
    });

    // Sort strictly by Room Sorting Criteria first, so they are displayed in correct sequential order (Sequence -> House Number -> Slash Number -> Floor)
    return [...result].sort((a, b) => {
      const parseRoomSortKey = (room: Room) => {
        const name = room.roomName || '';
        const id = room.id || '';
        const seq = room.sequence !== undefined ? Number(room.sequence) : 9999;
        const floor = room.floor !== undefined ? Number(room.floor) : 1;

        let houseNumber = 9999;
        let slashNumber = 0;

        // Look for numbers like "881/1" or "881" in the roomName first
        const patternMatch = name.match(/(\d+)(?:\/(\d+))?/);
        if (patternMatch) {
          houseNumber = Number(patternMatch[1]);
          if (patternMatch[2]) {
            slashNumber = Number(patternMatch[2]);
          }
        } else {
          // Fallback to id
          const idMatch = id.match(/(\d+)(?:\/(\d+))?/);
          if (idMatch) {
            houseNumber = Number(idMatch[1]);
            if (idMatch[2]) {
              slashNumber = Number(idMatch[2]);
            }
          }
        }

        return {
          sequence: seq,
          houseNumber,
          slashNumber,
          floor
        };
      };

      const aKey = parseRoomSortKey(a);
      const bKey = parseRoomSortKey(b);

      // 1. "ตามลำดับห้องที่" -> sequence
      if (aKey.sequence !== bKey.sequence) {
        return aKey.sequence - bKey.sequence;
      }

      // 2. "ตามด้วยลำดับ" -> houseNumber
      if (aKey.houseNumber !== bKey.houseNumber) {
        return aKey.houseNumber - bKey.houseNumber;
      }

      // 3. "ตามด้วยถ้ามีหมายเลขพวก /ด้านหลังให้เรียงตามลำดับให้ถูกต้อง" -> slashNumber
      if (aKey.slashNumber !== bKey.slashNumber) {
        return aKey.slashNumber - bKey.slashNumber;
      }

      // 4. "ตามด้วยชั้น" -> floor
      if (aKey.floor !== bKey.floor) {
        return aKey.floor - bKey.floor;
      }

      return a.id.localeCompare(b.id, 'en', { numeric: true });
    });
  }, [rooms, roomFilterType, roomFilterGender, roomOccupantsMap]);

  // Roommates selection pool (unbooked employees, excluding selected main employee, matching room's gender restriction)
  const candidateRoommates = useMemo(() => {
    if (!selectedMainEmp) return [];
    
    const result = unbookedEmployees.filter(e => {
      // Cannot select self
      if (e.id === selectedMainEmp.id) return false;
      
      // If selected room has a gender restriction, roommates must match it
      if (selectedRoom) {
        if (selectedRoom.genderRestriction === 'ชายล้วน' && e.gender !== 'ชาย') return false;
        if (selectedRoom.genderRestriction === 'หญิงล้วน' && e.gender !== 'หญิง') return false;
      }
      
      // Filter by department
      if (bookingRoommateDeptFilter !== 'all' && e.department !== bookingRoommateDeptFilter) return false;

      // Filter by search query
      if (roommateSearchQuery) {
        const q = roommateSearchQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
        );
      }
      
      return true;
    });

    // Sort: Colleagues from the same department as the main booker should appear at the top
    return [...result].sort((a, b) => {
      const aSame = a.department === selectedMainEmp.department ? 1 : 0;
      const bSame = b.department === selectedMainEmp.department ? 1 : 0;
      if (aSame !== bSame) return bSame - aSame; // Descending, so 1 (same) comes before 0
      return a.name.localeCompare(b.name, 'th');
    });
  }, [unbookedEmployees, selectedMainEmp, selectedRoom, roommateSearchQuery, bookingRoommateDeptFilter]);


  const isMainEmpNew = useMemo(() => {
    if (!selectedMainEmpId || !selectedRoomNumber) return false;
    const occupants = roomOccupantsMap[selectedRoomNumber] || [];
    return !occupants.find(e => e.id === selectedMainEmpId);
  }, [selectedMainEmpId, selectedRoomNumber, roomOccupantsMap]);

  // Booking rules validation for selected settings (Step 3)
  const validation = useMemo(() => {
    if (!selectedMainEmp || !selectedRoom) return { isValid: false, reason: '' };

    const occupants = currentRoomOccupants;
    const selectedRoommatesCount = selectedRoommateIds.length;
    const totalNewPeopleCount = (isMainEmpNew ? 1 : 0) + selectedRoommatesCount;
    const totalHeadcount = occupants.length + totalNewPeopleCount;

    // 1. Capacity limit check
    if (totalHeadcount > Number(selectedRoom.capacity)) {
      return {
        isValid: false,
        reason: `จำนวนคนเกินความจุห้องพัก (ห้องนี้จุได้สูงสุด ${Number(selectedRoom.capacity)} คน, ปัจจุบันมีผู้พักแล้ว ${occupants.length} คน และเลือกเพิ่มอีก ${totalNewPeopleCount} คน)`,
      };
    }

    // 2. Room gender restriction check
    const allNewGenders = [selectedMainEmp.gender, ...selectedRoommateIds.map(id => employees.find(e => e.id === id)?.gender).filter(Boolean)];
    
    if (selectedRoom.genderRestriction === 'ชายล้วน') {
      const hasFemale = allNewGenders.includes('หญิง');
      if (hasFemale) {
        return { isValid: false, reason: 'ห้องพักนี้กำหนดให้พักได้เฉพาะ "ชายล้วน" เท่านั้น (ไม่สามารถนำผู้หญิงเข้าพักร่วมได้)' };
      }
    }

    if (selectedRoom.genderRestriction === 'หญิงล้วน') {
      const hasMale = allNewGenders.includes('ชาย');
      if (hasMale) {
        return { isValid: false, reason: 'ห้องพักนี้กำหนดให้พักได้เฉพาะ "หญิงล้วน" เท่านั้น (ไม่สามารถนำผู้ชายเข้าพักร่วมได้)' };
      }
    }

    // 3. Mixed gender checking if unrestricted but occupants have different gender
    if (selectedRoom.genderRestriction === 'ไม่จำกัด') {
      const occupantGenders = occupants.map(o => o.gender);
      const uniqueOccupantGenders = Array.from(new Set(occupantGenders));
      const uniqueNewGenders = Array.from(new Set(allNewGenders));
      
      // If there's mixed genders combined
      const combinedGenders = Array.from(new Set([...uniqueOccupantGenders, ...uniqueNewGenders]));
      if (combinedGenders.length > 1 && !mixedGenderConsent) {
        return {
          isValid: false,
          needsConsent: true,
          reason: 'การเข้าพักครั้งนี้จะมีผู้พักคละเพศ (ชายและหญิง) ในห้องเดียวกัน กรุณากดยอมรับเพื่อยินยอมพักร่วมกัน',
        };
      }
    }

    return { isValid: true, reason: '' };
  }, [selectedMainEmp, selectedRoom, currentRoomOccupants, selectedRoommateIds, employees, mixedGenderConsent]);

  // Helper to compile selected employee IDs
  const selectedPeopleIds = useMemo(() => {
    const ids: string[] = [];
    if (selectedMainEmpId) ids.push(selectedMainEmpId);
    selectedRoommateIds.forEach(id => ids.push(id));
    return ids;
  }, [selectedMainEmpId, selectedRoommateIds]);

  // Handle room selection and automatically advance to Step 2 (Select People)
  const handleSelectRoom = (roomNum: string) => {
    const room = rooms.find(r => r.id === roomNum);
    if (room) {
      const occupants = roomOccupantsMap[roomNum] || [];
      if (occupants.length >= Number(room.capacity)) {
        setActionError(`⚠️ ไม่สามารถเลือกห้อง ${roomNum} ได้ เนื่องจากที่พักเต็มแล้ว (${Number(room.capacity)}/${Number(room.capacity)} ท่าน) โปรดเลือกห้องอื่นที่มีเตียงว่าง`);
        setActionSuccess(null);
        return;
      }
    }
    setSelectedRoomNumber(roomNum);
    
    // If room has occupants, auto-select the first one as the "Main Booker" reference
    const occupants = roomOccupantsMap[roomNum] || [];
    if (occupants.length > 0) {
      setSelectedMainEmpId(occupants[0].id);
    } else {
      setSelectedMainEmpId('');
    }
    
    setSelectedRoommateIds([]);
    setMixedGenderConsent(false);
    setActionError(null);
    setActionSuccess(null);
    
    // Move to Step 2
    setActiveStep(2);
  };

  const toggleEmployeeSelection = (id: string) => {
    const isSelected = selectedPeopleIds.includes(id);
    const occupantsCount = currentRoomOccupants.length;
    const roomCapacity = (selectedRoom ? Number(selectedRoom.capacity) : 2) || 2;
    const remainingBeds = Math.max(0, roomCapacity - occupantsCount);

    if (isSelected) {
      const updated = selectedPeopleIds.filter(pid => pid !== id);
      setSelectedMainEmpId(updated[0] || '');
      setSelectedRoommateIds(updated.slice(1));
    } else {
      if (selectedPeopleIds.length >= remainingBeds) {
        alert(`ห้องนี้มีที่ว่างคงเหลือเพียง ${remainingBeds} เตียงพอดิบพอดี ไม่สามารถเพิ่มมากกว่านี้ได้ครับ`);
        return;
      }
      const updated = [...selectedPeopleIds, id];
      setSelectedMainEmpId(updated[0] || '');
      setSelectedRoommateIds(updated.slice(1));
    }
  };

  const toggleRoommateSelection = (id: string) => {
    if (selectedRoommateIds.includes(id)) {
      setSelectedRoommateIds(selectedRoommateIds.filter(rid => rid !== id));
    } else {
      if (selectedRoom) {
        // Remaining beds after accounting for the main booker selection
        const remainingCapacity = Number(selectedRoom.capacity) - currentRoomOccupants.length - (isMainEmpNew ? 1 : 0);
        
        if (selectedRoommateIds.length >= remainingCapacity) {
          const roomIndex = rooms.findIndex(r => r.id === selectedRoom.id);
          const displayRoom = roomIndex !== -1 ? `กลุ่มที่ ${roomIndex + 1}` : selectedRoom.id;
          if (remainingCapacity <= 0) {
            alert(`ขออภัยครับ ${displayRoom} ได้เลือกคนครบตามจำนวนที่ว่างแล้ว กรุณากดปุ่ม "เลือกคนลงห้อง" ด้านล่างเพื่อดำเนินการยืนยันต่อ`);
          } else {
            alert(`ขออภัยครับ ${displayRoom} สามารถเพิ่มเพื่อนร่วมห้องได้สูงสุดอีกเพียง ${remainingCapacity} ท่านเท่านั้น`);
          }
          return;
        }
      }
      setSelectedRoommateIds([...selectedRoommateIds, id]);
    }
  };

  const handleCreateRoom = async () => {
    if (!onUpdateRooms) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const timestampStr = Date.now().toString().slice(-4);
      const newRoomNumber = `RM-${timestampStr}`; // e.g. RM-1234
      
      const maxSequence = rooms.reduce((max, r) => (r.sequence !== undefined && r.sequence > max ? r.sequence : max), 0);
      const calculatedSeq = newRoomSequence !== undefined ? Number(newRoomSequence) : (maxSequence + 1);

      const newRoom: Room = {
        id: newRoomNumber,
        roomType: newRoomType,
        capacity: newRoomCapacity,
        genderRestriction: newRoomGender as any,
        roomName: newRoomName.trim() || '',
        sequence: calculatedSeq,
        floor: newRoomFloor.toString(),
        notes: 'สร้างห้องพักเพิ่มเติมโดยผู้ใช้งาน',
      };
      const updatedRooms = [...rooms, newRoom];
      await onUpdateRooms(updatedRooms);
      setActionSuccess(`สร้างห้องพัก ${newRoomNumber} (${newRoomType}) สำเร็จแล้ว! คุณสามารถเลือกห้องนี้ได้ทันที`);
      setIsAddingRoom(false);
      
      // Reset form states
      setNewRoomName('');
      setNewRoomSequence(undefined);
      setNewRoomFloor(1);

      // Auto-select this newly created room
      setSelectedRoomNumber(newRoomNumber);
      setActiveStep(2);
    } catch (err: any) {
      setActionError(`เกิดข้อผิดพลาดในการสร้างห้อง: ${err.message}`);
    } finally {
      setSubmitting(false);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const handleBookingSubmit = async () => {
    if (isReadOnlyEmployee) {
      setActionError('⚠️ ไม่สามารถทำรายการจองได้เนื่องจากสิทธิ์ของคุณเป็นแบบอ่านอย่างเดียวครับ');
      return;
    }
    if (selectedPeopleIds.length === 0) {
      setActionError('⚠️ กรุณาเลือกพนักงานเพื่อทำการจองอย่างน้อย 1 คน');
      return;
    }
    if (!selectedRoomNumber) {
      setActionError('⚠️ กรุณาเลือกห้องพักก่อนครับ');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    setIsCheckingRealtime(true);
    setRealtimeCheckStep(1); // Step 1

    // Determine if we are adding to an existing room
    const existingOccupantsInTarget = employees.filter(e => e.roomId === selectedRoomNumber);
    const newPeopleToBook = selectedPeopleIds.filter(id => !existingOccupantsInTarget.find(e => e.id === id));

    if (existingOccupantsInTarget.length > 0 && newPeopleToBook.length === 0) {
      setSubmitting(false);
      setIsCheckingRealtime(false);
      setActionError('⚠️ ห้องนี้มีผู้เข้าพักอยู่แล้ว กรุณาเลือกพนักงานท่านใหม่จาก "ส่วนที่ 2" เพื่อเพิ่มเข้าไปครับ');
      return;
    }

    try {
      // Simulate real-time database check
      await new Promise(resolve => setTimeout(resolve, 600));
      setRealtimeCheckStep(2); // Step 2
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setRealtimeCheckStep(3); // Step 3
      
      // Real-time checks
      const alreadyBooked: string[] = [];
      selectedPeopleIds.forEach(id => {
        const emp = employees.find(e => e.id === id);
        // If employee is already booked, it's only an error if they are in a DIFFERENT room
        if (emp && emp.roomId && emp.roomId !== selectedRoomNumber) {
          alreadyBooked.push(emp.name);
        }
      });

      if (alreadyBooked.length > 0) {
        throw new Error(`ขออภัยครับ พนักงานดังต่อไปนี้ถูกจัดสรรห้องพักไปเรียบร้อยแล้วในระบบจากการจองพร้อมกัน: ${alreadyBooked.join(', ')}`);
      }

      // Check room occupancy overflow concurrently
      const currentOccupantsCount = employees.filter(e => e.roomId === selectedRoomNumber).length;
      const roomCapacity = (selectedRoom ? Number(selectedRoom.capacity) : 2) || 2;
      
      // Calculate how many NEW people we are adding (those not already in this room)
      const newPeopleToRoom = selectedPeopleIds.filter(id => {
        const emp = employees.find(e => e.id === id);
        return emp && emp.roomId !== selectedRoomNumber;
      });

      if (currentOccupantsCount + newPeopleToRoom.length > roomCapacity) {
        const remaining = roomCapacity - currentOccupantsCount;
        const displayRoom = rooms.findIndex(r => r.id === selectedRoomNumber) !== -1 ? `กลุ่มที่ ${rooms.findIndex(r => r.id === selectedRoomNumber) + 1}` : selectedRoomNumber;
        throw new Error(`ขออภัยครับ ${displayRoom} มีความจุสูงสุด ${roomCapacity} ท่าน ปัจจุบันมีผู้เข้าพักแล้ว ${currentOccupantsCount} ท่าน (เหลือที่ว่าง ${remaining} ที่) แต่คุณกำลังพยายามเพิ่มเข้าไปอีก ${newPeopleToRoom.length} ท่าน ซึ่งเกินกว่าจำนวนที่ว่างรองรับได้ โปรดนำผู้เข้าพักบางท่านออกหรือเปลี่ยนห้องครับ`);
      }

      await new Promise(resolve => setTimeout(resolve, 400));
      setRealtimeCheckStep(4); // Step 4
      await new Promise(resolve => setTimeout(resolve, 300));

      await onBook(selectedMainEmpId, selectedRoommateIds, selectedRoomNumber);
      
      // Success feedback
      const roomIndex = rooms.findIndex(r => r.id === selectedRoomNumber);
      const displayRoom = roomIndex !== -1 ? `กลุ่มที่ ${roomIndex + 1}` : selectedRoomNumber;
      setActionSuccess(`🎉 จอง${displayRoom} สำเร็จ เรียบร้อยแล้วสำหรับผู้เดินทางทั้งหมด!`);
      
      // Reset states
      setSelectedMainEmpId('');
      setSelectedRoomNumber('');
      setSelectedRoommateIds([]);
      setMixedGenderConsent(false);
      setActiveStep(1); // Return to step 1
    } catch (err: any) {
      setActionError(err.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง');
    } finally {
      setSubmitting(false);
      setIsCheckingRealtime(false);
      setRealtimeCheckStep(0);
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans space-y-8" id="booking-system-container">
      
      {/* Visual Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="booking-banner">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100 uppercase tracking-wider mb-2 font-display">
            ระบบจองห้องพักพนักงาน (Hotel Allocation Hub)
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-800 leading-tight">
            จัดสรรและเลือกห้องพักอย่างง่ายดาย
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            เลือกเพื่อนร่วมห้อง และระบุเตียงว่างในโรงแรมที่สอดคล้องตามเงื่อนไขเพศ เพื่อการเดินทางทริปที่สะดวกสบายที่สุด
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3.5 py-2 border border-slate-200 rounded-2xl font-medium">
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'กำลังบันทึกลงคลาวด์...' : 'ข้อมูลเชื่อมโยงกับ Google Sheets เรียลไทม์'}
          </span>
        </div>
      </div>

      {/* Notifications Panel */}
      {(actionSuccess || actionError) && (
        <div className="space-y-2 animate-in fade-in duration-200" id="notification-bar">
          {actionSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-2xl flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-900">สำเร็จ!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">{actionSuccess}</p>
              </div>
              <button onClick={() => setActionSuccess(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {actionError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3.5 rounded-2xl flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-900">เกิดข้อผิดพลาด</p>
                <p className="text-[11px] text-rose-700 mt-0.5 font-medium">{actionError}</p>
              </div>
              <button onClick={() => setActionError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visitor Mode Warning Banner */}
      {userRole === 'visitor' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-300" id="visitor-mode-booking-notice">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-amber-900 font-display">โหมดผู้เยี่ยมชม (Visitor Mode) - อ่านอย่างเดียว</h4>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
              คุณเข้าใช้งานในสถานะผู้เยี่ยมชม จึงสามารถดูผังห้องและรายชื่อผู้จองได้เท่านั้น ไม่สามารถกดจองห้องพัก เลือกผู้เข้าพัก หรือลบการจองใดๆ ได้ หากคุณต้องการจองห้องพัก โปรดสลับสิทธิ์เข้าสู่ระบบเป็น <b>"พนักงาน"</b> ในส่วนเมนูด้านบนสุดครับ
            </p>
          </div>
        </div>
      )}

      {/* Read Only Employee Warning Banner */}
      {isReadOnlyEmployee && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-300" id="readonly-mode-booking-notice">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-amber-900 font-display">โหมดดูอย่างเดียว (Read-only Mode)</h4>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
              เครื่องนี้ได้ผ่านการยืนยันตัวตนในชื่อพนักงานท่านอื่นเรียบร้อยแล้ว คุณสามารถเข้าชมข้อมูลการจัดห้องได้เท่านั้น แต่<b>ไม่สามารถส่งข้อมูลจองห้องพักหรือยกเลิกการจองได้</b>ครับ
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Bento Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5" id="booking-stats-board">
        
        {/* Total beds */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-3xs hover:border-indigo-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">จำนวนเตียงทริปนี้</span>
              <div className="p-1 rounded bg-indigo-50 text-indigo-600 shrink-0">
                <Bed className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-sm sm:text-lg font-display font-black text-slate-800 mt-1 sm:mt-1.5">
              {roomStats.totalBeds} <span className="text-[9px] text-slate-400 font-sans font-medium font-bold">เตียง</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 sm:mt-2">
            <span className="text-[9px] bg-indigo-50/50 text-indigo-600 border border-indigo-100/40 px-1.5 py-0.5 rounded-md font-bold">
              {roomStats.totalRoomsCount} ห้องพัก
            </span>
          </div>
        </div>

        {/* Occupied beds */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-3xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">จองเตียงแล้ว</span>
              <div className="p-1 rounded bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-sm sm:text-lg font-display font-black text-slate-800 mt-1 sm:mt-1.5">
              {roomStats.occupiedBeds} <span className="text-[10px] text-slate-400 font-sans font-medium font-bold">เตียง</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 sm:mt-2">
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${roomStats.occupancyPercent}%` }}></div>
            </div>
            <span className="text-[8px] font-mono text-slate-500 font-bold shrink-0">{roomStats.occupancyPercent}%</span>
          </div>
        </div>

        {/* Available beds */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-3xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">เตียงว่างคงเหลือ</span>
              <div className="p-1 rounded bg-amber-50 text-amber-600 shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-sm sm:text-lg font-display font-black text-amber-600 mt-1 sm:mt-1.5">
              {roomStats.availableBeds} <span className="text-[10px] text-slate-400 font-sans font-medium font-bold">เตียง</span>
            </p>
          </div>
          <p className="text-[9px] text-slate-400 mt-1 sm:mt-2 leading-none">
            ว่าง {roomStats.emptyRoomsCount} ห้องเปล่า
          </p>
        </div>

        {/* Fully booked rooms count */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-3xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">ห้องที่เต็มแล้ว</span>
              <div className="p-1 rounded bg-slate-100 text-slate-600 shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-sm sm:text-lg font-display font-black text-slate-700 mt-1 sm:mt-1.5">
              {roomStats.fullyBookedCount} <span className="text-[10px] text-slate-400 font-sans font-medium font-bold">ห้อง</span>
            </p>
          </div>
          <p className="text-[9px] text-slate-400 mt-1 sm:mt-2 leading-none">
            จากทั้งหมด {roomStats.totalRoomsCount} ห้อง
          </p>
        </div>

        {/* Gender Breakdown Stats */}
        <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-3xs hover:border-slate-300 transition-all col-span-2 sm:col-span-1 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">เงื่อนไขห้องพัก</span>
            <div className="p-1 rounded bg-indigo-50 text-indigo-600 shrink-0">
              <Filter className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2 space-y-1 text-[9px] text-slate-600">
            <div className="flex justify-between items-center">
              <span>🔵 ชาย:</span>
              <span className="font-bold text-blue-600">{roomStats.maleRestrictedCount} ห้อง</span>
            </div>
            <div className="flex justify-between items-center">
              <span>🔴 หญิง:</span>
              <span className="font-bold text-rose-600">{roomStats.femaleRestrictedCount} ห้อง</span>
            </div>
            <div className="flex justify-between items-center">
              <span>⚪ ไม่จำกัด:</span>
              <span className="font-bold text-slate-600">{roomStats.unrestrictedCount} ห้อง</span>
            </div>
          </div>
        </div>

      </div>

      {/* The Step-by-Step Interactive Booking Wizard */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="booking-stepper-console">
        
        {/* Wizard Header & Step Nav */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-display font-extrabold text-slate-800">
                  เครื่องมือช่วยจองห้องพักอัจฉริยะ (Room Booking Wizard)
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  กรุณาทำรายการทีละขั้นตอน เพื่อป้องกันความสับสนและการเลือกห้องผิดเงื่อนไข
                </p>
              </div>
            </div>

            {/* Steps Progress Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-3xs self-start md:self-auto overflow-x-auto scrollbar-hide max-w-full">
              <button
                onClick={() => setActiveStep(1)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeStep === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                  activeStep === 1 ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>1</span>
                เลือกห้องพัก
              </button>
              
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              
              <button
                onClick={() => {
                  if (selectedRoomNumber) setActiveStep(2);
                  else alert('โปรดเลือกห้องพักในขั้นตอนที่ 1 ก่อนครับ');
                }}
                disabled={!selectedRoomNumber}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                  activeStep === 2
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                  activeStep === 2 ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>2</span>
                เลือกคนลงห้อง
              </button>
              
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              
              <button
                onClick={() => {
                  if (selectedRoomNumber && selectedPeopleIds.length > 0) setActiveStep(3);
                  else alert('โปรดเลือกพนักงานลงในห้องก่อนครับ');
                }}
                disabled={!selectedRoomNumber || selectedPeopleIds.length === 0}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                  activeStep === 3
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                  activeStep === 3 ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>3</span>
                ตรวจสอบ & ยืนยัน
              </button>
            </div>
          </div>
        </div>

        {/* Wizard Main Area */}
        <div className="p-6 sm:p-8">

          {/* ================= STEP 1: SELECT ROOM FIRST ================= */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-350">
              
              {/* Brief Guidelines */}
              <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-indigo-800">
                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-indigo-900">ขั้นตอนที่ 1: เลือกห้องพักก่อนการกำหนดคนเข้าพัก</p>
                  <p className="text-slate-500 mt-1">
                    กรุณาคลิกเลือกห้องพักที่ต้องการจากรายการด้านล่าง เพื่อเข้าสู่ขั้นตอนการระบุพนักงานลงในห้องนั้นๆ ระบบจะคัดกรองเพศและเงื่อนไขแบบเรียลไทม์
                  </p>
                </div>
              </div>

              {selectedRoomNumber && selectedRoom && (
                <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-md border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-display font-black text-xs text-white">
                      🏨
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ห้องพักที่เลือกไว้</p>
                      <p className="text-xs font-bold font-display">{selectedRoom.roomType}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoomNumber('');
                      setSelectedMainEmpId('');
                      setSelectedRoommateIds([]);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-3xs"
                  >
                    ยกเลิกการเลือกห้องพักนี้
                  </button>
                </div>
              )}

              {/* No search bar needed here, room filter is below */}

              {/* Room Filtering Tabs & Controls */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 grid md:grid-cols-2 gap-3 items-center">
                
                {/* Filter 1: Room Type */}
                <div className="overflow-hidden">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                    ประเภทห้องพัก (Room Comfort Level)
                  </label>
                  <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                      onClick={() => setRoomFilterType('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        roomFilterType === 'all'
                          ? 'bg-slate-800 text-white shadow-3xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    {roomTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => setRoomFilterType(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          roomFilterType === t
                            ? 'bg-slate-800 text-white shadow-3xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 2: Room restriction / availability */}
                <div className="overflow-hidden">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                    สถานะและข้อจำกัดเพศ (Gender Filter)
                  </label>
                  <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                      { id: 'all', label: 'ห้องทั้งหมด' },
                      { id: 'available', label: 'เฉพาะห้องไม่เต็ม' },
                      { id: 'male', label: '🔵 เฉพาะชายล้วน' },
                      { id: 'female', label: '🔴 เฉพาะหญิงล้วน' },
                      { id: 'mixed', label: '⚪ ไม่จำกัดเพศ' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setRoomFilterGender(opt.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          roomFilterGender === opt.id
                            ? 'bg-indigo-600 text-white shadow-3xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Rooms Grid for Selection */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3" id="rooms-grid-wizard">
                {rooms.length === 0 ? (
                  <div className="col-span-full">
                    {onUpdateRooms && userRole === 'admin' ? (
                      <button
                        onClick={() => setIsAddingRoom(true)}
                        className="w-full flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-indigo-50 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-3xl transition-all cursor-pointer min-h-[160px] text-slate-500 hover:text-indigo-600 group"
                      >
                        <div className="w-14 h-14 rounded-full bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-100 flex items-center justify-center mb-3 shadow-sm transition-colors">
                          <Building2 className="w-7 h-7" />
                        </div>
                        <span className="text-sm font-bold font-display uppercase tracking-wide">สร้างห้องพักใหม่</span>
                        <span className="text-[11px] text-slate-400 mt-1">ยังไม่มีห้องพักในระบบ คลิกเพื่อสร้างห้องพักแรก</span>
                      </button>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl py-12 text-center">
                        <Bed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">ยังไม่มีห้องพักในระบบ</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Create Room Card (Always visible if onUpdateRooms is present) */}
                    {onUpdateRooms && userRole === 'admin' && (
                      <button
                        onClick={() => setIsAddingRoom(true)}
                        className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-indigo-50 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-3xl transition-all cursor-pointer h-full min-h-[120px] text-slate-500 hover:text-indigo-600 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-100 flex items-center justify-center mb-2 shadow-3xs transition-colors">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold font-display uppercase tracking-wide">สร้างห้องพักใหม่</span>
                      </button>
                    )}

                    {filteredRoomsForWizard.length === 0 ? (
                      <div className="col-span-full sm:col-span-2 lg:col-span-3 bg-slate-50 border border-dashed border-slate-200 rounded-3xl py-12 text-center">
                        <Bed className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                        <p className="text-xs font-bold text-slate-500">ไม่พบห้องพักตามเงื่อนไขที่ระบุ</p>
                        <p className="text-[11px] text-slate-400 mt-1">โปรดลองปรับตัวกรองประเภทหรือเงื่อนไขเพศด้านบน</p>
                      </div>
                    ) : (
                      filteredRoomsForWizard.map((room) => {
                    const occupants = roomOccupantsMap[room.id] || [];
                    const occupiedCount = occupants.length;
                    const isFull = occupiedCount >= Number(room.capacity);
                    const isSelected = selectedRoomNumber === room.id;
                    const isEmpty = occupiedCount === 0;

                    let genderTheme = {
                      badge: 'bg-slate-100 text-slate-600 border-slate-200',
                      stripe: 'bg-slate-300',
                      border: 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs',
                      selectedBorder: 'border-slate-700 ring-2 ring-slate-100 bg-slate-50/10'
                    };
                    
                    if (room.genderRestriction === 'ชายล้วน') {
                      genderTheme = {
                        badge: 'bg-blue-50 text-blue-700 border border-blue-100',
                        stripe: 'bg-gradient-to-r from-blue-400 to-cyan-400',
                        border: isSelected 
                          ? 'border-blue-600 ring-3 ring-blue-50 bg-blue-50/5 shadow-xs' 
                          : 'border-blue-100 hover:border-blue-300 hover:shadow-xs hover:bg-slate-50/30',
                        selectedBorder: 'border-blue-600'
                      };
                    } else if (room.genderRestriction === 'หญิงล้วน') {
                      genderTheme = {
                        badge: 'bg-rose-50 text-rose-700 border border-rose-100',
                        stripe: 'bg-gradient-to-r from-rose-400 to-pink-400',
                        border: isSelected 
                          ? 'border-rose-600 ring-3 ring-rose-50 bg-rose-50/5 shadow-xs' 
                          : 'border-rose-100 hover:border-rose-300 hover:shadow-xs hover:bg-slate-50/30',
                        selectedBorder: 'border-rose-600'
                      };
                    } else {
                      genderTheme = {
                        badge: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
                        stripe: 'bg-gradient-to-r from-indigo-500 to-purple-500',
                        border: isSelected 
                          ? 'border-indigo-600 ring-3 ring-indigo-50 bg-indigo-50/5 shadow-xs' 
                          : 'border-slate-200 hover:border-indigo-300 hover:shadow-xs hover:bg-slate-50/30',
                        selectedBorder: 'border-indigo-600'
                      };
                    }

                    if (isFull) {
                      genderTheme.border = 'border-slate-200 bg-slate-100 cursor-not-allowed';
                    }

                    return (
                      <div
                        key={room.id}
                        onClick={() => {
                          if (!isFull && !isSelected) handleSelectRoom(room.id);
                        }}
                        className={`rounded-2xl border flex flex-col justify-between transition-all duration-250 relative overflow-hidden ${
                          genderTheme.border
                        } ${isSelected ? 'scale-[1.02] shadow-sm ring-2 ring-indigo-500 ring-offset-2' : ''} ${!isFull ? 'bg-white hover:shadow-xs cursor-pointer' : 'opacity-90'}`}
                      >
                        {/* Sold Out Overlay */}
                        {isFull && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/50 backdrop-blur-[2px]">
                            <div className="relative animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                              <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-400 to-indigo-500 rounded-2xl blur opacity-40"></div>
                              <div className="relative bg-white border border-slate-100 px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                </span>
                                <span className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.15em] bg-gradient-to-r from-rose-600 to-indigo-600 bg-clip-text text-transparent">
                                  ห้องเต็มแล้ว / Sold Out
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Top Accent Stripe */}
                        <div className={`h-1.5 w-full ${isFull ? 'bg-slate-300' : genderTheme.stripe}`} />

                        <div className="p-3 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            {/* Card Header Status */}
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono text-slate-400">
                                ห้องพัก
                              </span>
                              
                              <div className="flex items-center gap-1.5">
                                {occupiedCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingOccupantsRoomId(room.id);
                                    }}
                                    className="relative z-20 text-[9px] font-bold text-white flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-2 py-0.5 rounded-full transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 animate-in fade-in zoom-in duration-300"
                                  >
                                    <Users className="w-2.5 h-2.5" />
                                    ดูรายชื่อ
                                  </button>
                                )}
                                {isEmpty ? (
                                  <span className="inline-flex items-center text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-extrabold border border-emerald-100">
                                    ว่างทั้งห้อง
                                  </span>
                                ) : isFull ? null : (
                                  <span className="inline-flex items-center text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-extrabold border border-amber-100">
                                    ว่าง {Number(room.capacity) - occupiedCount} เตียง
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Room Info */}
                            <div className="flex items-center gap-2">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-xs shrink-0 shadow-3xs ${
                                isFull ? 'bg-white border border-slate-200 text-slate-400' : 'bg-slate-800 text-white'
                              } ${isSelected ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}>
                                🏨
                              </span>
                              <div className="truncate">
                                {(() => {
                                  const displaySeq = room.sequence !== undefined ? room.sequence : (rooms.findIndex(r => r.id === room.id) + 1);
                                  return (
                                    <>
                                      <h3 className={`text-xs font-extrabold truncate leading-none mb-1 text-slate-800`}>
                                        ห้องที่ {displaySeq}
                                      </h3>
                                      {room.roomName ? (
                                        <p className={`text-[10px] font-bold truncate leading-normal ${isFull ? 'text-slate-500' : 'text-indigo-600'}`} title={room.roomName}>
                                          {room.roomName}
                                        </p>
                                      ) : (
                                        <p className="text-[9px] truncate leading-normal text-slate-400" title={room.notes}>{room.notes || room.roomType}</p>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Bed layout Visualizer (Compact & Premium) */}
                          <div className="pt-2.5 border-t border-slate-100 space-y-2">
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                                ความจุห้อง ({occupiedCount}/{Number(room.capacity)})
                              </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full relative mb-2">
                              <div 
                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isFull ? 'bg-rose-500' : occupiedCount > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                style={{ width: `${Math.min(100, Math.round((occupiedCount / Number(room.capacity)) * 100))}%` }}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 mt-1">
                              {Array.from({ length: Number(room.capacity) }).map((_, idx) => {
                                const isSlotOccupied = idx < occupiedCount;
                                const occ = isSlotOccupied ? occupants[idx] : null;

                                return (
                                  <div
                                    key={idx}
                                    className={`px-1.5 py-1 rounded-md border text-[9px] flex items-center gap-1 truncate ${
                                      isSlotOccupied
                                        ? occ?.gender === 'หญิง'
                                          ? 'bg-rose-50/50 border-rose-100 text-rose-700 font-bold'
                                          : 'bg-blue-50/50 border-blue-100 text-blue-700 font-bold'
                                        : 'bg-slate-50 border-slate-100 text-slate-400'
                                    }`}
                                    title={isSlotOccupied ? `${occ?.name} (${occ?.gender})` : 'เตียงว่าง'}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      isSlotOccupied
                                        ? occ?.gender === 'หญิง' ? 'bg-rose-500' : 'bg-blue-500'
                                        : 'bg-slate-300'
                                    }`} />
                                    <span className="truncate">
                                      {isSlotOccupied ? occ?.name : 'เตียงว่าง'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Card Footer badges */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isFull ? 'bg-slate-100 text-slate-400' : genderTheme.badge}`}>
                              {room.genderRestriction}
                            </span>
                            
                            {isSelected ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card onClick trigger
                                  setSelectedRoomNumber('');
                                  setSelectedMainEmpId('');
                                  setSelectedRoommateIds([]);
                                }}
                                className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold py-1 px-2 rounded-lg transition-all cursor-pointer shadow-3xs"
                              >
                                ยกเลิกการเลือก
                              </button>
                            ) : isFull ? (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                                เต็มเเล้ว
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded-lg transition-all">
                                เลือกห้องนี้
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
                </>
              )}
              </div>

            </div>
          )}

          {/* ================= STEP 2: SELECT PEOPLE (MAIN + ROOMMATES) ================= */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-350">
              
              {/* Selected Room Banner */}
              {selectedRoom && (
                <div className="bg-slate-800 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-display text-lg font-extrabold text-white">
                      🏨
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">ห้องพักที่คุณเลือก</p>
                      <h3 className="text-base font-extrabold font-display leading-tight">{selectedRoom.roomType}</h3>
                      <p className="text-xs text-slate-200 mt-0.5">
                        จุได้: <span className="font-bold">{Number(selectedRoom.capacity)} ท่าน</span> • ข้อจำกัดเพศ: <span className="font-bold">{selectedRoom.genderRestriction}</span>
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoomNumber('');
                      setSelectedMainEmpId('');
                      setSelectedRoommateIds([]);
                      setActiveStep(1);
                    }}
                    className="shrink-0 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>เปลี่ยนห้องพัก</span>
                  </button>
                </div>
              )}

              {/* Grid: Main Booker Selection and Roommate Selection */}
              {selectedRoom && currentRoomOccupants.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      รายชื่อผู้ที่อยู่ในห้องพักนี้แล้ว ({currentRoomOccupants.length} ท่าน)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      มีที่ว่างอีก {Number(selectedRoom.capacity) - currentRoomOccupants.length} ที่
                    </span>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {currentRoomOccupants.map(emp => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${emp.gender === 'หญิง' ? 'bg-rose-400' : 'bg-blue-400'}`} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 truncate">{emp.name}</p>
                          <p className="text-[8px] text-slate-400 truncate">{emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Main Booker Selection (Left) */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      1. เลือกพนักงานที่จะเพิ่มเข้าห้องพัก
                    </span>
                    {selectedMainEmpId && (
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold">
                        เลือกแล้ว
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    {/* Search inside Step 2 */}
                    {currentRoomOccupants.length === 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้จองหลัก..."
                            value={bookingSearchQuery}
                            onChange={(e) => setBookingSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={bookingMainEmpGenderFilter}
                            onChange={(e) => setBookingMainEmpGenderFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-600"
                          >
                            <option value="all">ทุกเพศ (All)</option>
                            <option value="ชาย">ชาย (Male)</option>
                            <option value="หญิง">หญิง (Female)</option>
                          </select>
                          <select
                            value={bookingMainEmpDeptFilter}
                            onChange={(e) => setBookingMainEmpDeptFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-600 truncate"
                          >
                            <option value="all">ทุกแผนก (Dept)</option>
                            {departments.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="max-h-80 overflow-y-auto space-y-1.5 divide-y divide-slate-100/50">
                      {currentRoomOccupants.length > 0 ? (
                        /* Special mode: Adding to existing room */
                        <div className="p-1 animate-in fade-in slide-in-from-bottom-2 duration-400">
                           <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 text-center">
                             <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl shadow-xs flex items-center justify-center mx-auto mb-3 border border-indigo-50">
                               <Users className="w-6 h-6" />
                             </div>
                             <p className="text-xs font-bold text-slate-800">กำลังจัดสรรพนักงานเพิ่มเข้าห้องเดิม</p>
                             <p className="text-[10px] text-slate-400 mt-1 mb-5">ระบบใช้พนักงานท่านแรกในห้องเป็นตัวแทนกลุ่ม:</p>
                             
                             <div className="bg-white border border-indigo-100/60 rounded-xl p-3.5 flex items-center gap-3 text-left shadow-xs">
                               <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentRoomOccupants[0].gender === 'หญิง' ? 'bg-rose-400 ring-4 ring-rose-50' : 'bg-blue-400 ring-4 ring-blue-50'}`} />
                               <div className="min-w-0 flex-1">
                                 <p className="text-xs font-bold text-slate-800 truncate">{currentRoomOccupants[0].name}</p>
                                 <div className="flex items-center gap-1.5 mt-0.5">
                                   <p className="text-[9px] text-slate-400 font-medium truncate">{currentRoomOccupants[0].department}</p>
                                   <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">เดิม</span>
                                 </div>
                               </div>
                               <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg border border-indigo-100/40">
                                 <CheckCircle2 className="w-3.5 h-3.5" />
                               </div>
                             </div>
                           </div>
                           <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-4 flex items-start gap-2.5">
                             <HelpCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                             <p className="text-[10px] text-amber-700 leading-relaxed">
                               พนักงานท่านนี้และเพื่อนร่วมห้องเดิมจะยังคงอยู่ในห้องนี้ตามปกติ คุณเพียงเลือกพนักงานท่านใหม่จาก <span className="font-bold underline">ส่วนที่ 2</span> เพื่อเพิ่มเข้าไป
                             </p>
                           </div>
                        </div>
                      ) : filteredMainEmployees.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 italic">
                          ไม่พบพนักงานในแผนกหรือชื่อนี้ที่ยังไม่ได้จอง
                        </div>
                      ) : (
                        filteredMainEmployees.map((emp) => {
                          const isSelected = selectedMainEmpId === emp.id;
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => {
                                setSelectedMainEmpId(emp.id);
                                // Reset roommates if gender restrictions apply or clean slate
                                setSelectedRoommateIds([]);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-50/50 border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                              }`}
                            >
                              <div>
                                <p className={isSelected ? "text-white" : "font-bold text-slate-800"}>{emp.name}</p>
                                <p className={`text-[10px] mt-0.5 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                  {emp.department} • รหัส: {emp.id}
                                </p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : emp.gender === 'หญิง' ? 'bg-rose-50 text-rose-600 border border-rose-100/40' : 'bg-blue-50 text-blue-600 border border-blue-100/40'
                              }`}>
                                {emp.gender}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Roommates Selection (Right) */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white flex flex-col justify-between">
                  <div>
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        2. เลือกเพื่อนร่วมห้องเพิ่มเติม (ถ้ามี / Roommates Option)
                      </span>
                      {selectedRoom && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                          เลือกแล้ว {selectedRoommateIds.length} / {Math.max(0, Number(selectedRoom.capacity) - currentRoomOccupants.length - (isMainEmpNew ? 1 : 0))} คน
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      {!selectedMainEmpId ? (
                        <div className="py-12 text-center text-xs text-slate-400 italic">
                          กรุณาเลือกผู้เข้าพักท่านแรก ในฝั่งซ้ายก่อน
                        </div>
                      ) : selectedRoom && (Number(selectedRoom.capacity) - currentRoomOccupants.length - (isMainEmpNew ? 1 : 0)) <= 0 ? (
                        <div className="py-10 px-6 text-center text-xs bg-indigo-50/50 rounded-xl m-2 border border-indigo-100/50 flex flex-col items-center justify-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 mb-1.5 text-sm">พร้อมยืนยันการลงห้องพัก</p>
                            <p className="text-slate-500 leading-relaxed">
                              {isMainEmpNew ? (
                                <>
                                  ห้องพักนี้มีที่ว่าง <span className="font-bold text-indigo-600">1 ที่</span> ซึ่งพอดีกับ <span className="font-bold text-slate-700">{employees.find(e => e.id === selectedMainEmpId)?.name}</span> ที่คุณเลือกไว้ฝั่งซ้ายแล้ว
                                </>
                              ) : (
                                <>
                                  ห้องพักนี้ <span className="font-bold text-indigo-600">เต็มแล้ว</span> และคุณได้เลือก <span className="font-bold text-slate-700">{employees.find(e => e.id === selectedMainEmpId)?.name}</span> ซึ่งเป็นผู้เข้าพักเดิมเป็นตัวแทนเรียบร้อย
                                </>
                              )}
                              <br/><br/>
                              ไม่มีที่ว่างเหลือสำหรับเพื่อนร่วมห้องเพิ่มเติม กรุณากดปุ่ม <b className="text-white font-bold px-2 py-1 bg-indigo-600 rounded">เลือกคนลงห้อง</b> ด้านล่างเพื่อยืนยันการเข้าพักได้เลยครับ
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="ค้นหาเพื่อนร่วมห้อง..."
                                value={roommateSearchQuery}
                                onChange={(e) => setRoommateSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <select
                                value={bookingRoommateDeptFilter}
                                onChange={(e) => setBookingRoommateDeptFilter(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-[10px] py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-600 truncate"
                              >
                                <option value="all">กรองตามฝ่ายเพื่อนร่วมห้อง (ทั้งหมด)</option>
                                {departments.map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 border border-slate-100 p-2 rounded-xl bg-slate-50/30">
                            {candidateRoommates.length === 0 ? (
                              <p className="text-center text-xs text-slate-400 py-6 italic">ไม่พบพนักงานร่วมทริปที่ยังไม่มีห้องพักตรงเงื่อนไข</p>
                            ) : (
                              <div className="grid gap-1.5">
                                {candidateRoommates.filter(e => e.id !== selectedMainEmpId).map(e => {
                                  const isChecked = selectedRoommateIds.includes(e.id);
                                  const isSameDept = selectedMainEmp && e.department === selectedMainEmp.department;
                                  return (
                                    <button
                                      key={e.id}
                                      type="button"
                                      onClick={() => toggleRoommateSelection(e.id)}
                                      className={`w-full text-left p-2 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                                        isChecked
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                          : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      <div className="truncate pr-2">
                                        <div className="flex items-center gap-1.5">
                                          <p className="truncate text-slate-800 font-bold">{e.name}</p>
                                          {isSameDept && (
                                            <span className="shrink-0 text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 py-0.1 rounded font-bold">
                                              ฝ่ายเดียวกัน
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{e.department} • รหัส: {e.id}</p>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-[9px] px-1.5 rounded font-bold ${
                                          e.gender === 'หญิง' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                                        }`}>
                                          {e.gender}
                                        </span>
                                        {isChecked ? (
                                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                        ) : (
                                          <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0 bg-white" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Navigation Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoomNumber('');
                    setSelectedMainEmpId('');
                    setSelectedRoommateIds([]);
                    setActiveStep(1);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับไปเลือกห้องพักใหม่</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedMainEmpId}
                  onClick={() => setActiveStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>ขั้นตอนถัดไป (ตรวจสอบเงื่อนไข & ยืนยัน)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ================= STEP 3: ROOMMATES & CONFIRM ================= */}
          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-350">
              
              {isCheckingRealtime ? (
                /* Dynamic Real-time Check Console Overlay */
                <div className="border border-indigo-100 rounded-3xl p-6 sm:p-10 bg-indigo-50/40 text-center space-y-6 max-w-lg mx-auto shadow-sm animate-pulse">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
                    <div className="absolute inset-0 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-pulse pointer-events-none" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-slate-800 font-display">ระบบกำลังประมวลผลเช็ค Real-time ป้องกันการจองซ้ำ...</h3>
                    <p className="text-[11px] text-slate-500">กรุณาถือสายรอสักครู่ ระบบกำลังสื่อสารกับฐานข้อมูลระบบคลาวด์แบบเรียลไทม์เพื่อล็อกสิทธิ์ห้องพัก</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-indigo-100 p-4 text-left space-y-3.5 shadow-2xs font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">1. การจองเตียงซ้อน (Concurrency Lock):</span>
                      <span className={`font-bold ${realtimeCheckStep > 1 ? 'text-emerald-600' : 'text-indigo-600 animate-pulse'}`}>
                        {realtimeCheckStep > 1 ? '🟢 สำเร็จ (ไม่มีจองซ้ำ)' : '⏳ กำลังตรวจสอบสิทธิ์...'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">2. การเข้าพักคละเพศ (Gender Violation Check):</span>
                      <span className={`font-bold ${realtimeCheckStep > 2 ? 'text-emerald-600' : realtimeCheckStep === 2 ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`}>
                        {realtimeCheckStep > 2 ? '🟢 ตรวจผ่านเรียบร้อย' : realtimeCheckStep === 2 ? '⏳ ตรวจสอบข้อจำกัด...' : '⏳ รอคิว'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">3. อัปเดตผังโรงแรม (Interactive Map Sync):</span>
                      <span className={`font-bold ${realtimeCheckStep > 3 ? 'text-emerald-600' : realtimeCheckStep === 3 ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`}>
                        {realtimeCheckStep > 3 ? '🟢 ซิงค์เรียบร้อย' : realtimeCheckStep === 3 ? '⏳ ซิงค์ข้อมูล...' : '⏳ รอคิว'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="font-sans font-bold text-slate-700">สถานะบันทึก (Cloud Writeback):</span>
                      <span className={`font-bold ${realtimeCheckStep === 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {realtimeCheckStep === 4 ? '🟢 กำลังเขียนสิทธิ์ธุรกรรม...' : '⏳ รอส่งคำสั่ง'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal Step 3 Review UI */
                <>
                  {/* Summary of Chosen Items */}
                  <div className="grid md:grid-cols-2 gap-4">
                    
                    {/* Selected Employee card */}
                    {selectedMainEmp && (
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">ผู้จองหลัก (Main Booker)</p>
                          <h4 className="text-xs font-bold text-indigo-900 mt-0.5">{selectedMainEmp.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            ฝ่าย: {selectedMainEmp.department} • เพศ: {selectedMainEmp.gender} • รหัส: <span className="font-mono">{selectedMainEmp.id}</span>
                          </p>
                          <button
                            onClick={() => setActiveStep(2)}
                            className="text-[10px] text-indigo-600 hover:underline font-bold mt-2 flex items-center gap-1"
                          >
                            เปลี่ยนคน ➔
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Selected Room card */}
                    {selectedRoom && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-display font-extrabold text-sm shrink-0">
                          🏨
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ห้องพักที่เลือก (Selected Room)</p>
                          <h4 className="text-xs font-bold text-slate-800 mt-0.5">{selectedRoom.roomType}</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            ข้อจำกัด: <b className="text-indigo-600">{selectedRoom.genderRestriction}</b> • จุได้สูงสุด: {Number(selectedRoom.capacity)} ท่าน
                          </p>
                          <button
                            onClick={() => setActiveStep(2)}
                            className="text-[10px] text-indigo-600 hover:underline font-bold mt-2 flex items-center gap-1"
                          >
                            เปลี่ยนห้อง ➔
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Roommates Checklist summary */}
                  {selectedRoommateIds.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span>เพื่อนร่วมห้องที่คุณเลือกจัดเข้าพักในห้องนี้ด้วยกัน ({selectedRoommateIds.length} ท่าน):</span>
                      </h3>
                      
                      <div className="grid sm:grid-cols-2 gap-2">
                        {selectedRoommateIds.map(id => {
                          const emp = employees.find(e => e.id === id);
                          if (!emp) return null;
                          return (
                            <div key={id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-slate-800">{emp.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{emp.department} • รหัส: {emp.id}</p>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                emp.gender === 'หญิง' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {emp.gender}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentRoomOccupants.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>ผู้ที่อยู่ในห้องนี้อยู่แล้ว ({currentRoomOccupants.length} ท่าน):</span>
                      </h3>
                      
                      <div className="grid sm:grid-cols-2 gap-2">
                        {currentRoomOccupants.map(emp => (
                          <div key={emp.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs opacity-70">
                            <div>
                              <p className="font-bold text-slate-800">{emp.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{emp.department} • รหัส: {emp.id}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              emp.gender === 'หญิง' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {emp.gender}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validation Constraints & Warnings */}
                  {validation.reason && (
                    <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
                      validation.needsConsent ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                      <div className="space-y-1">
                        <p className="font-bold">ตรวจสอบข้อกำหนดการเข้าพัก</p>
                        <p className="text-slate-600 leading-relaxed text-[11px]">{validation.reason}</p>

                        {validation.needsConsent && (
                          <label className="flex items-center gap-2 mt-3 font-bold cursor-pointer select-none bg-white/60 p-2 rounded-lg border border-amber-200/50 self-start">
                            <input
                              type="checkbox"
                              checked={mixedGenderConsent}
                              onChange={(e) => setMixedGenderConsent(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="text-[11px] text-amber-900">ฉันเข้าใจและพนักงานทุกคนยินยอมที่จะเข้าพักแบบคละเพศแล้ว</span>
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step Navigation & Submission CTAs */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ย้อนกลับไปแก้ไขผู้พักร่วม</span>
                    </button>

                    <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch gap-2">
                      <button
                        onClick={handleBookingSubmit}
                        disabled={!validation.isValid || submitting || syncing || userRole === 'visitor'}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {userRole === 'visitor' 
                            ? 'ไม่สามารถจองได้ (โหมดอ่านอย่างเดียว)' 
                            : submitting 
                              ? 'กำลังจัดสรร...' 
                              : 'ยืนยันจองห้องพักทันที'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

        </div>
      </div>


      {/* Create New Room Modal */}
      {isAddingRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-extrabold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                สร้างห้องพักใหม่
              </h3>
              <button
                onClick={() => setIsAddingRoom(false)}
                disabled={submitting}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ลำดับห้อง (เช่น 1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    value={newRoomSequence !== undefined ? newRoomSequence : ''}
                    onChange={(e) => setNewRoomSequence(e.target.value ? Number(e.target.value) : undefined)}
                    min={1}
                    disabled={submitting}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="เรียงอัตโนมัติ"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชั้นที่ (เช่น 1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value ? Number(e.target.value) : 1)}
                    min={1}
                    disabled={submitting}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="ชั้น 1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อห้องพัก / รายละเอียดสถานที่
                </label>
                <textarea
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  disabled={submitting}
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none"
                  placeholder="เช่น โซนรีสอร์ท บ้านริมธาร 881 เตียง 6 ฟุต 1 เตียง"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ประเภทห้องพัก
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setNewRoomType(type);
                    if (type === 'Family Suite') setNewRoomCapacity(4);
                    else setNewRoomCapacity(2);
                  }}
                  disabled={submitting}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="Standard Twin">Standard Twin</option>
                  <option value="Deluxe King">Deluxe King</option>
                  <option value="Deluxe Twin">Deluxe Twin</option>
                  <option value="Executive Suite">Executive Suite</option>
                  <option value="Family Suite">Family Suite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  จำนวนคนเข้าพักต่อห้อง
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[1, 2, 4, 10].map(cap => (
                    <button
                      key={cap}
                      onClick={() => setNewRoomCapacity(cap)}
                      disabled={submitting}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-50 ${
                        newRoomCapacity === cap
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {cap} คน/ห้อง
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">หรือระบุจำนวนเอง:</span>
                  <input
                    type="number"
                    min="1"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(parseInt(e.target.value, 10) || 1)}
                    disabled={submitting}
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ข้อจำกัดเพศ
                </label>
                <select
                  value={newRoomGender}
                  onChange={(e) => setNewRoomGender(e.target.value)}
                  disabled={submitting}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="ไม่จำกัด">ไม่จำกัดเพศ</option>
                  <option value="ชายล้วน">ชายล้วน</option>
                  <option value="หญิงล้วน">หญิงล้วน</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsAddingRoom(false)}
                disabled={submitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    ยืนยันการสร้างห้อง
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Occupants View Modal */}
      {viewingOccupantsRoomId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setViewingOccupantsRoomId(null)}>
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-800">
                  รายชื่อผู้เข้าพัก
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  อ้างอิงจากผู้ที่จองแล้วในระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingOccupantsRoomId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto pr-1">
              {(() => {
                const occupants = roomOccupantsMap[viewingOccupantsRoomId] || [];
                const room = rooms.find(r => r.id === viewingOccupantsRoomId);
                
                if (occupants.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-400 italic text-xs">
                      ยังไม่มีผู้เข้าพักในห้องนี้
                    </div>
                  );
                }
                
                return (
                  <>
                    {occupants.map((occ, idx) => (
                      <div key={occ.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${occ.gender === 'หญิง' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                            {occ.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{occ.name}</p>
                            <p className="text-[10px] text-slate-500">{occ.department} • {occ.id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {room && occupants.length < Number(room.capacity) && (
                      <div className="text-center py-3 text-[10px] text-indigo-500 font-bold bg-indigo-50/50 rounded-xl border border-indigo-100 border-dashed">
                        ว่างอีก {Number(room.capacity) - occupants.length} ที่
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingOccupantsRoomId(null)}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
