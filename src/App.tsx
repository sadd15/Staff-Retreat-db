import React, { useState, useEffect } from 'react';
import { Employee, Room, SheetConfig } from './types';
import Header from './components/Header';
import EmployeeBooking from './components/EmployeeBooking';
import AdminDashboard from './components/AdminDashboard';
import TripRSVP from './components/TripRSVP';
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
  syncFirestoreToSheet,
  resetAllBookingsInFirestore,
  clearSheetConfig,
  getAdminPin,
  updateAdminPin
} from './lib/firebaseService';
import { sendAdminPinEmail } from './lib/emailService';
import { Loader2, AlertCircle, FileSpreadsheet, Sparkles, ChevronRight, Shield, Eye, EyeOff, KeyRound, Lock, Heart, Mail } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'rsvp' | 'booking' | 'admin'>('rsvp');
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
      // Auto-sync back to sheet if connected
      if (sheetConfig?.spreadsheetId) {
        const updatedEmployees = employees.map(e => allIds.includes(e.id) ? { ...e, roomId, rsvpStatus: 'ไป' as const } : e);
        syncFirestoreToSheet(sheetConfig.spreadsheetId, updatedEmployees, rooms).catch(e => console.error("Auto-sync failed", e));
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
      // Auto-sync back to sheet if connected
      if (sheetConfig?.spreadsheetId) {
        const updatedEmployees = employees.map(e => e.id === employeeId ? { ...e, roomId: '' } : e);
        syncFirestoreToSheet(sheetConfig.spreadsheetId, updatedEmployees, rooms).catch(e => console.error("Auto-sync failed", e));
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
      // Auto-sync back to sheet if connected
      if (sheetConfig?.spreadsheetId) {
        syncFirestoreToSheet(sheetConfig.spreadsheetId, employees, updatedRooms).catch(e => console.error("Auto-sync failed", e));
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
      // Auto-sync back to sheet if connected
      if (sheetConfig?.spreadsheetId) {
        syncFirestoreToSheet(sheetConfig.spreadsheetId, updatedEmployees, rooms).catch(e => console.error("Auto-sync failed", e));
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'rsvp' ? (
                  <TripRSVP
                    employees={employees}
                    rsvpClosed={rsvpClosed}
                    onUpdateRSVP={handleUpdateRSVP}
                    syncing={syncing}
                    onUpdateEmployees={handleUpdateEmployees}
                  />
                ) : activeTab === 'booking' ? (
                  <EmployeeBooking
                    employees={employees}
                    rooms={rooms}
                    onBook={handleBooking}
                    onCancelBooking={handleCancelBooking}
                    syncing={syncing}
                    onUpdateRooms={handleUpdateRooms}
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
                    onSyncToSheet={handleSyncToSheet}
                    onClearSheetConfig={handleClearSheetConfig}
                    onChangePin={() => setIsChangingPin(true)}
                    rsvpClosed={rsvpClosed}
                    onToggleRSVPClosed={handleToggleRSVPClosed}
                    isOfflineMode={false}
                  />
                )}
              </motion.div>
            </AnimatePresence>
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
    </div>
  );
}
