import React, { useState, useEffect } from 'react';
import { Employee, Room, SheetConfig } from './types';
import Header from './components/Header';
import EmployeeBooking from './components/EmployeeBooking';
import AdminDashboard from './components/AdminDashboard';
import TripRSVP from './components/TripRSVP';
import SummaryReport from './components/SummaryReport';
import RoomDirectory from './components/RoomDirectory';
import { initAuth, googleSignIn, getAccessToken, logout } from './lib/authService';
import { 
  listenToEmployees, 
  listenToRooms, 
  listenToSettings, 
  updateEmployeeRSVP, 
  updateSettings,
  updateEmployeesInFirestore,
  updateBookingInFirestore,
  cancelBookingInFirestore,
  updateRoomsInFirestore,
  updateCheckInStatus,
  seedDemoDataToFirestore,
  syncSheetToFirestore,
  cleanSyncSheetToFirestore,
  syncFirestoreToSheet,
  resetAllBookingsInFirestore,
  wipeAllEmployeesInFirestore,
  clearSheetConfig,
  getAdminPin,
  updateAdminPin,
  updateEmployeeVerification
} from './lib/firebaseService';
import { sendAdminPinEmail } from './lib/emailService';
import { Loader2, AlertCircle, FileSpreadsheet, Sparkles, ChevronRight, Shield, Eye, EyeOff, KeyRound, Lock, Heart, Mail, Users, Search, Building2, Check, CheckCircle2, Home, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // App data state subscribed from Firestore in real-time
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [rsvpClosed, setRsvpClosed] = useState(false);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);

  // Status and Loading indicators
  const [dataLoading, setDataLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [sheetInput, setSheetInput] = useState('');

  // Tab Selection
  const [activeTab, setActiveTab] = useState<'rsvp' | 'booking' | 'directory' | 'summary' | 'admin'>('rsvp');
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  // States for changing PIN
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  // User Role State
  const [userRole, setUserRole] = useState<'visitor' | 'employee' | 'admin' | null>(() => {
    return (localStorage.getItem('companytrip_user_role') as any) || null;
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(() => {
    return localStorage.getItem('companytrip_selected_employee_id') || null;
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(() => {
    return localStorage.getItem('companytrip_selected_department') || null;
  });

  const [verifiedEmployeeId, setVerifiedEmployeeId] = useState<string | null>(() => {
    return localStorage.getItem('companytrip_verified_employee_id') || null;
  });

  const isReadOnlyEmployee = React.useMemo(() => {
    if (userRole !== 'employee') return false;
    if (!verifiedEmployeeId) return false;
    return selectedEmployeeId !== verifiedEmployeeId;
  }, [userRole, selectedEmployeeId, verifiedEmployeeId]);

  const selectedEmployeeName = React.useMemo(() => {
    if (!selectedEmployeeId) return null;
    return employees.find(e => e.id === selectedEmployeeId)?.name || null;
  }, [selectedEmployeeId, employees]);

  // Temporary landing page states
  const [selectedDeptInput, setSelectedDeptInput] = useState('');
  const [selectedEmpIdInput, setSelectedEmpIdInput] = useState('');
  const [showEmployeeVerifyModal, setShowEmployeeVerifyModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [landingSearchQuery, setLandingSearchQuery] = useState('');
  const [landingDeptFilter, setLandingDeptFilter] = useState('all');
  const [landingRsvpFilter, setLandingRsvpFilter] = useState('all');
  const [isLandingDirectoryModalOpen, setIsLandingDirectoryModalOpen] = useState(false);

  // Departments list sourced dynamically from employees list
  const departments = React.useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filtered employees for landing dropdown based on selected department
  const filteredEmployeesForLanding = React.useMemo(() => {
    if (!selectedDeptInput) return [];
    return employees.filter(e => e.department === selectedDeptInput).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [employees, selectedDeptInput]);

  // Filtered employees list for the landing page interactive directory
  const filteredEmployeesForDirectory = React.useMemo(() => {
    return employees.filter(emp => {
      // search filter
      const matchesSearch = !landingSearchQuery.trim() || 
        emp.name.toLowerCase().includes(landingSearchQuery.toLowerCase()) || 
        emp.department.toLowerCase().includes(landingSearchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(landingSearchQuery.toLowerCase());
      
      // department filter
      const matchesDept = landingDeptFilter === 'all' || emp.department === landingDeptFilter;
      
      // rsvp filter
      const status = emp.rsvpStatus || 'ยังไม่ระบุ';
      const matchesRsvp = landingRsvpFilter === 'all' || status === landingRsvpFilter;
      
      return matchesSearch && matchesDept && matchesRsvp;
    }).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [employees, landingSearchQuery, landingDeptFilter, landingRsvpFilter]);

  const handleLoginAsVisitor = () => {
    setUserRole('visitor');
    localStorage.setItem('companytrip_user_role', 'visitor');
    setActiveTab('rsvp');
    setLandingError(null);
  };

  const handleLoginAsEmployeeDirectly = (empId: string, dept: string) => {
    setUserRole('employee');
    setSelectedEmployeeId(empId);
    setSelectedDepartment(dept);
    localStorage.setItem('companytrip_user_role', 'employee');
    localStorage.setItem('companytrip_selected_employee_id', empId);
    localStorage.setItem('companytrip_selected_department', dept);
    setActiveTab('rsvp');
    setLandingError(null);
  };

  const handleLoginAsEmployee = () => {
    if (!selectedDeptInput || !selectedEmpIdInput) {
      setLandingError('กรุณาเลือกฝ่ายและชื่อของคุณ');
      return;
    }
    
    // If this device is not verified as any employee yet, prompt verification
    if (!verifiedEmployeeId) {
      setShowEmployeeVerifyModal(true);
    } else {
      handleLoginAsEmployeeDirectly(selectedEmpIdInput, selectedDeptInput);
    }
  };

  const handleConfirmVerificationAndLogin = async () => {
    if (!selectedEmpIdInput || !selectedDeptInput) return;
    setSyncing(true);
    try {
      await updateEmployeeVerification(selectedEmpIdInput, true);
      setVerifiedEmployeeId(selectedEmpIdInput);
      localStorage.setItem('companytrip_verified_employee_id', selectedEmpIdInput);
      handleLoginAsEmployeeDirectly(selectedEmpIdInput, selectedDeptInput);
      setShowEmployeeVerifyModal(false);
    } catch (err: any) {
      console.error(err);
      setLandingError(`ไม่สามารถบันทึกการยืนยันตัวตนได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleLoginAsAdmin = async () => {
    try {
      const actualPin = await getAdminPin();
      if (adminPinInput === actualPin) {
        setUserRole('admin');
        setIsAdminAuthenticated(true);
        localStorage.setItem('companytrip_user_role', 'admin');
        setActiveTab('rsvp');
        setLandingError(null);
        setAdminPinInput('');
      } else {
        setLandingError('รหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setLandingError('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    }
  };

  const handleSwitchRole = () => {
    setUserRole(null);
    setSelectedEmployeeId(null);
    setSelectedDepartment(null);
    setIsAdminAuthenticated(false);
    localStorage.removeItem('companytrip_user_role');
    localStorage.removeItem('companytrip_selected_employee_id');
    localStorage.removeItem('companytrip_selected_department');
    setSelectedDeptInput('');
    setSelectedEmpIdInput('');
    setAdminPinInput('');
    setActiveTab('rsvp');
    setLandingError(null);
  };

  // Set up real-time listener subscriptions on mount
  useEffect(() => {
    setDataLoading(true);
    setDataError(null);

    const unsubAuth = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    const unsubEmployees = listenToEmployees((updatedEmps) => {
      setEmployees(updatedEmps);
      setDataLoading(false);
    });

    const unsubRooms = listenToRooms((updatedRooms) => {
      setRooms(updatedRooms);
    });

    const unsubSettings = listenToSettings((settings) => {
      setRsvpClosed(settings.rsvpClosed);
      if (settings.spreadsheetId) {
        setSheetConfig({
          spreadsheetId: settings.spreadsheetId,
          spreadsheetName: settings.spreadsheetName || 'ฐานข้อมูลที่เชื่อมต่อ',
          spreadsheetUrl: settings.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/edit`
        });
      } else {
        setSheetConfig(null);
      }
    });

    return () => {
      unsubEmployees();
      unsubRooms();
      unsubSettings();
      unsubAuth();
    };
  }, []);

  // Update Tab Selection with Admin check
  const handleSetTab = (tab: 'rsvp' | 'booking' | 'admin') => {
    if (tab === 'admin' && !isAdminAuthenticated) {
      setShowPinEntry(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleVerifyPin = async () => {
    try {
      const actualPin = await getAdminPin();
      if (adminPin === actualPin) {
        setIsAdminAuthenticated(true);
        setShowPinEntry(false);
        setActiveTab('admin');
        setAdminPin('');
      } else {
        alert('รหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
    }
  };

  const handleForgotPassword = async () => {
    if (!googleUser || !googleToken) {
      alert('กรุณาลงชื่อเข้าใช้ด้วย Google ก่อนครับ เพื่อยืนยันตัวตนก่อนส่งรหัสผ่าน');
      return;
    }

    if (!confirm(`คุณต้องการให้ระบบส่งรหัสผ่านแอดมินไปยังอีเมล ${googleUser.email} ใช่หรือไม่?`)) {
      return;
    }

    setSyncing(true);
    try {
      const pin = await getAdminPin();
      await sendAdminPinEmail(googleToken, googleUser.email, pin);
      alert(`ส่งรหัสผ่านไปยังอีเมล ${googleUser.email} สำเร็จแล้วครับ! โปรดเช็คใน Inbox หรือ Junk mail ของคุณ`);
    } catch (err: any) {
      console.error(err);
      alert(`ล้มเหลวในการส่งอีเมล: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleChangePin = async () => {
    if (!oldPinInput || !newPinInput) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const actualPin = await getAdminPin();
      if (oldPinInput !== actualPin) {
        alert('รหัสผ่านเดิมไม่ถูกต้อง');
        return;
      }

      await updateAdminPin(newPinInput);
      alert('เปลี่ยนรหัสผ่านสำเร็จแล้ว!');
      setIsChangingPin(false);
      setOldPinInput('');
      setNewPinInput('');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    }
  };

  // Update RSVP status for a specific employee
  const handleUpdateRSVP = async (employeeId: string, status: 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ') => {
    setSyncing(true);
    try {
      await updateEmployeeRSVP(employeeId, status);
      // Auto-sync back to sheet if connected AND authenticated
      if (sheetConfig?.spreadsheetId && googleToken) {
        const updatedEmployees = employees.map(e => e.id === employeeId ? { ...e, rsvpStatus: status, roomId: status === 'ไม่ไป' ? '' : e.roomId } : e);
        syncFirestoreToSheet(sheetConfig.spreadsheetId, updatedEmployees, rooms, googleToken).catch(e => console.error("Auto-sync failed", e));
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(`ไม่สามารถบันทึกคำตอบ RSVP ได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Toggle RSVP lock state from Admin
  const handleToggleRSVPClosed = async (closed: boolean) => {
    setSyncing(true);
    try {
      await updateSettings(closed);
    } catch (err: any) {
      console.error(err);
      alert(`ไม่สามารถสลับสถานะการปิดรับลงทะเบียนได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Book a room for a main employee and selected roommates
  const handleBooking = async (employeeId: string, roommateIds: string[], roomId: string) => {
    setSyncing(true);
    try {
      const allIds = [employeeId, ...roommateIds].filter(Boolean);
      
      const targetRoom = rooms.find(r => r.id === roomId);
      if (targetRoom) {
        const currentOccupants = employees.filter(e => e.roomId === roomId).length;
        // Only count people who are NOT already in this room
        const newPeopleCount = allIds.filter(id => {
          const emp = employees.find(e => e.id === id);
          return emp && emp.roomId !== roomId;
        }).length;

        if (currentOccupants + newPeopleCount > targetRoom.capacity) {
          const remaining = targetRoom.capacity - currentOccupants;
          throw new Error(`ห้องนี้มีความจุสูงสุด ${targetRoom.capacity} ท่าน ปัจจุบันมีผู้เข้าพักแล้ว ${currentOccupants} ท่าน (เหลือที่ว่าง ${remaining} ที่) แต่คุณกำลังพยายามเพิ่มเข้าไปอีก ${newPeopleCount} ท่าน ซึ่งเกินกว่าจำนวนที่ว่างรองรับได้ โปรดนำผู้เข้าพักบางท่านออกหรือเปลี่ยนห้องครับ`);
        }
      }

      await updateBookingInFirestore(allIds, roomId);
      // Auto-sync back to sheet if connected and googleToken is available
      if (sheetConfig?.spreadsheetId && googleToken) {
        const updatedEmployees = employees.map(e => allIds.includes(e.id) ? { ...e, roomId, rsvpStatus: 'ไป' as const } : e);
        syncFirestoreToSheet(sheetConfig.spreadsheetId, updatedEmployees, rooms, googleToken).catch(e => console.error("Auto-sync failed", e));
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(`ไม่สามารถบันทึกการจองได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Cancel/Unbook a room
  const handleCancelBooking = async (employeeId: string) => {
    setSyncing(true);
    try {
      const emp = employees.find(e => e.id === employeeId);
      const oldRoomId = emp?.roomId || undefined;
      await cancelBookingInFirestore(employeeId, oldRoomId);
      // Auto-sync back to sheet if connected and googleToken is available
      if (sheetConfig?.spreadsheetId && googleToken) {
        const updatedEmployees = employees.map(e => e.id === employeeId ? { ...e, roomId: '' } : e);
        syncFirestoreToSheet(sheetConfig.spreadsheetId, updatedEmployees, rooms, googleToken).catch(e => console.error("Auto-sync failed", e));
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(`ไม่สามารถล้างสถานะได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };
  
  // Bulk update rooms from Admin
  const handleUpdateRooms = async (updatedRooms: Room[]) => {
    setSyncing(true);
    try {
      await updateRoomsInFirestore(updatedRooms);
      // Auto-sync back to sheet if connected and googleToken is available
      if (sheetConfig?.spreadsheetId && googleToken) {
        syncFirestoreToSheet(sheetConfig.spreadsheetId, employees, updatedRooms, googleToken).catch(e => console.error("Auto-sync failed", e));
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(`ไม่สามารถบันทึกข้อมูลผังห้องใหม่ได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Bulk update employees from Admin
  const handleUpdateEmployees = async (updatedEmployees: Employee[]) => {
    setSyncing(true);
    try {
      await updateEmployeesInFirestore(updatedEmployees);
      // Auto-sync back to sheet if connected and googleToken is available
      if (sheetConfig?.spreadsheetId && googleToken) {
        syncFirestoreToSheet(sheetConfig.spreadsheetId, updatedEmployees, rooms, googleToken).catch(e => console.error("Auto-sync failed", e));
      }
    } catch (err: any) {
      console.error(err);
      throw new Error(`ไม่สามารถล้างสถานะพนักงานได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleResetAllBookings = async () => {
    setSyncing(true);
    try {
      await resetAllBookingsInFirestore();
      await handleRefreshAll(); // Refresh data to update UI
    } catch (err: any) {
      console.error(err);
      throw new Error(`ไม่สามารถล้างการจองทั้งหมดได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleWipeAllEmployees = async () => {
    setSyncing(true);
    try {
      await wipeAllEmployeesInFirestore();
    } catch (err: any) {
      console.error(err);
      throw new Error(`ไม่สามารถลบรายชื่อพนักงานทั้งหมดได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearSheetConfig = async () => {
    setSyncing(true);
    try {
      await clearSheetConfig();
    } catch (err: any) {
      console.error(err);
      alert(`ไม่สามารถยกเลิกการเชื่อมต่อสเปรดชีตได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Seed default dataset on a fresh instance
  const handleLoadDemoDataset = async () => {
    setSyncing(true);
    try {
      await seedDemoDataToFirestore();
    } catch (err: any) {
      alert(`ไม่สามารถนำเข้าข้อมูลตัวอย่างได้: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Sync / Import data from a public Google Sheets URL/ID
  const handleImportFromGoogleSheet = async (sheetLinkOrId: string) => {
    if (!sheetLinkOrId.trim()) return;
    setSyncing(true);
    setDataError(null);
    try {
      // Extract Google Sheet ID from URL if necessary
      let sheetId = sheetLinkOrId.trim();
      const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        sheetId = match[1];
      }

      await syncSheetToFirestore(sheetId);
      setSheetInput('');
      alert('ดึงข้อมูลและซิงค์กับ Google Sheet สำเร็จเรียบร้อยแล้ว!');
    } catch (err: any) {
      console.error(err);
      alert(`ดึงข้อมูลล้มเหลว: ${err.message || 'โปรดตรวจสอบสิทธิ์การแชร์ (ต้องตั้งเป็น ทุกคนที่มีลิงก์อ่านได้) และชื่อแท็บ Employees, Rooms'}`);
    } finally {
      setSyncing(false);
    }
  };

  // Clean Reset & Re-sync from Google Sheet (drops all current employees and imports clean)
  const handleCleanImportFromGoogleSheet = async (sheetLinkOrId: string) => {
    if (!sheetLinkOrId.trim()) return;
    setSyncing(true);
    setDataError(null);
    try {
      let sheetId = sheetLinkOrId.trim();
      const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        sheetId = match[1];
      }

      await cleanSyncSheetToFirestore(sheetId);
      setSheetInput('');
      alert('ล้างฐานข้อมูลพนักงานเดิมและซิงค์รายชื่อพนักงานใหม่จาก Google Sheet เรียบร้อยแล้ว!');
    } catch (err: any) {
      console.error(err);
      alert(`ดึงข้อมูลล้มเหลว: ${err.message || 'โปรดตรวจสอบสิทธิ์การแชร์ (ต้องตั้งเป็น ทุกคนที่มีลิงก์อ่านได้) และชื่อแท็บ Employees'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshAll = async () => {
    if (sheetConfig?.spreadsheetId) {
      await handleImportFromGoogleSheet(sheetConfig.spreadsheetId);
    }
  };

  const handleSyncToSheet = async () => {
    if (!sheetConfig?.spreadsheetId) {
      alert("โปรดเชื่อมต่อสเปรดชีตก่อนครับ");
      return;
    }

    // Check if we have a token
    let token = googleToken;
    if (!token) {
      try {
        const result = await googleSignIn();
        if (!result) return;
        token = result.accessToken;
        setGoogleUser(result.user);
        setGoogleToken(token);
      } catch (err: any) {
        alert(`เข้าสู่ระบบ Google ล้มเหลว: ${err.message}`);
        return;
      }
    }

    setSyncing(true);
    try {
      await syncFirestoreToSheet(sheetConfig.spreadsheetId, employees, rooms, token);
      alert("ซิงค์ข้อมูลกลับไปยัง Google Sheet สำเร็จเรียบร้อยแล้ว!");
    } catch (error: any) {
      console.error(error);
      alert(`ซิงค์ข้อมูลล้มเหลว: ${error.message || "โปรดตรวจสอบว่าคุณได้กดยอมรับสิทธิ์การเข้าถึง Google Sheets แล้ว"}`);
    } finally {
      setSyncing(false);
    }
  };

  // Determine if database is empty/new and needs onboarding setup
  const isNewSheet = !dataLoading && employees.length === 0 && rooms.length === 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900" id="app-root-container">
      
      {/* Header */}
      <Header
        user={googleUser}
        sheetConfig={sheetConfig}
        onLogout={logout}
        onRefresh={handleRefreshAll}
        syncing={syncing || dataLoading}
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        isOfflineMode={false}
        userRole={userRole}
        selectedEmployeeName={selectedEmployeeName}
        selectedDepartment={selectedDepartment}
        onSwitchRole={handleSwitchRole}
        isReadOnlyEmployee={isReadOnlyEmployee}
      />

      <main className="flex-1">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
            <span className="text-sm font-semibold">กำลังเชื่อมต่อฐานข้อมูลเรียลไทม์...</span>
          </div>
        ) : isNewSheet ? (
          /* Onboarding Setup view for fresh instances */
          <div className="max-w-xl mx-auto px-4 py-16 animate-in fade-in zoom-in-95 duration-200" id="onboarding-container">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100/60">
                <FileSpreadsheet className="w-6 h-6 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบจัดการห้องพัก</h2>
              <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                ขณะนี้ยังไม่มีข้อมูลพนักงานและผังห้องพักในระบบ โปรดเลือกเริ่มนำเข้าข้อมูลวิธีใดวิธีหนึ่งด้านล่างเพื่อเริ่มใช้งาน
              </p>

              <div className="mt-8 space-y-6">
                {/* Option 1: Demo Seeding */}
                <button
                  onClick={handleLoadDemoDataset}
                  disabled={syncing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                  นำเข้าข้อมูลตัวอย่างพนักงานชาวไทย 16 คน & 8 ห้องพัก (พร้อมใช้ทันที)
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">หรือซิงค์จากชีตของคุณ</span></div>
                </div>

                {/* Option 2: Public Google Sheets Sync */}
                <div className="space-y-3 text-left">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
                    กรอก ลิงก์สเปรดชีต หรือ ID Google Sheets
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="เช่น https://docs.google.com/spreadsheets/d/.../edit"
                      value={sheetInput}
                      onChange={(e) => setSheetInput(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                    <button
                      onClick={() => handleImportFromGoogleSheet(sheetInput)}
                      disabled={!sheetInput.trim() || syncing}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      ซิงค์ข้อมูล
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    * โปรดตรวจสอบว่าไฟล์ Google Sheet ของคุณทำการ<b>เปิดสิทธิ์แชร์เป็น "ทุกคนที่มีลิงก์สามารถอ่านได้"</b> และมีแท็บชื่อ <span className="font-bold text-slate-600">Employees</span> และ <span className="font-bold text-slate-600">Rooms</span> ตรงตามโครงสร้างกำหนด
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : !userRole ? (
          /* Mode Selection screen */
          <div className="max-w-6xl mx-auto px-4 py-8 sm:py-16 flex-1 flex flex-col items-center justify-center gap-12 min-h-[85vh] relative" id="mode-selection-container">
            {/* Ambient Background Glowing Accents */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Main Mode Selection Console */}
            <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] border-2 border-slate-100/80 shadow-[0_30px_70px_rgba(15,23,42,0.06)] w-full max-w-4xl p-6 sm:p-12 space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-10 -mt-10"></div>
              
              <div className="text-center space-y-3 relative z-10">
                <motion.span 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-indigo-100/50 text-indigo-700 text-[10px] font-black border border-indigo-200/40 uppercase tracking-widest font-display shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                  Staff Retreat Room Allocation System
                </motion.span>
                <motion.h2 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl sm:text-4xl font-display font-black text-slate-800 leading-tight tracking-tight"
                >
                  เลือกโหมดการเข้าใช้งานระบบ
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-400 text-xs max-w-md mx-auto"
                >
                  ยินดีต้อนรับสู่ระบบจองห้องพักสัมมนาพนักงานและบริหารจัดการอัจฉริยะ โปรดเลือกบทบาทเพื่อดำเนินการต่อครับ
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="pt-2 flex justify-center"
                >
                  <button
                    onClick={() => setIsLandingDirectoryModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 hover:text-indigo-800 text-xs font-black border border-indigo-200/50 hover:border-indigo-300/60 transition-all hover:scale-105 shadow-3xs cursor-pointer active:scale-95 group"
                  >
                    <Search className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                    <span>ตรวจสอบรายชื่อพนักงานและสถานะการจองทั้งหมด 🔍</span>
                  </button>
                </motion.div>
              </div>

              {landingError && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700 text-xs flex items-center gap-2.5 shadow-3xs animate-bounce">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-bold">{landingError}</span>
                </div>
              )}

              {/* Grid of 3 modes with high-fidelity styled cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                
                {/* 1. Visitor Card */}
                <motion.button
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  type="button"
                  onClick={handleLoginAsVisitor}
                  className="flex flex-col items-center justify-between p-6 rounded-3xl border border-slate-200/80 hover:border-indigo-200 bg-slate-50/50 hover:bg-white text-center cursor-pointer transition-all hover:shadow-[0_15px_30px_rgba(99,102,241,0.05)] group h-full min-h-[280px]"
                >
                  <div className="space-y-4 flex flex-col items-center w-full">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200/60 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:scale-105 transition-all duration-350 shadow-3xs">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-800 font-display font-black tracking-tight">ผู้เยี่ยมชม (Visitor Mode)</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed px-2">
                        เข้าชมความคืบหน้า รายงานผลสรุป ตารางห้อง และผังเตียงของเพื่อนร่วมงานแบบเรียลไทม์ (อ่านอย่างเดียว)
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-3.5 py-1.5 rounded-xl mt-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    เข้าสู่ระบบ <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </motion.button>

                {/* 2. Employee Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`flex flex-col items-center justify-between p-6 rounded-3xl border transition-all h-full min-h-[280px] shadow-3xs ${
                    selectedDeptInput 
                      ? 'border-indigo-400 bg-gradient-to-b from-indigo-50/20 to-indigo-100/5 hover:border-indigo-500 shadow-[0_15px_30px_rgba(99,102,241,0.06)]' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-indigo-100 hover:bg-white'
                  } text-center`}
                >
                  <div className="space-y-4 flex flex-col items-center w-full">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-350 shadow-3xs ${
                      selectedDeptInput ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200/60'
                    }`}>
                      <Users className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-2 w-full">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-800 font-display font-black tracking-tight">พนักงาน (Employee)</h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                          กรุณาเลือกฝ่ายและชื่อของคุณเพื่อตอบรับเข้าร่วมงาน และไปลุยเลือกจองห้องพักของคุณ
                        </p>
                      </div>

                      {/* Department Select */}
                      <select
                        value={selectedDeptInput}
                        onChange={(e) => {
                          setSelectedDeptInput(e.target.value);
                          setSelectedEmpIdInput('');
                        }}
                        className="w-full bg-white border border-slate-250 hover:border-indigo-300 rounded-xl text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-slate-700 transition-all cursor-pointer"
                      >
                        <option value="">-- เลือกฝ่าย/แผนก --</option>
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      {/* Employee Select */}
                      {selectedDeptInput && (
                        <select
                          value={selectedEmpIdInput}
                          onChange={(e) => setSelectedEmpIdInput(e.target.value)}
                          className="w-full bg-white border border-slate-250 hover:border-indigo-300 rounded-xl text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-slate-700 mt-2 animate-in fade-in slide-in-from-top-1 duration-300 transition-all cursor-pointer"
                        >
                          <option value="">-- เลือกรายชื่อของคุณ --</option>
                          {filteredEmployeesForLanding.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.gender})</option>
                          ))}
                        </select>
                      )}

                      {/* Welcome message helper */}
                      {selectedDeptInput && selectedEmpIdInput && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] p-2 rounded-xl text-center font-bold mt-1.5 animate-pulse">
                          ยินดีต้อนรับคุณ {employees.find(e => e.id === selectedEmpIdInput)?.name} ครับ!
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoginAsEmployee}
                    disabled={!selectedDeptInput || !selectedEmpIdInput}
                    className={`w-full inline-flex items-center justify-center gap-1.5 text-xs font-black mt-6 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                      selectedDeptInput && selectedEmpIdInput
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 active:scale-95'
                        : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span>ยืนยันพนักงาน</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>

                {/* 3. Admin Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`flex flex-col items-center justify-between p-6 rounded-3xl border transition-all h-full min-h-[280px] shadow-3xs ${
                    adminPinInput 
                      ? 'border-amber-400 bg-gradient-to-b from-amber-50/20 to-amber-100/5 hover:border-amber-500 shadow-[0_15px_30px_rgba(217,119,6,0.06)]' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-amber-100 hover:bg-white'
                  } text-center`}
                >
                  <div className="space-y-4 flex flex-col items-center w-full">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-350 shadow-3xs ${
                      adminPinInput ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-100 text-slate-500 border-slate-200/60'
                    }`}>
                      <Shield className="w-6 h-6" />
                    </div>
                    
                    <div className="space-y-2 w-full">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-800 font-display font-black tracking-tight">ผู้ดูแลระบบ (Admin)</h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                          กรอกรหัสผ่านผู้ดูแลระบบ เพื่อปลดล็อคเครื่องมือในการแก้ไข นำเข้า และล้างสถานะทั้งหมด
                        </p>
                      </div>

                      {/* Password PIN Field */}
                      <div className="relative pt-1">
                        <Lock className={`absolute left-3 top-3.5 w-4 h-4 transition-colors ${adminPinInput ? 'text-amber-600' : 'text-slate-450'}`} />
                        <input
                          type={showAdminPin ? "text" : "password"}
                          placeholder="รหัสผ่านผู้ดูแลระบบ"
                          value={adminPinInput}
                          onChange={(e) => setAdminPinInput(e.target.value)}
                          className="w-full pl-9 pr-9 py-2 bg-white border border-slate-250 rounded-xl text-center text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono font-extrabold tracking-widest text-slate-800 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPin(!showAdminPin)}
                          className="absolute right-3 top-3.5 text-slate-450 hover:text-slate-700"
                        >
                          {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoginAsAdmin}
                    disabled={!adminPinInput.trim()}
                    className={`w-full inline-flex items-center justify-center gap-1.5 text-xs font-black mt-6 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                      adminPinInput.trim()
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-100 active:scale-95'
                        : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span>ยืนยันผู้ดูแลระบบ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              </div>
            </div>

            {isLandingDirectoryModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-2xl border border-slate-150 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh] relative"
                >
                  {/* Directory Header (Compact) */}
                  <div className="px-4 py-3.5 sm:px-5 bg-slate-50 border-b border-slate-150 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-display font-black text-slate-800">รายชื่อและสถานะของพนักงานทั้งหมด</h3>
                        <p className="text-slate-400 text-[10px] sm:text-xs">
                          พนักงานทั้งหมด {employees.length} คน • คลิกที่แถวเพื่อเข้าจองห้องพักทันที
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLandingDirectoryModalOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-150 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Directory Body (Compact space-y-3) */}
                  <div className="p-4 sm:p-5 bg-white space-y-3.5 flex-1 overflow-y-auto flex flex-col">
                    {/* Toolbar: Search & RSVP Filter (Merged Row) */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2.5">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อ นามสกุล หรือฝ่าย..."
                          value={landingSearchQuery}
                          onChange={(e) => setLandingSearchQuery(e.target.value)}
                          className="w-full pl-8.5 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                        />
                      </div>

                      {/* RSVP Quick Filters */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200/60 self-start md:self-auto">
                        <span className="font-extrabold text-slate-400 text-[9px] px-1.5 uppercase tracking-wider">RSVP:</span>
                        <div className="flex gap-0.5">
                          {['all', 'ไป', 'ไม่ไป', 'ยังไม่ระบุ'].map((status) => {
                            const label = status === 'all' ? 'ทั้งหมด' : status === 'ไป' ? 'ไปร่วม' : status === 'ไม่ไป' ? 'ไม่ไป' : 'ยังไม่ระบุ';
                            const isActive = landingRsvpFilter === status;
                            return (
                              <button
                                key={status}
                                onClick={() => setLandingRsvpFilter(status)}
                                className={`px-2 py-0.5 rounded font-black text-[10px] transition-all cursor-pointer ${
                                  isActive
                                    ? status === 'ไป'
                                      ? 'bg-emerald-600 text-white shadow-3xs'
                                      : status === 'ไม่ไป'
                                        ? 'bg-rose-600 text-white shadow-3xs'
                                        : status === 'ยังไม่ระบุ'
                                          ? 'bg-amber-600 text-white shadow-3xs'
                                          : 'bg-slate-800 text-white shadow-3xs'
                                    : 'bg-transparent text-slate-650 hover:bg-slate-200'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Department Filters (Compact Row) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs py-1.5 border-t border-b border-slate-100">
                      <span className="font-extrabold text-slate-400 text-[9px] uppercase tracking-wider">กรองตามฝ่าย:</span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setLandingDeptFilter('all')}
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                            landingDeptFilter === 'all'
                              ? 'bg-indigo-600 text-white shadow-3xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50'
                          }`}
                        >
                          ทั้งหมด
                        </button>
                        {departments.map(d => (
                          <button
                            key={d}
                            onClick={() => setLandingDeptFilter(d)}
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                              landingDeptFilter === d
                                ? 'bg-indigo-600 text-white shadow-3xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/50'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table Area (Compact with small margins) */}
                    <div className="flex-1 overflow-x-auto min-h-0">
                      {filteredEmployeesForDirectory.length === 0 ? (
                        <div className="py-12 text-center text-slate-450 text-xs italic">
                          ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหา
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto shadow-4xs">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                              <tr className="text-[10px] text-slate-500 font-extrabold font-display uppercase tracking-wider">
                                <th className="px-3.5 py-2 text-center w-12">ลำดับ</th>
                                <th className="px-3.5 py-2">ชื่อ - นามสกุลพนักงาน</th>
                                <th className="px-3.5 py-2">ฝ่าย / แผนก</th>
                                <th className="px-3.5 py-2 text-center w-16">เพศ</th>
                                <th className="px-3.5 py-2 text-center">สถานะ RSVP</th>
                                <th className="px-3.5 py-2 text-center">ห้องพัก</th>
                                <th className="px-3.5 py-2 text-right">ดำเนินการ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {filteredEmployeesForDirectory.map((emp, index) => {
                                const rsvp = emp.rsvpStatus || 'ยังไม่ระบุ';
                                const isBooked = !!emp.roomId;

                                return (
                                  <tr
                                    key={emp.id}
                                    onClick={() => {
                                      setSelectedDeptInput(emp.department);
                                      setSelectedEmpIdInput(emp.id);
                                      setLandingError(null);
                                      setIsLandingDirectoryModalOpen(false);
                                      document.getElementById('mode-selection-container')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="text-[11px] hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                  >
                                    {/* Index */}
                                    <td className="px-3.5 py-1.5 text-center text-slate-400 font-bold font-mono">
                                      {index + 1}
                                    </td>

                                    {/* Name & ID */}
                                    <td className="px-3.5 py-1.5">
                                      <div className="font-extrabold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                        <span>{emp.name}</span>
                                        <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-50 border border-slate-100 px-1 rounded">
                                          {emp.id}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Department */}
                                    <td className="px-3.5 py-1.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-650 border border-slate-200/40">
                                        <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                        {emp.department}
                                      </span>
                                    </td>

                                    {/* Gender */}
                                    <td className="px-3.5 py-1.5 text-center">
                                      <span className={`inline-block px-1.5 py-0.2 rounded font-extrabold text-[9px] ${
                                        emp.gender === 'หญิง'
                                          ? 'bg-rose-50 text-rose-600 border border-rose-100/30'
                                          : 'bg-blue-50 text-blue-600 border border-blue-100/30'
                                      }`}>
                                        {emp.gender}
                                      </span>
                                    </td>

                                    {/* RSVP */}
                                    <td className="px-3.5 py-1.5 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        rsvp === 'ไป'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/20'
                                          : rsvp === 'ไม่ไป'
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200/20'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200/20'
                                      }`}>
                                        <span className={`w-1 h-1 rounded-full ${
                                          rsvp === 'ไป' ? 'bg-emerald-500' : rsvp === 'ไม่ไป' ? 'bg-rose-500' : 'bg-amber-500'
                                        }`} />
                                        {rsvp === 'ไป' ? 'ไปร่วมทริป' : rsvp === 'ไม่ไป' ? 'สละสิทธิ์' : 'ยังไม่ระบุ'}
                                      </span>
                                    </td>

                                    {/* Room status */}
                                    <td className="px-3.5 py-1.5 text-center">
                                      {isBooked ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100/40">
                                          <Home className="w-2.5 h-2.5 text-indigo-500" />
                                          ห้อง {emp.roomId}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-400">
                                          ว่าง
                                        </span>
                                      )}
                                    </td>

                                    {/* Quick Selection Link */}
                                    <td className="px-3.5 py-1.5 text-right">
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 group-hover:bg-indigo-100/80 px-2 py-0.5 rounded-md transition-all">
                                        จอง <ChevronRight className="w-2.5 h-2.5" />
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        ) : (
          /* Main Application Dashboard */
          <div className="py-4" id="main-app-views">
            {syncing && (
              <div className="fixed bottom-4 right-4 bg-slate-950 text-white text-xs font-semibold py-2 px-4 rounded-full flex items-center gap-2 shadow-lg z-50 animate-bounce">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                กำลังซิงค์และบันทึกการเปลี่ยนแปลงลงฐานข้อมูล...
              </div>
            )}

            {/* View switching with smooth animations */}
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.99 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                {activeTab === 'rsvp' ? (
                  <TripRSVP
                    employees={employees}
                    rsvpClosed={rsvpClosed}
                    onUpdateRSVP={handleUpdateRSVP}
                    syncing={syncing}
                    onUpdateEmployees={handleUpdateEmployees}
                    userRole={userRole}
                    selectedEmployeeId={selectedEmployeeId}
                    selectedDepartment={selectedDepartment}
                    isReadOnlyEmployee={isReadOnlyEmployee}
                  />
                ) : activeTab === 'booking' ? (
                  <EmployeeBooking
                    employees={employees}
                    rooms={rooms}
                    onBook={handleBooking}
                    onCancelBooking={handleCancelBooking}
                    syncing={syncing}
                    onUpdateRooms={handleUpdateRooms}
                    userRole={userRole}
                    selectedEmployeeId={selectedEmployeeId}
                    selectedDepartment={selectedDepartment}
                    isReadOnlyEmployee={isReadOnlyEmployee}
                  />
                ) : activeTab === 'directory' ? (
                  <RoomDirectory
                    employees={employees}
                    rooms={rooms}
                    onCancelBooking={handleCancelBooking}
                    userRole={userRole}
                    selectedEmployeeId={selectedEmployeeId}
                    selectedDepartment={selectedDepartment}
                    isReadOnlyEmployee={isReadOnlyEmployee}
                  />
                ) : activeTab === 'summary' ? (
                  <SummaryReport 
                    employees={employees} 
                    rooms={rooms}
                  />
                ) : (
                  <AdminDashboard
                    employees={employees}
                    rooms={rooms}
                    sheetConfig={sheetConfig}
                    accessToken={googleToken}
                    onRefreshAll={handleRefreshAll}
                    onUpdateRooms={handleUpdateRooms}
                    onUpdateEmployees={handleUpdateEmployees}
                    onResetAllBookings={handleResetAllBookings}
                    onCancelBooking={handleCancelBooking}
                    onSyncSheet={handleImportFromGoogleSheet}
                    onCleanSyncSheet={handleCleanImportFromGoogleSheet}
                    onSyncToSheet={handleSyncToSheet}
                    onClearSheetConfig={handleClearSheetConfig}
                    onChangePin={() => setIsChangingPin(true)}
                    rsvpClosed={rsvpClosed}
                    onToggleRSVPClosed={handleToggleRSVPClosed}
                    isOfflineMode={false}
                    onWipeAllEmployees={handleWipeAllEmployees}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </main>
      {/* Admin PIN Entry Modal */}
      {showPinEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border-4 border-indigo-50 shadow-[0_20px_50px_rgba(79,70,229,0.15)] max-w-sm w-full p-8 text-center relative overflow-hidden"
          >
            {/* Decorative elements for "cute" look */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full opacity-50 blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-50 rounded-full opacity-50 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 transform rotate-3">
                <Lock className="w-10 h-10 text-white" />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
                <h3 className="text-2xl font-black text-slate-800 font-display tracking-tight">ลงชื่อเข้าใช้แอดมิน</h3>
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
              </div>
              
              <p className="text-[11px] text-slate-400 mb-8 font-bold uppercase tracking-widest">Administrator Access Only</p>
              
              <div className="mb-8 relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                  placeholder="กรอกรหัสผ่าน"
                  autoFocus
                  className="w-full text-center text-2xl font-black py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-400 focus:bg-white focus:ring-0 transition-all placeholder:text-slate-200 tracking-[0.5em] shadow-inner"
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                >
                  {showPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => {
                    setShowPinEntry(false);
                    setAdminPin('');
                  }}
                  className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleVerifyPin}
                  className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  เข้าสู่ระบบ
                </button>
              </div>

              <button
                onClick={handleForgotPassword}
                disabled={syncing}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1.5 mx-auto transition-colors disabled:opacity-50"
              >
                <Mail className="w-3 h-3" />
                ลืมรหัสผ่าน? ส่งรหัสไปที่อีเมล
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Change PIN Modal */}
      {isChangingPin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border-4 border-amber-50 shadow-[0_20px_50px_rgba(245,158,11,0.15)] max-w-sm w-full p-8 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-50 rounded-full opacity-50 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-100 transform -rotate-3">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 font-display mb-2 text-center">เปลี่ยนรหัสผ่านแอดมิน</h3>
              <p className="text-[11px] text-slate-400 mb-8 font-bold text-center uppercase tracking-wider">Security Settings</p>
              
              <div className="space-y-4 mb-8">
                <div className="relative">
                  <input
                    type={showOldPin ? "text" : "password"}
                    value={oldPinInput}
                    onChange={(e) => setOldPinInput(e.target.value)}
                    placeholder="รหัสผ่านเดิม"
                    className="w-full py-4 px-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 focus:bg-white focus:ring-0 transition-all font-bold text-sm shadow-inner"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowOldPin(!showOldPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-amber-500 transition-colors"
                  >
                    {showOldPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="รหัสผ่านใหม่"
                    className="w-full py-4 px-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-amber-400 focus:bg-white focus:ring-0 transition-all font-bold text-sm shadow-inner"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-amber-500 transition-colors"
                  >
                    {showNewPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setIsChangingPin(false);
                    setOldPinInput('');
                    setNewPinInput('');
                  }}
                  className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleChangePin}
                  className="py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs transition-all shadow-xl shadow-amber-100 active:scale-95"
                >
                  บันทึกรหัสใหม่
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Employee Verification Confirmation Modal */}
      {showEmployeeVerifyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[110] animate-in fade-in duration-300">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border-4 border-indigo-50 shadow-[0_25px_60px_-15px_rgba(79,70,229,0.2)] max-w-md w-full p-8 text-center relative overflow-hidden"
          >
            {/* Decorative background gradients */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full opacity-50 blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-100 rounded-full opacity-50 blur-2xl"></div>

            <div className="relative z-10 space-y-6">
              {/* Shield/Verification icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto shadow-md shadow-indigo-100">
                <Shield className="w-8 h-8 text-white animate-pulse" />
              </div>

              {/* Title & Warning description */}
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 font-display tracking-tight">
                  ยืนยันข้อมูลและตัวตนพนักงาน 🔐
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  Employee Identity Verification
                </p>
              </div>

              {/* Chosen Employee Card Details */}
              {(() => {
                const emp = employees.find(e => e.id === selectedEmpIdInput);
                if (!emp) return null;
                return (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase">ชื่อพนักงาน</span>
                      <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">ID: {emp.id}</span>
                    </div>
                    <div className="font-extrabold text-slate-800 text-sm">{emp.name}</div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500 font-bold">
                      <div>ฝ่าย/แผนก: <span className="text-slate-700">{emp.department}</span></div>
                      <div>เพศ: <span className="text-slate-700">{emp.gender}</span></div>
                    </div>
                  </div>
                );
              })()}

              <div className="text-xs text-slate-500 text-left space-y-2 leading-relaxed">
                <p>
                  📍 <b>หลังจากกดยืนยันแล้ว:</b> อุปกรณ์นี้จะจดจำว่าคุณคือพนักงานคนนี้ในการเข้าใช้งาน และระบบจะทำการแสตมป์ยืนยันการเข้าใช้ระบบทันที
                </p>
                <p className="text-rose-600 font-bold">
                  ⚠️ สำคัญ: คุณจะไม่สามารถแก้ไขข้อมูลหรือสลับห้องให้เพื่อนพนักงานคนอื่นในภายหลังได้ (สามารถเปิดดูได้ในโหมดอ่านอย่างเดียวเท่านั้น)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmployeeVerifyModal(false)}
                  disabled={syncing}
                  className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVerificationAndLogin}
                  disabled={syncing}
                  className="py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 fill-emerald-500/20" />
                  )}
                  {syncing ? 'กำลังบันทึก...' : 'ยืนยันตัวตน'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
