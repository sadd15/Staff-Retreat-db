import React from 'react';
import { SheetConfig } from '../types';
import { LogOut, RefreshCw, FileSpreadsheet, ExternalLink, Shield, Users, CalendarCheck, Laptop } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  sheetConfig: SheetConfig | null;
  onLogout: () => void;
  onRefresh: () => void;
  syncing: boolean;
  activeTab: 'rsvp' | 'booking' | 'admin';
  setActiveTab: (tab: 'rsvp' | 'booking' | 'admin') => void;
  isOfflineMode?: boolean;
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
}: HeaderProps) {
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
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-2xl border border-slate-200" id="header-nav-tabs">
              <button
                onClick={() => setActiveTab('rsvp')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
                  activeTab === 'rsvp'
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                เช็คชื่อ (RSVP)
              </button>
              <button
                onClick={() => setActiveTab('booking')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
                  activeTab === 'booking'
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                จองห้องพัก
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                แดชบอร์ดแอดมิน
              </button>
            </div>
          )}

          {/* Auth Status & Controls */}
          <div className="flex items-center gap-3">
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
          <div className="flex sm:hidden py-2 border-t border-slate-100 gap-1.5" id="header-nav-tabs-mobile">
            <button
              onClick={() => setActiveTab('rsvp')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'rsvp'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 bg-slate-100'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              เช็คชื่อ (RSVP)
            </button>
            <button
              onClick={() => setActiveTab('booking')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'booking'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              จองห้องพัก
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              แอดมิน
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
