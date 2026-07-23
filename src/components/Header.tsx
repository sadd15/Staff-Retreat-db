import React from 'react';
import { SheetConfig } from '../types';
import { LogOut, RefreshCw, FileSpreadsheet, ExternalLink, Shield, Users, CalendarCheck, FileText, Hotel, ArrowLeftRight, UserCheck, Building2, MessageSquare, Globe, MessageSquareHeart } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  sheetConfig: SheetConfig | null;
  onLogout: () => void;
  onRefresh: () => void;
  syncing: boolean;
  activeTab: 'rsvp' | 'booking' | 'directory' | 'summary' | 'feedback' | 'admin';
  setActiveTab: (tab: 'rsvp' | 'booking' | 'directory' | 'summary' | 'feedback' | 'admin') => void;
  isOfflineMode?: boolean;
  userRole: 'visitor' | 'employee' | 'admin' | null;
  selectedEmployeeName: string | null;
  selectedDepartment: string | null;
  onSwitchRole: () => void;
  isReadOnlyEmployee?: boolean;
  employeeViewMode?: 'website' | 'survey_only' | null;
  onToggleEmployeeMode?: () => void;
}

export default function Header({
  user,
  sheetConfig,
  onLogout,
  onRefresh,
  syncing,
  activeTab,
  setActiveTab,
  isOfflineMode = false,
  userRole,
  selectedEmployeeName,
  selectedDepartment,
  onSwitchRole,
  isReadOnlyEmployee = false,
  employeeViewMode = null,
  onToggleEmployeeMode,
}: HeaderProps) {
  let tabs: { id: 'rsvp' | 'booking' | 'directory' | 'summary' | 'feedback' | 'admin'; label: string; icon: any }[] = [
    { id: 'rsvp', label: 'เช็คชื่อ (RSVP)', icon: CalendarCheck },
    { id: 'booking', label: 'จองห้องพัก', icon: Users },
    { id: 'directory', label: 'ตารางจองรายห้อง', icon: Hotel },
    { id: 'summary', label: 'สรุปข้อมูล', icon: FileText },
    { id: 'feedback', label: 'แบบสอบถาม & ความเห็น', icon: MessageSquare },
    ...(userRole === 'admin' ? [{ id: 'admin' as const, label: 'แดชบอร์ดแอดมิน', icon: Shield }] : []),
  ];

  // If user is employee and chose 'website' mode, explicitly hide the feedback menu tab
  if (userRole === 'employee' && employeeViewMode === 'website') {
    tabs = tabs.filter(t => t.id !== 'feedback');
  }

  // If user is employee and chose 'survey_only' mode, show only the feedback tab (single-page mode)
  if (userRole === 'employee' && employeeViewMode === 'survey_only') {
    tabs = tabs.filter(t => t.id === 'feedback');
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-sm sm:text-base font-display font-bold text-slate-800 tracking-tight leading-none mb-1">
                ระบบจองที่พักพนักงาน (Staff Retreat)
              </h1>
              <div className="flex items-center gap-1.5">
                <span className={`flex h-2 w-2 rounded-full animate-pulse ${isOfflineMode ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase font-semibold">
                  {isOfflineMode ? 'โหมดออฟไลน์ • บันทึกข้อมูลในเบราว์เซอร์' : 'ซิงค์ข้อมูลกับ Google Sheets สำเร็จ'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tab Buttons */}
          {sheetConfig && (
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-hidden" id="header-nav-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/40'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Auth Status & Controls */}
          <div className="flex items-center gap-3">
            {/* User Role Badge & Switch Mode Button */}
            {userRole && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-2xl shadow-3xs">
                {userRole === 'visitor' && (
                  <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    👀 ผู้เยี่ยมชม
                  </span>
                )}
                {userRole === 'employee' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1 max-w-[150px] sm:max-w-none truncate" title={`${selectedEmployeeName} (${selectedDepartment})`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isReadOnlyEmployee ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      👤 {selectedEmployeeName || 'พนักงาน'} <span className="text-[9px] text-slate-400 font-normal">({selectedDepartment})</span>
                      {isReadOnlyEmployee && (
                        <span className="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.2 rounded-md shrink-0 ml-1">
                          🔒 อ่านอย่างเดียว
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {onToggleEmployeeMode && employeeViewMode && (
                        <button
                          onClick={onToggleEmployeeMode}
                          className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer shadow-3xs shrink-0 ${
                            employeeViewMode === 'survey_only'
                              ? 'bg-fuchsia-100 text-fuchsia-950 border border-fuchsia-300 hover:bg-fuchsia-200'
                              : 'bg-indigo-100 text-indigo-950 border border-indigo-300 hover:bg-indigo-200'
                          }`}
                          title="คลิกเพื่อสลับโหมดการเข้าชม (เข้าชมเว็บ ↔ ตอบแบบสอบถาม)"
                        >
                          {employeeViewMode === 'survey_only' ? (
                            <>
                              <MessageSquareHeart className="w-2.5 h-2.5 text-fuchsia-700" />
                              <span>โหมดแบบสอบถาม</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-2.5 h-2.5 text-indigo-700" />
                              <span>โหมดเข้าชมเว็บ</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={onSwitchRole}
                        className="text-[9px] sm:text-[10px] px-2 py-0.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200 rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer shadow-3xs active:scale-95 shrink-0 whitespace-nowrap"
                        title="สลับไปเลือกพนักงานท่านอื่น (Switch Employee)"
                      >
                        <span>👥</span>
                        <span>สลับ</span>
                      </button>
                    </div>
                  </div>
                )}
                {userRole === 'admin' && (
                  <span className="text-[10px] font-black text-amber-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    👑 ผู้ดูแลระบบ
                  </span>
                )}

                <button
                  onClick={onSwitchRole}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all ml-1"
                  title="สลับโหมด / ออกจากโหมดนี้"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {sheetConfig && activeTab === 'admin' && (
              <div className="hidden md:flex items-center gap-2 bg-emerald-50/50 border border-emerald-100/60 px-3 py-1.5 rounded-xl">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0 max-w-40 lg:max-w-64">
                  <p className="text-[10px] text-emerald-800 font-medium truncate leading-none mb-0.5">
                    ข้อมูลเชื่อมกับ Google Sheets
                  </p>
                  <a
                    href={sheetConfig.spreadsheetUrl || '#'}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold hover:underline flex items-center gap-1 truncate"
                  >
                    <span>{sheetConfig.spreadsheetName || 'เปิดไฟล์สเปรดชีต'}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            {user && (
              <div className="flex items-center gap-2" id="user-profile-widget">
                <button
                  onClick={onRefresh}
                  disabled={syncing}
                  className={`p-2 rounded-xl border border-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all ${
                    syncing ? 'bg-slate-50' : 'bg-white'
                  }`}
                  title="รีเฟรชซิงค์ข้อมูลกับ Google Sheets"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-indigo-600' : ''}`} />
                </button>

                <div className="hidden xs:flex flex-col items-end text-right">
                  <p className="text-xs font-semibold text-slate-700 leading-none truncate max-w-28 sm:max-w-40">
                    {user.displayName}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono truncate max-w-28 sm:max-w-40">
                    {user.email}
                  </p>
                </div>

                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-100 object-cover shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 uppercase">
                    {(user.displayName || 'U').charAt(0)}
                  </div>
                )}

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                  title="ออกจากระบบ Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Small screen layout: show navigation buttons under header */}
        {sheetConfig && (
          <div className="flex sm:hidden py-2 border-t border-slate-100 gap-1.5 overflow-x-auto no-scrollbar" id="header-nav-tabs-mobile">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 bg-slate-100'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
