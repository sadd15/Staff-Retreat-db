import React, { useState, useMemo, useEffect } from 'react';
import { storage, updateMapImageUrlInFirestore, updateRoomPositionInFirestore, db } from '../lib/firebaseService';
import { collection, setDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Employee, Room, SheetConfig } from '../types';
import ResortMap from './ResortMap';
import {
  Grid,
  Users,
  TrendingUp,
  Bed,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  UserX,
  Sparkles,
  DollarSign,
  Lock,
  Unlock,
  Search,
  QrCode,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  Copy,
  X,
  Hotel,
  Settings,
  Database,
  Upload
} from 'lucide-react';
import { motion } from 'motion/react';
import { toBlob, toPng } from 'html-to-image';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer
} from 'recharts';

interface AdminDashboardProps {
  employees: Employee[];
  rooms: Room[];
  sheetConfig: SheetConfig | null;
  accessToken: string | null;
  onRefreshAll: () => Promise<void>;
  onUpdateRooms: (updatedRooms: Room[]) => Promise<void>;
  onUpdateEmployees: (updatedEmployees: Employee[]) => Promise<void>;
  onResetAllBookings: () => Promise<void>;
  onCancelBooking: (empId: string) => Promise<void>;
  onSyncSheet: (url: string) => Promise<void>;
  onCleanSyncSheet?: (url: string) => Promise<void>;
  onSyncToSheet: () => Promise<void>;
  onClearSheetConfig: () => Promise<void>;
  onChangePin: () => void;
  rsvpClosed: boolean;
  onToggleRSVPClosed: (closed: boolean) => Promise<void>;
  isOfflineMode?: boolean;
  onWipeAllEmployees?: () => Promise<void>;
  setActiveTab: (tab: 'rsvp' | 'booking' | 'directory' | 'summary' | 'admin') => void;
  setBookingSelectedRoomId: (roomId: string) => void;
}

export default function AdminDashboard({
  employees,
  rooms,
  sheetConfig,
  accessToken,
  onRefreshAll,
  onUpdateRooms,
  onUpdateEmployees,
  onResetAllBookings,
  onCancelBooking,
  onSyncSheet,
  onCleanSyncSheet,
  onSyncToSheet,
  onClearSheetConfig,
  onChangePin,
  rsvpClosed,
  onToggleRSVPClosed,
  isOfflineMode = false,
  onWipeAllEmployees,
  setActiveTab,
  setBookingSelectedRoomId,
}: AdminDashboardProps) {
  const handleUpdateRoom = async (updatedRoom: Room) => {
    // For map position updates, we only update the specific field in Firestore
    // We do NOT call onUpdateRooms here because that overwrites the entire collection
    // with potentially stale local state during rapid drag-and-drops.
    if (updatedRoom.mapPosition || updatedRoom.mapPositionZone1 || updatedRoom.mapPositionZone2) {
      try {
        await updateRoomPositionInFirestore(updatedRoom.id, updatedRoom.mapPosition, updatedRoom.mapPositionZone1, updatedRoom.mapPositionZone2);
      } catch (err) {
        console.error("Failed to save room position directly:", err);
      }
    }
  };
  const [activeSubTab, setActiveSubTab] = useState<'layout' | 'settings' | 'map'>('layout');
  const [resetting, setResetting] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [editingMapZone, setEditingMapZone] = useState<'main' | 'zone1' | 'zone2'>('main');
  const [mapUrlInput, setMapUrlInput] = useState('');

  useEffect(() => {
    if (editingMapZone === 'main') {
      setMapUrlInput(sheetConfig?.mapImageUrl || '');
    } else if (editingMapZone === 'zone1') {
      setMapUrlInput(sheetConfig?.mapImageUrlZone1 || '');
    } else if (editingMapZone === 'zone2') {
      setMapUrlInput(sheetConfig?.mapImageUrlZone2 || '');
    }
  }, [editingMapZone, sheetConfig?.mapImageUrl, sheetConfig?.mapImageUrlZone1, sheetConfig?.mapImageUrlZone2]);

  const handleMapUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingMap(true);
    try {
      const field = editingMapZone === 'main' ? 'mapImageUrl' : editingMapZone === 'zone1' ? 'mapImageUrlZone1' : 'mapImageUrlZone2';
      const fileName = editingMapZone === 'main' ? 'resort-map.jpg' : editingMapZone === 'zone1' ? 'resort-map-zone1.jpg' : 'resort-map-zone2.jpg';
      const mapRef = ref(storage, fileName);
      await uploadBytes(mapRef, file);
      const url = await getDownloadURL(mapRef);
      await updateMapImageUrlInFirestore(url, field);
      alert('อัปโหลดแผนที่สำเร็จ');
    } catch (error: any) {
      console.error(error);
      alert(`อัปโหลดผังรีสอร์ตล้มเหลว: ${error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`);
    } finally {
      setUploadingMap(false);
    }
  };

  const handleSaveMapUrl = async () => {
    try {
      const field = editingMapZone === 'main' ? 'mapImageUrl' : editingMapZone === 'zone1' ? 'mapImageUrlZone1' : 'mapImageUrlZone2';
      await updateMapImageUrlInFirestore(mapUrlInput, field);
      alert('บันทึก URL แผนที่สำเร็จ');
      console.log('Successfully saved map URL:', mapUrlInput);
    } catch (error: any) {
      console.error('Error saving map URL:', error);
      alert(`บันทึก URL ล้มเหลว: ${error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`);
    }
  };
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  
  const [cancelingEmp, setCancelingEmp] = useState<Employee | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [viewingOccupantsRoomId, setViewingOccupantsRoomId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newSheetUrl, setNewSheetUrl] = useState('');
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isEditingSheetUrl, setIsEditingSheetUrl] = useState(false);
  const [showCleanSyncConfirm, setShowCleanSyncConfirm] = useState(false);
  const [isPerformingCleanSync, setIsPerformingCleanSync] = useState(false);
  const [showWipeEmployeesConfirm, setShowWipeEmployeesConfirm] = useState(false);
  const [isPerformingWipe, setIsPerformingWipe] = useState(false);

  const handleConfirmCancelBooking = async () => {
    if (!cancelingEmp) return;
    setIsCanceling(true);
    try {
      await onCancelBooking(cancelingEmp.id);
      setCancelingEmp(null);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการยกเลิก: ${err.message}`);
    } finally {
      setIsCanceling(false);
    }
  };
  
  // Room Form State
  const [roomType, setRoomType] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [genderRestriction, setGenderRestriction] = useState<'ชายล้วน' | 'หญิงล้วน' | 'ไม่จำกัด'>('ไม่จำกัด');
  const [pricePerNight, setPricePerNight] = useState<number | undefined>(2000);
  const [floor, setFloor] = useState(1);
  const [notes, setNotes] = useState('');
  const [roomName, setRoomName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [roomSequence, setRoomSequence] = useState<number | undefined>(undefined);
  const [newRoomSequence, setNewRoomSequence] = useState<number | undefined>(undefined);
  const [newRoomFloor, setNewRoomFloor] = useState(1);

  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [saveRoomError, setSaveRoomError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomError, setCreateRoomError] = useState<string | null>(null);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const bookedCount = employees.filter(e => e.roomId).length;
    const unbookedCount = totalEmployees - bookedCount;

    const totalRooms = rooms.length;
    
    // Group occupants by room
    const occupantsByRoom: Record<string, Employee[]> = {};
    rooms.forEach(r => { occupantsByRoom[r.id] = []; });
    employees.forEach(e => {
      if (e.roomId && occupantsByRoom[e.roomId]) {
        occupantsByRoom[e.roomId].push(e);
      }
    });

    let totalCost = 0;
    let occupiedRoomsCount = 0;
    let totalCapCount = 0;
    let totalOccupiedBeds = 0;

    rooms.forEach(room => {
      const occs = occupantsByRoom[room.id] || [];
      totalCapCount += room.capacity;
      totalOccupiedBeds += occs.length;
      if (occs.length > 0) {
        occupiedRoomsCount++;
        totalCost += room.pricePerNight || 0; // Cost is per occupied room
      }
    });

    const occupancyRate = totalCapCount > 0 ? Math.round((totalOccupiedBeds / totalCapCount) * 100) : 0;

    // Gender division in booked
    const bookedMale = employees.filter(e => e.roomId && e.gender === 'ชาย').length;
    const bookedFemale = employees.filter(e => e.roomId && e.gender === 'หญิง').length;

    return {
      totalEmployees,
      bookedCount,
      unbookedCount,
      totalRooms,
      occupiedRoomsCount,
      totalCost,
      occupancyRate,
      bookedMale,
      bookedFemale,
      occupantsByRoom,
    };
  }, [employees, rooms]);

  // Filter rooms based on searched employee (matching their name or department)
  const filteredRoomsBySearch = useMemo(() => {
    if (!empSearchQuery) return rooms;
    const q = empSearchQuery.toLowerCase();
    return rooms.filter(room => {
      const occupants = stats.occupantsByRoom[room.id] || [];
      return occupants.some(o => 
        o.name.toLowerCase().includes(q) || 
        o.department.toLowerCase().includes(q)
      );
    });
  }, [rooms, empSearchQuery, stats.occupantsByRoom]);

  // Sort rooms according to the new requested criteria
  const sortedRooms = useMemo(() => {
    const list = empSearchQuery ? filteredRoomsBySearch : rooms;
    return [...list].sort((a, b) => {
      // Parse function to extract houseNumber, sequence, slashNumber, floor
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

      // 5. Fallback: string compare
      return a.id.localeCompare(b.id, 'en', { numeric: true });
    });
  }, [rooms, filteredRoomsBySearch, empSearchQuery]);

  // Extra chart data calculations
  const chartData = useMemo(() => {
    // 1. Bed occupancy
    let totalCap = 0;
    let totalOcc = 0;
    rooms.forEach(r => {
      totalCap += r.capacity;
      const occs = stats.occupantsByRoom[r.id] || [];
      totalOcc += occs.length;
    });
    const emptyBeds = Math.max(0, totalCap - totalOcc);

    const occupancyData = [
      { name: 'เตียงจองแล้ว (Booked)', value: totalOcc, color: '#4f46e5' }, // indigo-600
      { name: 'เตียงว่าง (Available)', value: emptyBeds, color: '#e2e8f0' }, // slate-200
    ];

    // 2. RSVP percentages
    const rsvpGoing = employees.filter(e => e.rsvpStatus === 'ไป').length;
    const rsvpNotGoing = employees.filter(e => e.rsvpStatus === 'ไม่ไป').length;
    const rsvpPending = employees.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length;

    const totalRsvp = employees.length || 1;
    const rsvpData = [
      { name: 'ไปแน่นอน', value: rsvpGoing, percentage: Math.round((rsvpGoing / totalRsvp) * 100), color: '#10b981' }, // emerald-500
      { name: 'ขอสละสิทธิ์', value: rsvpNotGoing, percentage: Math.round((rsvpNotGoing / totalRsvp) * 100), color: '#f43f5e' }, // rose-500
      { name: 'ยังไม่ตอบกลับ', value: rsvpPending, percentage: Math.round((rsvpPending / totalRsvp) * 100), color: '#f59e0b' }, // amber-500
    ];

    return {
      occupancyData,
      rsvpData,
      totalCap,
      totalOcc,
      emptyBeds
    };
  }, [employees, rooms, stats.occupantsByRoom]);

  // Add Room Modal State
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomType, setNewRoomType] = useState('Standard Twin');
  const [newRoomCapacity, setNewRoomCapacity] = useState(2);
  const [newRoomGender, setNewRoomGender] = useState('ไม่จำกัด');

  // Handle Edit Room Modal Trigger
  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setRoomType(room.roomType);
    setCapacity(room.capacity);
    setGenderRestriction(room.genderRestriction);
    setPricePerNight(room.pricePerNight || 0);
    setFloor(room.floor ? Number(room.floor) : 1);
    setNotes(room.notes || '');
    setRoomName(room.roomName || '');
    setRoomSequence(room.sequence !== undefined ? Number(room.sequence) : undefined);
    setSaveRoomError(null);
  };

  const handleCreateRoom = async () => {
    if (isCreatingRoom) return;
    setCreateRoomError(null);

    const timestampStr = Date.now().toString().slice(-4);
    const roomNum = `RM-${timestampStr}`;

    if (rooms.some(r => r.id === roomNum)) {
      setCreateRoomError('ระบบสร้างเลขห้องซ้ำ กรุณาลองใหม่');
      return;
    }

    const maxSequence = rooms.reduce((max, r) => (r.sequence !== undefined && r.sequence > max ? r.sequence : max), 0);
    const calculatedSeq = newRoomSequence !== undefined ? Number(newRoomSequence) : (maxSequence + 1);

    const newRoom: Room = {
      id: roomNum,
      roomType: newRoomType,
      capacity: newRoomCapacity,
      genderRestriction: newRoomGender as any,
      roomName: newRoomName.trim() || '',
      sequence: calculatedSeq,
      floor: newRoomFloor.toString(),
      notes: 'สร้างห้องพักเพิ่มเติมโดยผู้ใช้งาน',
    };

    const updatedRooms = [...rooms, newRoom];
    setIsCreatingRoom(true);
    try {
      await onUpdateRooms(updatedRooms);
      setNewRoomName('');
      setNewRoomSequence(undefined);
      setNewRoomFloor(1);
      setIsAddingRoom(false);
    } catch (err: any) {
      setCreateRoomError(err.message || 'ไม่สามารถเซฟข้อมูลได้');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleSaveRoomChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || isSavingRoom) return;

    setSaveRoomError(null);
    setIsSavingRoom(true);

    const updatedRooms = rooms.map(r => {
      if (r.id === editingRoom.id) {
        return {
          ...r,
          roomType,
          capacity: Number(capacity),
          genderRestriction,
          pricePerNight: Number(pricePerNight),
          floor: floor?.toString() || '1',
          notes,
          roomName: roomName.trim(),
          sequence: roomSequence !== undefined ? Number(roomSequence) : undefined,
        };
      }
      return r;
    });

    try {
      await onUpdateRooms(updatedRooms);
      setEditingRoom(null);
    } catch (err: any) {
      setSaveRoomError(err.message || 'ไม่สามารถเซฟข้อมูลได้');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    const occupants = stats.occupantsByRoom[roomId] || [];
    if (occupants.length > 0) {
      setDeleteError(`ไม่สามารถลบห้อง ${roomId} ได้ เนื่องจากมีพนักงานจองห้องนี้อยู่ (${occupants.length} คน)`);
      return;
    }
    setDeletingRoomId(roomId);
  };

  const confirmDeleteRoom = async () => {
    if (!deletingRoomId) return;
    try {
      const updatedRooms = rooms.filter(r => r.id !== deletingRoomId);
      await onUpdateRooms(updatedRooms);
      setDeletingRoomId(null);
    } catch (err: any) {
      setDeleteError(`เกิดข้อผิดพลาดในการลบห้อง: ${err.message}`);
    }
  };

  // Add a new Room
  const handleAddNewRoom = () => {
    setIsAddingRoom(true);
  };

  // Reset all bookings
  const handleResetBookings = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = async () => {
    setShowResetConfirm(false);
    setResetting(true);
    try {
      await onResetAllBookings();
    } catch (err: any) {
      alert(`ล้างข้อมูลไม่สำเร็จ: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const handleCleanSync = async () => {
    if (!sheetConfig?.spreadsheetId || !onCleanSyncSheet) {
      alert("ไม่พบสเปรดชีตที่เชื่อมต่ออยู่ หรือไม่มีฟังก์ชันเชื่อมต่อระบบ");
      return;
    }
    setShowCleanSyncConfirm(false);
    setIsPerformingCleanSync(true);
    try {
      await onCleanSyncSheet(sheetConfig.spreadsheetId);
    } catch (err: any) {
      alert(`ไม่สามารถล้างฐานข้อมูลและซิงค์ใหม่ได้: ${err.message}`);
    } finally {
      setIsPerformingCleanSync(false);
    }
  };

  const handleWipeEmployees = async () => {
    if (!onWipeAllEmployees) return;
    setShowWipeEmployeesConfirm(false);
    setIsPerformingWipe(true);
    try {
      await onWipeAllEmployees();
      alert('ลบรายชื่อพนักงานและล้างข้อมูลการจองทั้งหมดเสร็จสมบูรณ์แล้ว!');
    } catch (err: any) {
      alert(`ลบข้อมูลไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsPerformingWipe(false);
    }
  };

  const filterExport = (node: HTMLElement | any) => {
    if (node?.classList?.contains('hide-in-export')) return false;
    return true;
  };

  const handleCopySummaryImage = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const blob = await toBlob(element, { backgroundColor: '#ffffff', pixelRatio: 2, filter: filterExport });
      if (!blob) throw new Error('Failed to create blob');
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      alert('คัดลอกรูปภาพลง Clipboard แล้ว! สามารถนำไปวางใน Line ได้เลย');
    } catch (err) {
      console.error('Error generating image', err);
      alert('การคัดลอกรูปล้มเหลว อาจเป็นเพราะ Browser ไม่รองรับ');
    }
  };

  const handleDownloadSummaryImage = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2, filter: filterExport });
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading image', err);
    }
  };

  const handleExportRoomsCsv = () => {
    const rows = [
      ['กลุ่มห้องพัก', 'ประเภทห้อง', 'จำนวนผู้เข้าพัก (คน)', 'รายชื่อผู้เข้าพัก']
    ];

    rooms.forEach(room => {
      const occupants = stats.occupantsByRoom[room.id] || [];
      const occupantsStr = occupants.map(o => `${o.name} (${o.department})`).join(', ');
      rows.push([
        room.id,
        room.roomType,
        `${occupants.length}/${room.capacity}`,
        occupantsStr
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(item => `"${item}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `room_assignments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPendingRoomCsv = () => {
    const rows = [
      ['ลำดับ', 'ชื่อ - สกุล', 'ฝ่าย']
    ];

    employees
      .filter(e => e.rsvpStatus === 'ไป' && !e.roomId)
      .sort((a, b) => a.department.localeCompare(b.department))
      .forEach((emp, index) => {
        rows.push([
          (index + 1).toString(),
          emp.name,
          emp.department
        ]);
      });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(item => `"${item}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pending_rooms_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRsvpCsv = () => {
    const rows = [
      ['ลำดับ', 'ชื่อ - สกุล', 'ฝ่าย', 'สถานะการตอบรับ']
    ];

    employees
      .sort((a, b) => {
        // Sort by RSVP status first, then by department
        const statusOrder = { 'ไป': 1, 'ไม่ไป': 2, 'ยังไม่ระบุ': 3, '': 3 };
        const aStatus = statusOrder[(a.rsvpStatus as keyof typeof statusOrder) || ''] || 4;
        const bStatus = statusOrder[(b.rsvpStatus as keyof typeof statusOrder) || ''] || 4;
        if (aStatus !== bStatus) return aStatus - bStatus;
        return a.department.localeCompare(b.department);
      })
      .forEach((emp, index) => {
        rows.push([
          (index + 1).toString(),
          emp.name,
          emp.department,
          emp.rsvpStatus || 'ยังไม่ระบุ'
        ]);
      });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.map(item => `"${item}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `all_rsvps_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans" id="admin-dashboard">
      
      {/* Top statistics panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6" id="stats-dashboard-grid">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">พนักงานทั้งหมด</p>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none mt-1 font-display">{stats.totalEmployees} คน</h3>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
              จองแล้ว <span className="text-emerald-600 font-bold">{stats.bookedCount}</span> • รอ <span className="text-amber-600 font-bold">{stats.unbookedCount}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50">
            <Bed className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">ห้องพักทั้งหมด</p>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none mt-1 font-display">{stats.totalRooms} ห้อง</h3>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
              มีคนพักแล้ว <span className="text-emerald-600 font-bold">{stats.occupiedRoomsCount}</span> ห้อง
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">เช็คอินหน้างาน</p>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none mt-1 font-display">
              {employees.filter(e => e.checkedIn).length} <span className="text-xs text-slate-400 font-sans font-medium">คน</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
              จากรายชื่อทั้งหมด {employees.length} คน
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/50">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">อัตราเตียงเข้าพัก</p>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none mt-1 font-display">{stats.occupancyRate}%</h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${stats.occupancyRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6" id="admin-charts-section">
        {/* Chart 1: Bed Occupancy */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display">อัตราการจองเตียงพัก (Bed Occupancy Rate)</h3>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">เปรียบเทียบสัดส่วนเตียงที่มีคนเข้าพักเเล้วกับเตียงที่ยังว่างในระบบ</p>
          </div>
          <div className="my-6 flex flex-col items-center justify-center">
            {(() => {
              const total = chartData.totalCap || 1;
              const occ = chartData.totalOcc;
              const percent = Math.round((occ / total) * 100);
              const radius = 50;
              const strokeWidth = 14;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (occ / total) * circumference;

              return (
                <div className="relative flex items-center justify-center w-44 h-44">
                  <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth={strokeWidth}
                    />
                    {/* Foreground Circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#4f46e5"
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-800 tracking-tight font-display">{percent}%</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">ครองเตียง</span>
                  </div>
                </div>
              );
            })()}
            
            {/* Custom Legend */}
            <div className="flex justify-center gap-6 mt-4 text-[11px] font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span>จองแล้ว ({chartData.totalOcc} เตียง)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                <span>ว่าง ({chartData.emptyBeds} เตียง)</span>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-slate-500 font-semibold border-t border-slate-100 pt-3">
            จองแล้ว <span className="text-indigo-600 font-bold">{chartData.totalOcc}</span> / ทั้งหมด <span className="text-slate-700 font-bold">{chartData.totalCap}</span> เตียง (ว่าง {chartData.emptyBeds} เตียง)
          </div>
        </div>

        {/* Chart 2: RSVP Statuses */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display">สัดส่วนการแจ้งความประสงค์ทริป (RSVP Percentages)</h3>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">อัตราส่วนและเปอร์เซ็นต์คำตอบเข้าร่วมทริปของพนักงานทั้งหมด</p>
          </div>
          <div className="my-6 flex flex-col items-center justify-center">
            {(() => {
              const rsvpGoing = employees.filter(e => e.rsvpStatus === 'ไป').length;
              const rsvpNotGoing = employees.filter(e => e.rsvpStatus === 'ไม่ไป').length;
              const rsvpPending = employees.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length;
              const totalRsvp = employees.length || 1;

              const pctGoing = Math.round((rsvpGoing / totalRsvp) * 100);
              const pctNotGoing = Math.round((rsvpNotGoing / totalRsvp) * 100);
              const pctPending = 100 - pctGoing - pctNotGoing;

              const radius = 50;
              const strokeWidth = 14;
              const circumference = 2 * Math.PI * radius;

              const lenGoing = (rsvpGoing / totalRsvp) * circumference;
              const lenNotGoing = (rsvpNotGoing / totalRsvp) * circumference;
              const lenPending = (rsvpPending / totalRsvp) * circumference;

              return (
                <div className="relative flex items-center justify-center w-44 h-44">
                  <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                    {/* Gray fallback background circle if all are 0 */}
                    {employees.length === 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                      />
                    )}
                    
                    {/* Going Segment */}
                    {rsvpGoing > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${lenGoing} ${circumference - lenGoing}`}
                        strokeDashoffset={0}
                        strokeLinecap={rsvpNotGoing === 0 && rsvpPending === 0 ? "round" : "butt"}
                        className="transition-all duration-500 ease-out"
                      />
                    )}
                    
                    {/* Not Going Segment */}
                    {rsvpNotGoing > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#f43f5e"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${lenNotGoing} ${circumference - lenNotGoing}`}
                        strokeDashoffset={-lenGoing}
                        strokeLinecap={rsvpGoing === 0 && rsvpPending === 0 ? "round" : "butt"}
                        className="transition-all duration-500 ease-out"
                      />
                    )}
                    
                    {/* Pending Segment */}
                    {rsvpPending > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${lenPending} ${circumference - lenPending}`}
                        strokeDashoffset={-(lenGoing + lenNotGoing)}
                        strokeLinecap={rsvpGoing === 0 && rsvpNotGoing === 0 ? "round" : "butt"}
                        className="transition-all duration-500 ease-out"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-slate-800 tracking-tight font-display">{employees.length} คน</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 font-display">ลงทะเบียน</span>
                  </div>
                </div>
              );
            })()}

            {/* Custom Legend */}
            <div className="flex justify-center flex-wrap gap-4 mt-4 text-[11px] font-medium text-slate-600 max-w-sm">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>ไป ({employees.filter(e => e.rsvpStatus === 'ไป').length} คน)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>ไม่ไป ({employees.filter(e => e.rsvpStatus === 'ไม่ไป').length} คน)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>รอยืนยัน ({employees.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length} คน)</span>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-slate-500 font-semibold border-t border-slate-100 pt-3">
            ตอบไป <span className="text-emerald-600 font-bold">{employees.filter(e => e.rsvpStatus === 'ไป').length}</span> • สละสิทธิ์ <span className="text-rose-600 font-bold">{employees.filter(e => e.rsvpStatus === 'ไม่ไป').length}</span> • รอยืนยัน <span className="text-amber-600 font-bold">{employees.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length}</span> คน
          </div>
        </div>
      </div>

      {/* Admin actions & tab selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveSubTab('layout')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'layout' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            ผังห้องพักเรียลไทม์
          </button>
          <button
            onClick={() => setActiveSubTab('map')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'map' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            แผนที่ที่พัก (Map)
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeSubTab === 'settings' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            ตั้งค่า / Demo
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshAll}
            className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ซิงค์ข้อมูล
          </button>
          
          <button
            onClick={handleResetBookings}
            disabled={resetting}
            className="border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ล้างการจองทั้งหมด
          </button>
        </div>
      </div>

      {/* Search Bar for Layout subtab */}
      {activeSubTab === 'layout' && (
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 พิมพ์ค้นหารายชื่อพนักงาน หรือฝ่าย/แผนก เพื่อกรองดูผังห้อง..."
            value={empSearchQuery}
            onChange={(e) => setEmpSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700 shadow-3xs"
          />
          {empSearchQuery && (
            <button
              onClick={() => setEmpSearchQuery('')}
              className="absolute right-3.5 top-3 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Subtab content 1: Interactive room layout */}
      {activeSubTab === 'map' && (
        <div className="space-y-6" id="map-view-container">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display mb-4">ผังรีสอร์ต (Interactive Map)</h3>
            
            <div className="mb-4 space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-hide mb-2">
                <button
                  onClick={() => setEditingMapZone('main')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    editingMapZone === 'main' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  โซนรีสอร์ท
                </button>
                <button
                  onClick={() => setEditingMapZone('zone1')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    editingMapZone === 'zone1' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  โซนโรงแรม 1
                </button>
                <button
                  onClick={() => setEditingMapZone('zone2')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    editingMapZone === 'zone2' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  โซนโรงแรม 2
                </button>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-indigo-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  ขณะนี้คุณกำลังตั้งค่ารูปแผนที่ของ: <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg ml-1 font-black">{editingMapZone === 'main' ? 'โซนรีสอร์ท' : editingMapZone === 'zone1' ? 'โซนโรงแรม 1' : 'โซนโรงแรม 2'}</span>
                </p>
                <p className="text-[10px] text-indigo-600/70 mt-1 font-medium ml-6">เลือกโซนที่ต้องการเปลี่ยนรูปภาพได้จากแถบด้านบนครับ</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">อัปโหลดรูปแผนที่ (JPG/PNG):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMapUpload}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    disabled={uploadingMap}
                    key={editingMapZone}
                  />
                  {uploadingMap && <span className="text-xs text-indigo-600 animate-pulse">กำลังอัปโหลด...</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">หรือระบุ URL รูปภาพ (Direct Link):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={mapUrlInput}
                    onChange={(e) => setMapUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="text-xs w-full px-4 py-2 border rounded-full border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSaveMapUrl}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700"
                  >
                    บันทึก URL
                  </button>
                </div>
              </div>
            </div>
            
            <ResortMap 
              rooms={rooms} 
              employees={employees} 
              onUpdateRoom={handleUpdateRoom} 
              isAdmin={true} 
              mapImageUrl={sheetConfig?.mapImageUrl} 
              mapImageUrlZone1={sheetConfig?.mapImageUrlZone1} 
              mapImageUrlZone2={sheetConfig?.mapImageUrlZone2} 
              onActiveZoneChange={setEditingMapZone} 
              setActiveTab={setActiveTab}
              setBookingSelectedRoomId={setBookingSelectedRoomId}
            />
          </div>
        </div>
      )}

      {activeSubTab === 'layout' && (
        <div className="space-y-8" id="layout-view-container">
          {rooms.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              <button
                onClick={handleAddNewRoom}
                className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-indigo-50 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl transition-all cursor-pointer h-full min-h-[140px] text-slate-500 hover:text-indigo-600 group"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-100 flex items-center justify-center mb-2 shadow-3xs transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold font-display uppercase tracking-wide text-center">สร้างห้องพักใหม่</span>
              </button>
            </div>
          ) : (empSearchQuery ? filteredRoomsBySearch : rooms).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-3xs">
              <UserX className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-bold">ไม่พบข้อมูลห้องพักหรือพนักงานตามคำค้นหาที่ระบุ</p>
            </div>
          ) : (
            <div className="space-y-4" id="all-rooms-container">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display">
                  ห้องพักทั้งหมด (All Rooms)
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100 font-display">
                  {rooms.length} ห้องพัก
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {!empSearchQuery && (
                  <button
                    onClick={handleAddNewRoom}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-indigo-50 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl transition-all cursor-pointer h-full min-h-[140px] text-slate-500 hover:text-indigo-600 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-100 flex items-center justify-center mb-2 shadow-3xs transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-display uppercase tracking-wide text-center">สร้างห้องพักใหม่</span>
                  </button>
                )}
                {sortedRooms.map((room, index) => {
                  const occupants = stats.occupantsByRoom[room.id] || [];
                  const count = occupants.length;
                  const isFull = count >= room.capacity;
                  
                  return (
                    <div
                      key={room.id}
                      className={`group relative rounded-3xl border transition-all duration-500 overflow-hidden flex flex-col h-full ${
                        isFull 
                          ? 'border-rose-200 bg-white shadow-sm hover:shadow-rose-100/50' 
                          : 'border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-200'
                      }`}
                    >
                      {/* Full Room Background Effect */}
                      {isFull && (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.04)_0%,transparent_70%)] pointer-events-none" />
                      )}

                      {/* Top Accent Line */}
                      <div className={`h-1.5 w-full relative z-10 ${
                        isFull ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500'
                      }`} />

                      <div className="p-4 flex flex-col flex-1 space-y-4 relative z-10">
                        {/* Card Header */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-3xs border transition-transform group-hover:scale-105 ${
                              isFull ? 'bg-rose-100 border-rose-200' : 'bg-indigo-50 border-indigo-100'
                            }`}>
                              <Hotel className={`w-5 h-5 ${isFull ? 'text-rose-600' : 'text-indigo-600'}`} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[13px] font-display font-extrabold text-slate-800 leading-tight">
                                {room.roomName ? (
                                  <span className="block text-indigo-700 font-black whitespace-pre-wrap">{room.roomName}</span>
                                ) : (
                                  <span className="block">ห้อง {room.id}</span>
                                )}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  {room.roomType}
                                </span>
                                {room.floor && (
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    ชั้น {room.floor}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <button
                              onClick={() => setViewingOccupantsRoomId(room.id)}
                              className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-all shrink-0 border border-indigo-100 shadow-3xs group/view"
                            >
                              <Users className="w-3 h-3 transition-transform group-hover/view:scale-110" />
                              <span className="text-[9px] font-black">ดูรายชื่อ</span>
                            </button>
                            {isFull ? (
                              <motion.span 
                                animate={{ 
                                  scale: [1, 1.05, 1],
                                  boxShadow: ["0 0 0px rgba(225,29,72,0)", "0 0 12px rgba(225,29,72,0.4)", "0 0 0px rgba(225,29,72,0)"] 
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-sm"
                              >
                                SOLD OUT
                              </motion.span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-wider rounded-md border border-amber-100">
                                ว่าง {room.capacity - count} เตียง
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Visualizer Section */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                              isFull ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                              ความจุห้อง ({count}/{room.capacity})
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden w-full relative shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / room.capacity) * 100}%` }}
                              className={`h-full transition-all duration-500 relative ${
                                isFull ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.2)]'
                              }`}
                            >
                              <motion.div 
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2"
                              />
                            </motion.div>
                          </div>

                          {/* Bed Slots Grid */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {Array.from({ length: room.capacity }).map((_, slotIdx) => {
                              const occ = occupants[slotIdx];
                              const isSlotOccupied = !!occ;
                              return (
                                <div 
                                  key={slotIdx}
                                  className={`relative px-1.5 py-1 rounded-xl border flex items-center gap-1 transition-all group/slot h-7 ${
                                    isSlotOccupied 
                                      ? occ.gender === 'หญิง' 
                                        ? 'bg-rose-50/40 border-rose-100/60' 
                                        : 'bg-blue-50/40 border-blue-100/60'
                                      : 'bg-slate-50/30 border-slate-100/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 min-w-0 flex-1">
                                    <div className={`w-1 h-1 rounded-full shrink-0 ${
                                      isSlotOccupied 
                                        ? occ.gender === 'หญิง' ? 'bg-rose-400' : 'bg-blue-400'
                                        : 'bg-slate-300'
                                    }`} />
                                    <span className={`text-[9px] font-bold truncate leading-none ${
                                      isSlotOccupied 
                                        ? occ.gender === 'หญิง' ? 'text-rose-600' : 'text-blue-600'
                                        : 'text-slate-400'
                                    }`}>
                                      {isSlotOccupied ? occ.name : 'เตียงว่าง'}
                                    </span>
                                  </div>
                                  
                                  {isSlotOccupied && (
                                    <button
                                      type="button"
                                      onClick={() => setCancelingEmp(occ)}
                                      className="absolute right-0.5 top-0.5 opacity-0 group-hover/slot:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-all shadow-sm z-10"
                                      title="ยกเลิกการจอง"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom Stats & Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${
                              room.genderRestriction === 'หญิงล้วน' 
                                ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                : room.genderRestriction === 'ชายล้วน'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                              {room.genderRestriction}
                            </span>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                              isFull ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
                            }`}>
                               <Users className={`w-2.5 h-2.5 ${isFull ? 'text-rose-400' : 'text-slate-400'}`} />
                               <span className={`text-[9px] font-black ${isFull ? 'text-rose-600' : 'text-slate-600'}`}>
                                 {count}/{room.capacity}
                               </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(room)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all shadow-3xs bg-slate-50"
                              title="แก้ไขห้องพัก"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all shadow-3xs bg-slate-50"
                              title="ลบห้องพัก"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab content 4: System setup / Google Sheets / RSVP Control */}

      {/* Subtab content 4: System setup / Google Sheets / RSVP Control */}
      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-8" id="settings-view-container">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-display font-black text-slate-800">ตั้งค่าระบบ</h3>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              จัดการการเชื่อมต่อ Google Sheets และควบคุมการเปิดรับลงทะเบียน RSVP ของพนักงาน
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
            {/* Google Sheets Management Block */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/60 shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 font-display">การเชื่อมต่อ Google Sheets</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Synchronization</p>
                </div>
              </div>

              {sheetConfig && sheetConfig.spreadsheetId && !isEditingSheetUrl ? (
                <div className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-200 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> เชื่อมต่อแล้ว
                      </p>
                      <h5 className="text-sm font-bold text-slate-800 truncate">{sheetConfig.spreadsheetName}</h5>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{sheetConfig.spreadsheetId}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <a
                        href={sheetConfig.spreadsheetUrl}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="shrink-0 p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 shadow-3xs transition-all"
                        title="เปิดในแท็บใหม่"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {!accessToken ? (
                        <div className="w-full mb-2 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-amber-700">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-[10px] font-bold">ยังไม่ได้เชื่อมต่อบัญชี Google สำหรับบันทึกข้อมูล</span>
                          </div>
                          <button 
                            onClick={onSyncToSheet}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black py-1.5 px-3 rounded-lg transition-all"
                          >
                            เชื่อมต่อตอนนี้
                          </button>
                        </div>
                      ) : (
                        <div className="w-full mb-2 p-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-bold text-emerald-700">เชื่อมต่อบัญชี Google แล้ว</span>
                        </div>
                      )}
                      <button
                        onClick={onRefreshAll}
                        className="flex-1 min-w-[120px] bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-black py-2.5 px-4 rounded-xl border border-slate-200 transition-all shadow-3xs flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        ดึงข้อมูลจากชีต
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('ต้องการเพิ่มหมุดโซนโรงแรมที่ขาดหายไปหรือไม่?')) {
                            try {
                              const roomsRef = collection(db, 'rooms');
                              const hotelRooms = [
                                { id: 'H127', roomName: 'โซนโรงแรม ห้อง 127', sequence: 17, roomType: 'Hotel Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 1500, floor: '1', notes: 'โซนโรงแรม 1' },
                                { id: 'H128', roomName: 'โซนโรงแรม ห้อง 128', sequence: 18, roomType: 'Hotel Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 1500, floor: '1', notes: 'โซนโรงแรม 1' },
                                { id: 'H129', roomName: 'โซนโรงแรม ห้อง 129', sequence: 19, roomType: 'Hotel Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 1500, floor: '1', notes: 'โซนโรงแรม 1' },
                                { id: 'H131', roomName: 'โซนโรงแรม ห้อง 131-132', sequence: 20, roomType: 'Hotel Room', capacity: 4, genderRestriction: 'ไม่จำกัด', pricePerNight: 3000, floor: '1', notes: 'โซนโรงแรม 1 (ห้องเชื่อม)' },
                                { id: 'H235', roomName: 'โซนโรงแรม ห้อง 235', sequence: 21, roomType: 'Hotel Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 1500, floor: '2', notes: 'โซนโรงแรม 2' },
                                { id: 'H236', roomName: 'โซนโรงแรม ห้อง 236', sequence: 22, roomType: 'Hotel Room', capacity: 2, genderRestriction: 'ไม่จำกัด', pricePerNight: 1500, floor: '2', notes: 'โซนโรงแรม 2' },
                              ];
                              for (const hr of hotelRooms) {
                                await setDoc(doc(roomsRef, hr.id), { ...hr, employees: [] }, { merge: true });
                              }
                              alert('เพิ่มหมุดโซนโรงแรมเรียบร้อยแล้ว');
                              window.location.reload();
                            } catch (err) {
                              alert('เกิดข้อผิดพลาด: ' + err);
                            }
                          }
                        }}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black py-2.5 px-4 rounded-xl border border-amber-600 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        เพิ่มหมุดโซนโรงแรมที่ขาด
                      </button>
                      <button
                        onClick={onSyncToSheet}
                        className="flex-1 min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black py-2.5 px-4 rounded-xl border border-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        บันทึกลง Google Sheet
                      </button>
                      <a 
                        href={sheetConfig.spreadsheetUrl || '#'} 
                        target="_blank" 
                        referrerPolicy="no-referrer"
                        className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        เปิดสเปรดชีต
                      </a>
                      <button
                        onClick={() => {
                          setNewSheetUrl(sheetConfig.spreadsheetUrl || '');
                          setIsEditingSheetUrl(true);
                        }}
                        className="flex-1 min-w-[120px] bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-black py-2.5 px-4 rounded-xl border border-slate-200 transition-all shadow-3xs flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        แก้ไขลิงก์
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 text-[11px] font-black py-2.5 px-4 rounded-xl border border-slate-200 hover:border-rose-100 transition-all shadow-3xs flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        ลบลิงก์
                      </button>
                      <button
                        onClick={onChangePin}
                        className="flex-1 min-w-[120px] bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-black py-2.5 px-4 rounded-xl border border-slate-800 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        เปลี่ยนรหัสผ่าน
                      </button>
                    </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-[1.5rem] border-2 border-dashed border-slate-200 space-y-4">
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h5 className="text-sm font-bold text-slate-600">
                      {isEditingSheetUrl ? 'แก้ไขการเชื่อมต่อสเปรดชีต' : 'ยังไม่มีการเชื่อมต่อสเปรดชีต'}
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1">กรอกลิงก์ Google Sheets ด้านล่างเพื่อเริ่มซิงค์ข้อมูล</p>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="วางลิงก์ Google Sheets ที่นี่..."
                      value={newSheetUrl}
                      onChange={(e) => setNewSheetUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all outline-none"
                    />
                    <div className="flex gap-2">
                      {isEditingSheetUrl && (
                        <button
                          onClick={() => setIsEditingSheetUrl(false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black py-3 px-4 rounded-xl transition-all"
                        >
                          ยกเลิก
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!newSheetUrl.trim()) return;
                          setIsSyncingSheet(true);
                          try {
                            await onSyncSheet(newSheetUrl);
                            setNewSheetUrl('');
                            setIsEditingSheetUrl(false);
                          } finally {
                            setIsSyncingSheet(false);
                          }
                        }}
                        disabled={!newSheetUrl.trim() || isSyncingSheet}
                        className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black py-3 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSyncingSheet ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            กำลังตรวจสอบและซิงค์...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ตรวจสอบและเชื่อมต่อ
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 bg-slate-50/70 rounded-[1.5rem] border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h5 className="text-xs font-black uppercase tracking-wider font-display">
                    คู่มือตั้งค่าเพื่อเชื่อมต่อ Google Sheet ของคุณ 🚀
                  </h5>
                </div>
                
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  คุณได้อัปโหลดระบบนี้ขึ้น GitHub เรียบร้อยแล้ว! เพื่อให้ระบบสามารถแก้ไขและบันทึกข้อมูลกลับลง Google Sheet ของคุณได้ทันทีโดยไม่ต้องผ่านส่วนกลาง มีขั้นตอนง่าย ๆ ดังนี้ครับ:
                </p>

                <div className="space-y-3.5 pt-1 text-[11px] text-slate-600">
                  {/* Step 1 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-3xs space-y-1">
                    <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] border border-emerald-100 font-sans">1</span>
                      ตั้งค่า Google Sheet เป็นสาธารณะ (สิทธิ์การอ่าน)
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed pl-6 font-medium">
                      เปิดสเปรดชีต Google Sheet &gt; กดปุ่ม <b>"แชร์" (Share)</b> &gt; เปลี่ยนสิทธิ์จาก "จำกัด" (Restricted) เป็น <b>"ทุกคนที่มีลิงก์" (Anyone with the link)</b> &gt; เลือกบทบาทเป็น <b>"ผู้อ่าน" (Viewer)</b> แล้วคัดลอกลิงก์มาวางในช่องระบุด้านบน
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-3xs space-y-1">
                    <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] border border-indigo-100 font-sans">2</span>
                      เปิดใช้งาน Google Auth และตั้งค่า Authorized Domains
                    </p>
                    <div className="text-[10px] text-slate-500 leading-relaxed pl-6 font-medium space-y-1">
                      <p>
                        1. ไปที่หน้า <b>Firebase Console</b> &gt; เมนู <b>Authentication</b> &gt; แท็บ <b>Sign-in method</b> &gt; คลิก <b>Add new provider</b> &gt; เลือก <b>Google</b> &gt; กดสวิตช์ <b>Enable (เปิดใช้งาน)</b> &gt; เลือกอีเมลติดต่อของโครงการและบันทึก
                      </p>
                      <p>
                        2. ในหน้าต่าง <b>Authentication</b> เดียวกัน ให้คลิกไปที่แท็บ <b>Settings</b> &gt; เลือกเมนู <b>Authorized domains</b> ที่แถบด้านซ้าย &gt; คลิกปุ่ม <b>Add domain</b> &gt; ป้อนโดเมน Vercel ของคุณ: <span className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-bold">staffretreat-db.vercel.app</span> เพื่อให้ระบบสามารถส่งผ่านข้อมูลการเข้าสู่ระบบได้อย่างปลอดภัย
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-3xs space-y-1">
                    <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] border border-amber-100 font-sans">3</span>
                      นำชุดคีย์การตั้งค่า (Firebase Config) ไปใส่ในไฟล์ระบบ
                    </p>
                    <div className="text-[10px] text-slate-500 leading-relaxed pl-6 font-medium space-y-1">
                      <p>
                        1. กดไอคอนรูปฟันเฟือง ⚙️ (Project settings) ที่มุมซ้ายบนของ Firebase Console
                      </p>
                      <p>
                        2. เลื่อนลงมาด้านล่างสุดที่หัวข้อ <b>Your apps</b> &gt; คลิกไอคอนเว็บ <b>(&lt;/&gt;)</b> เพื่อลงทะเบียนเว็บแอปพลิเคชัน (เช่น ตั้งชื่อว่า <span className="font-mono bg-slate-100 px-1 rounded">staffretreat-web</span>)
                      </p>
                      <p>
                        3. คัดลอกค่าต่าง ๆ จากตัวแปร <span className="font-mono text-amber-600">firebaseConfig</span> ไปใส่แทนที่ในไฟล์คีย์หลัก <span className="font-mono bg-slate-100 px-1 text-slate-700 font-bold">/firebase-applet-config.json</span> ของคุณโดยให้มีลักษณะดังนี้:
                      </p>
                      <pre className="mt-1 p-2 bg-slate-900 text-slate-200 rounded-lg text-[9px] font-mono overflow-x-auto leading-normal">
{`{
  "projectId": "ไอดีโปรเจกต์ของคุณ",
  "appId": "ไอดีแอปของคุณ",
  "apiKey": "คีย์ API ของคุณ",
  "authDomain": "โดเมน auth (เช่น xxx.firebaseapp.com)",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "xxx.firebasestorage.app",
  "messagingSenderId": "รหัสผู้ส่งข้อความ",
  "measurementId": "",
  "oAuthClientId": "",
  "recaptchaSiteKey": ""
}`}
                      </pre>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-3xs space-y-1">
                    <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[10px] border border-rose-100 font-sans">4</span>
                      อัปเดตโค้ดไปยัง GitHub เพื่ออัปเกรดอัตโนมัติบน Vercel
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed pl-6 font-medium">
                      แก้ไขไฟล์ <span className="font-mono bg-slate-100 px-1 font-bold">/firebase-applet-config.json</span> บน GitHub ของคุณให้เป็นข้อมูลของ Firebase ตัวใหม่ &gt; ระบบ Vercel จะดึงไปติดตั้งและเริ่มทำงานทันที (Auto-Deploy) คุณจะเข้าใช้งานผ่านลิงก์ <a href="https://staffretreat-db.vercel.app/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">https://staffretreat-db.vercel.app/</a> และกดขอสิทธิ์เขียน Google Sheet ได้ทันที!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-[10px] text-indigo-700 font-bold leading-relaxed">
                  💡 <b>ทำไมระบบต้องการสิ่งนี้?</b> เนื่องจากระบบออกแบบมาเพื่อความปลอดภัยสูงสุดและไร้รอยต่อ บัญชี Google ของแอดมินที่กดบันทึกข้อมูลจะถูกใช้เพื่อขอ Access Token มาเขียนข้อมูลลงชีตโดยตรง (Direct OAuth) ข้อมูลจึงไม่ต้องไหลผ่านเซิร์ฟเวอร์ของผู้อื่น มั่นใจได้ว่าข้อมูลพนักงานปลอดภัย 100% ครับ!
                </div>
              </div>
            </div>

            {/* RSVP Control Center Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
                  rsvpClosed ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {rsvpClosed ? <Lock className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 font-display">ควบคุมการลงทะเบียน RSVP</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registration Status</p>
                </div>
              </div>

              <div className={`p-6 rounded-[1.5rem] border transition-all space-y-4 ${
                rsvpClosed ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50/50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${rsvpClosed ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${rsvpClosed ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {rsvpClosed ? 'ปิดรับคำตอบแล้ว' : 'กำลังเปิดรับคำตอบ'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                    {rsvpClosed 
                      ? 'พนักงานจะไม่สามารถระบุความประสงค์ "ไป" หรือ "ไม่ไป" ได้เพิ่มเติม ข้อมูลจะถูกล็อคเพื่อเตรียมสรุปยอดจัดห้องพัก' 
                      : 'พนักงานสามารถเข้ามาระบุสถานะความประสงค์ได้ตามปกติ ข้อมูลจะซิงค์เข้าสู่ระบบแบบเรียลไทม์'}
                  </p>
                </div>

                <button
                  onClick={() => onToggleRSVPClosed(!rsvpClosed)}
                  className={`w-full text-xs font-black py-3.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
                    rsvpClosed 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {rsvpClosed ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      เปิดรับคำตอบ RSVP ทันที
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      ปิดรับคำตอบและล็อคข้อมูล
                    </>
                  )}
                </button>
              </div>

              {/* Backup & Restore Section */}
              <div className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/60 shadow-xs">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 font-display">สำรองและกู้คืนข้อมูล</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Backup & Restore</p>
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/25 rounded-[1.5rem] border border-indigo-100/50 space-y-4">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                    คุณสามารถดาวน์โหลดข้อมูลทั้งหมด (ห้องพักและรายชื่อการจอง) เก็บไว้เป็นไฟล์สำรองข้อมูลส่วนตัวแบบ JSON หรือนำมาอัปโหลดเพื่อกู้คืนข้อมูลทั้งหมดของระบบได้ทันที
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Backup Download Button */}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const backupData = {
                            rooms,
                            employees,
                            backupDate: new Date().toISOString()
                          };
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `backup_staffretreat_${new Date().toISOString().split('T')[0]}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                        } catch (err: any) {
                          alert(`เกิดข้อผิดพลาดในการสำรองข้อมูล: ${err.message}`);
                        }
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 font-display"
                    >
                      <Download className="w-4 h-4" />
                      ดาวน์โหลดไฟล์สำรอง (.json)
                    </button>

                    {/* Restore Upload Button */}
                    <label className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-black py-2.5 px-4 rounded-xl shadow-3xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center font-display">
                      <Upload className="w-4 h-4 text-indigo-500" />
                      นำเข้าไฟล์เพื่อกู้คืน (.json)
                      <input
                        type="file"
                        accept=".json"
                        onChange={async (e) => {
                          const fileReader = new FileReader();
                          if (e.target.files && e.target.files[0]) {
                            fileReader.readAsText(e.target.files[0], "UTF-8");
                            fileReader.onload = async (event) => {
                              try {
                                const parsedData = JSON.parse(event.target?.result as string);
                                if (!parsedData.rooms || !parsedData.employees) {
                                  alert("รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง กรุณาเลือกไฟล์ที่ดาวน์โหลดจากระบบนี้");
                                  return;
                                }
                                if (confirm(`⚠️ ยืนยันการกู้คืนข้อมูล?\n\nการกระทำนี้จะเขียนทับข้อมูลห้องพัก (${parsedData.rooms.length} ห้อง) และพนักงาน (${parsedData.employees.length} คน) ทั้งหมดในระบบปัจจุบันด้วยข้อมูลจากไฟล์สำรอง!`)) {
                                  await onUpdateRooms(parsedData.rooms);
                                  await onUpdateEmployees(parsedData.employees);
                                  alert("🎉 กู้คืนข้อมูลและอัปเดตระบบเรียบร้อยแล้ว!");
                                }
                              } catch (err: any) {
                                alert(`เกิดข้อผิดพลาดในการนำเข้าข้อมูล: ${err.message}`);
                              }
                            };
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Reset System Button */}
              <div className="pt-6 space-y-3">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full group p-4 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-2xl transition-all text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-rose-100 text-slate-400 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-slate-700 group-hover:text-rose-700 uppercase tracking-wider">ล้างข้อมูลการจองห้อง</h5>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">ลบสถานะห้องพักของทุกคนออก แต่ข้อมูลชื่อพนักงานยังคงอยู่</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-400" />
                </button>

                {sheetConfig?.spreadsheetId && onCleanSyncSheet && (
                  <button
                    onClick={() => setShowCleanSyncConfirm(true)}
                    className="w-full group p-4 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-2xl transition-all text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-rose-100 text-slate-400 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-black text-slate-700 group-hover:text-rose-700 uppercase tracking-wider">ล้างข้อมูลพนักงาน & ซิงค์ใหม่ (Clean Re-sync)</h5>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">ลบรายชื่อพนักงานทั้งหมดในฐานข้อมูล แล้วดึงรายชื่อใหม่จาก Google Sheets อย่างสะอาด</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-400" />
                  </button>
                )}

                {onWipeAllEmployees && (
                  <button
                    onClick={() => setShowWipeEmployeesConfirm(true)}
                    className="w-full group p-4 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-2xl transition-all text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-rose-100 text-slate-400 group-hover:text-rose-600 flex items-center justify-center transition-colors">
                        <UserX className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-[11px] font-black text-slate-700 group-hover:text-rose-700 uppercase tracking-wider">ลบข้อมูลรายชื่อพนักงานทั้งหมด</h5>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">ลบรายชื่อพนักงานและล้างการจองห้องพักทั้งหมดออกจากระบบทันที</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Sheet Configuration Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 font-display mb-2">ยกเลิกการเชื่อมต่อสเปรดชีต</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              คุณต้องการยกเลิกการเชื่อมต่อกับ <span className="font-extrabold text-slate-800">"{sheetConfig?.spreadsheetName}"</span> ใช่หรือไม่? <br/>ระบบจะหยุดซิงค์ข้อมูลแต่รายชื่อเดิมในระบบจะยังคงอยู่
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onClearSheetConfig();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                ยืนยันยกเลิกเชื่อมต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal Overlay */}
      {cancelingEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setCancelingEmp(null)}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <UserX className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-display mb-2">ยืนยันยกเลิกการจอง</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              คุณต้องการยกเลิกสิทธิ์การจัดสรรห้องพักของ <span className="font-extrabold text-slate-800">"{cancelingEmp.name}"</span> ใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCancelingEmp(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelBooking}
                disabled={isCanceling}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {isCanceling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Deleting Modal Overlay */}
      {deletingRoomId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setDeletingRoomId(null)}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-display mb-2">ยืนยันการลบห้องพัก</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการลบห้องนี้ทิ้ง? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingRoomId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteRoom}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                ยืนยันลบห้อง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Error Modal */}
      {deleteError && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setDeleteError(null)}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-display mb-2">ไม่สามารถลบห้องได้</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {deleteError}
            </p>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Room Editing Modal Overlay */}
      {editingRoom && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 font-display">
                แก้ไขรายละเอียดห้องพัก ({editingRoom.roomType})
              </h3>
              <button
                onClick={() => setEditingRoom(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoomChanges} className="p-6 space-y-4">
              {saveRoomError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{saveRoomError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                  ประเภทห้องพัก
                </label>
                <select
                  value={roomType}
                  onChange={(e) => {
                    const type = e.target.value;
                    setRoomType(type);
                    if (type === 'Family Suite') setCapacity(4);
                    else setCapacity(2);
                  }}
                  disabled={isSavingRoom}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                  required
                >
                  <option value="Standard Twin">Standard Twin</option>
                  <option value="Deluxe King">Deluxe King</option>
                  <option value="Deluxe Twin">Deluxe Twin</option>
                  <option value="Executive Suite">Executive Suite</option>
                  <option value="Family Suite">Family Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                    ความจุผู้พักสูงสุด (คน)
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    min={1}
                    max={10}
                    disabled={isSavingRoom}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                    เงื่อนไขสิทธิ์การเข้าพัก
                  </label>
                  <select
                    value={genderRestriction}
                    onChange={(e) => setGenderRestriction(e.target.value as any)}
                    disabled={isSavingRoom}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                  >
                    <option value="ไม่จำกัด">ไม่จำกัดเพศ</option>
                    <option value="ชายล้วน">ชายล้วน</option>
                    <option value="หญิงล้วน">หญิงล้วน</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                    ลำดับห้อง (เช่น 1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    value={roomSequence !== undefined ? roomSequence : ''}
                    onChange={(e) => setRoomSequence(e.target.value ? Number(e.target.value) : undefined)}
                    min={1}
                    disabled={isSavingRoom}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                    placeholder="เรียงอัตโนมัติ"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                    ชั้นที่ (เช่น 1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value ? Number(e.target.value) : 1)}
                    min={1}
                    disabled={isSavingRoom}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                    placeholder="ชั้น 1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                  ชื่อห้องพัก / รายละเอียดสถานที่ (เช่น โซนรีสอร์ท บ้านริมธาร 881 เตียง 6 ฟุต 1 เตียง)
                </label>
                <textarea
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  disabled={isSavingRoom}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs h-16 resize-none bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                  placeholder="เช่น โซนรีสอร์ท บ้านริมธาร 881 เตียง 6 ฟุต 1 เตียง"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-wider font-display">
                  หมายเหตุ / เงื่อนไขเพิ่มเติม
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSavingRoom}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs h-18 resize-none bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium disabled:opacity-50"
                  placeholder="เตียงคู่เดี่ยว วิวระเบียงสวน เป็นต้น..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  disabled={isSavingRoom}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingRoom}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingRoom && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSavingRoom ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Occupants Modal */}
      {viewingOccupantsRoomId && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setViewingOccupantsRoomId(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-display font-extrabold text-slate-800">รายชื่อผู้เข้าพัก</h3>
                <p className="text-xs text-slate-500 mt-0.5">อ้างอิงจากผู้ที่จองแล้วในระบบ</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingOccupantsRoomId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 py-2 max-h-[60vh] overflow-y-auto pr-1">
              {(() => {
                const occupants = stats.occupantsByRoom[viewingOccupantsRoomId] || [];
                const room = rooms.find(r => r.id === viewingOccupantsRoomId);
                
                if (occupants.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-400 italic text-xs">
                      ยังไม่มีผู้เข้าพักในห้องนี้
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {occupants.map((occ) => (
                      <div 
                        key={occ.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                            occ.gender === 'หญิง' ? 'bg-rose-500' : 'bg-blue-500'
                          }`}>
                            {occ.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{occ.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {occ.department} • {occ.id}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {room && occupants.length < room.capacity && (
                      <div className="text-center py-3 text-[11px] text-indigo-500 font-bold bg-indigo-50/50 rounded-2xl border border-indigo-100 border-dashed">
                        ยังว่างอีก {room.capacity - occupants.length} ที่
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingOccupantsRoomId(null)}
                className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Bookings Confirmation Modal */}
      {showResetConfirm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={() => setShowResetConfirm(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-sm w-full p-6 space-y-6 overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-60" />
            
            <div className="text-center space-y-3 relative">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600 shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-extrabold text-slate-800 leading-tight">
                ล้างข้อมูลการจองทั้งหมด?
              </h3>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">
                คุณต้องการยกเลิกการจองห้องพักของ <span className="font-bold text-rose-600">พนักงานทุกคน</span> ทันทีใช่หรือไม่? 
                <br/>
                <span className="text-[11px] font-medium italic">*ข้อมูลห้องพักจะถูกตั้งค่าเป็นว่างทั้งหมด</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all"
              >
                ไม่, ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                ยืนยันการล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Re-sync Confirmation Modal */}
      {showCleanSyncConfirm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={() => setShowCleanSyncConfirm(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-sm w-full p-6 space-y-6 overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-60" />
            
            <div className="text-center space-y-3 relative">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600 shadow-inner">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-extrabold text-slate-800 leading-tight">
                ล้างข้อมูลพนักงาน & ซิงค์ใหม่?
              </h3>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">
                คุณต้องการ <span className="font-bold text-rose-600">ลบรายชื่อพนักงานทั้งหมด</span> ในฐานข้อมูลระบบ และดึงรายชื่อใหม่จาก Google Sheets ใช่หรือไม่?
                <br/>
                <span className="text-[11px] font-medium text-slate-400 italic">*สถานะการจองและการตอบรับ RSVP เดิมของทุกคนจะถูกล้างใหม่ทั้งหมด</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCleanSyncConfirm(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all"
              >
                ไม่, ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCleanSync}
                className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                ยืนยันล้างและซิงค์ใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Clean Sync */}
      {isPerformingCleanSync && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-[110]">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
            <div>
              <h4 className="text-sm font-black text-slate-800">กำลังล้างและซิงค์ข้อมูลใหม่...</h4>
              <p className="text-[11px] text-slate-400 mt-1">กรุณารอสักครู่ ระบบกำลังลบฐานข้อมูลพนักงานเดิม และเชื่อมต่อดึงข้อมูลล่าสุดจาก Google Sheets</p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Wiping All Employees */}
      {showWipeEmployeesConfirm && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={() => setShowWipeEmployeesConfirm(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-rose-100 shadow-2xl max-w-sm w-full p-6 space-y-6 overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-60" />
            
            <div className="text-center space-y-3 relative">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600 shadow-inner">
                <UserX className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-extrabold text-slate-800 leading-tight">
                ลบรายชื่อพนักงานทั้งหมด?
              </h3>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">
                คุณต้องการ <span className="font-bold text-rose-600">ลบรายชื่อพนักงานทั้งหมดออกจากระบบ</span> รวมถึงล้างสถานะการจองห้องพักของทุกคนเลยใช่หรือไม่? การกระทำนี้จะไม่สามารถเรียกคืนได้
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWipeEmployeesConfirm(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all"
              >
                ไม่, ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleWipeEmployees}
                className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                ยืนยันลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Wipe */}
      {isPerformingWipe && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-[110]">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
            <div>
              <h4 className="text-sm font-black text-slate-800">กำลังลบข้อมูลรายชื่อพนักงาน...</h4>
              <p className="text-[11px] text-slate-400 mt-1">กรุณารอสักครู่ ระบบกำลังล้างข้อมูลพนักงานและการจองห้องทั้งหมดออกจากฐานข้อมูล</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
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
                disabled={isCreatingRoom}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createRoomError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{createRoomError}</span>
              </div>
            )}
            
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
                    disabled={isCreatingRoom}
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
                    disabled={isCreatingRoom}
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
                  disabled={isCreatingRoom}
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
                  disabled={isCreatingRoom}
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
                      disabled={isCreatingRoom}
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
                    disabled={isCreatingRoom}
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
                  disabled={isCreatingRoom}
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
                disabled={isCreatingRoom}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isCreatingRoom ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-4 h-4" />}
                {isCreatingRoom ? 'กำลังสร้าง...' : 'ยืนยันการสร้างห้อง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
