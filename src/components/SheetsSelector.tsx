import React, { useState, useEffect } from 'react';
import { listSpreadsheets, createSpreadsheet, setupSpreadsheetTabs } from '../lib/sheetsService';
import { SheetConfig } from '../types';
import { FileSpreadsheet, Plus, Search, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';

interface SheetsSelectorProps {
  accessToken: string;
  onSelect: (config: SheetConfig) => void;
}

export default function SheetsSelector({ accessToken, onSelect }: SheetsSelectorProps) {
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [customTitle, setCustomTitle] = useState('ระบบจองห้องพักทริปบริษัท');
  const [manualSheetId, setManualSheetId] = useState('1e36OFOh6KBkDHIojH3L3wv9xfJqXp1FXm1RFgnR0A0A');

  const loadSheets = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listSpreadsheets(accessToken);
      setSheets(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ไม่สามารถดึงรายชื่อ Google Sheets ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
  }, [accessToken]);

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    
    setCreating(true);
    setError(null);
    try {
      const config = await createSpreadsheet(accessToken, customTitle.trim());
      // Setup tabs (Employees and Rooms)
      await setupSpreadsheetTabs(accessToken, config.spreadsheetId);
      onSelect(config);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ไม่สามารถสร้าง Google Sheet ใหม่ได้');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectExisting = async (sheetId: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      // Setup tabs to make sure they exist
      await setupSpreadsheetTabs(accessToken, sheetId);
      
      const config: SheetConfig = {
        spreadsheetId: sheetId,
        spreadsheetName: name,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      };
      onSelect(config);
    } catch (err: any) {
      console.error(err);
      setError(`ไม่สามารถเชื่อมต่อไฟล์นี้ได้: ${err.message || 'โปรดตรวจสอบสิทธิ์การเข้าถึง'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSheets = sheets.filter(sheet => 
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10" id="sheets-selector-container">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100 shadow-xs">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-800 tracking-tight">
          เชื่อมโยงตารางข้อมูล Google Sheets
        </h1>
        <p className="text-slate-500 mt-2.5 max-w-lg mx-auto text-xs sm:text-sm leading-relaxed">
          เลือกสเปรดชีตจัดห้องพักที่มีอยู่ หรือจะสร้างสเปรดชีตไฟล์ใหม่เพื่อเริ่มต้นทำรายการจองทันที ระบบจะสร้างและจัดแจงตารางพนักงานและผังห้องพักให้ครบถ้วน
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8 hover:border-emerald-300 transition-all" id="manual-sheet-id-card">
        <h2 className="text-base sm:text-lg font-display font-bold text-slate-800 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
          เชื่อมต่อด้วย ID ไฟล์ Google Sheet ของคุณ
        </h2>
        <p className="text-slate-500 text-[11px] sm:text-xs mb-4 leading-relaxed">
          นำเข้าข้อมูลพนักงานจากไฟล์ Google Sheets ของคุณโดยระบุ ID ของสเปรดชีต เช่น <span className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">1e36OFOh6KBkDHIojH3L3wv9xfJqXp1FXm1RFgnR0A0A</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={manualSheetId}
            onChange={(e) => setManualSheetId(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono text-slate-700"
            placeholder="ใส่ ID ไฟล์ Google Sheet ของคุณที่นี่..."
          />
          <button
            onClick={() => {
              if (!manualSheetId.trim()) {
                setError('กรุณากรอก ID สเปรดชีต');
                return;
              }
              handleSelectExisting(manualSheetId.trim(), 'สเปรดชีตระบุด้วยตนเอง');
            }}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'เชื่อมต่อไฟล์ชีต'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl mb-8 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <p className="font-bold text-xs sm:text-sm">การเชื่อมต่อระบบขัดข้อง</p>
            <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Create New */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all" id="create-new-sheet-card">
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500 shrink-0" />
              สร้างสเปรดชีตใหม่
            </h2>
            <p className="text-slate-500 text-[11px] sm:text-xs mb-6 leading-relaxed">
              เหมาะสำหรับการเริ่มต้นจากศูนย์ ระบบจะติดตั้งสคริปต์หน้าโครงสร้างและแชร์ไฟล์ไปที่บัญชี Google Drive ของคุณโดยอัตโนมัติ
            </p>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  ชื่อไฟล์ Google Sheets
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium text-slate-700"
                  placeholder="เช่น ระบบจองที่พักทริปบริษัท 2026"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={creating || loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-100"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังสร้างและเตรียมไฟล์ชีต...
                  </>
                ) : (
                  <>
                    สร้างไฟล์ชีตใหม่
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed">
            * สิทธิ์การใช้งาน Google API จะถูกใช้เฉพาะกับสเปรดชีตที่คุณเลือกจองห้องพักในแอปพลิเคชันนี้เท่านั้น
          </div>
        </div>

        {/* Right: Select Existing */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-all" id="select-existing-sheet-card">
          <h2 className="text-base sm:text-lg font-display font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-500 shrink-0" />
            เลือกสเปรดชีตเดิม
          </h2>
          <p className="text-slate-500 text-[11px] sm:text-xs mb-6 leading-relaxed">
            เลือกเชื่อมต่อตารางที่เคยทำค้างไว้จาก Google Drive ของคุณทันที โดยไม่ต้องตั้งค่าใหม่
          </p>

          <div className="relative mb-3.5">
            <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสเปรดชีต..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
            />
          </div>

          <div className="flex-1 max-h-[180px] overflow-y-auto space-y-2 pr-1" id="sheets-list">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <span className="text-[11px]">กำลังโหลดไฟล์ชีตของคุณ...</span>
              </div>
            ) : filteredSheets.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-[11px] italic">
                {searchQuery ? 'ไม่พบไฟล์ที่ค้นหา' : 'ไม่พบไฟล์ Google Sheets ใน Drive ของคุณ'}
              </div>
            ) : (
              filteredSheets.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => handleSelectExisting(sheet.id, sheet.name)}
                  className="w-full text-left p-3 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 rounded-xl transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                      {sheet.name}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono mt-1">
                      แก้ไขล่าสุด: {new Date(sheet.modifiedTime).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0 transform group-hover:translate-x-0.5 transition-all" />
                </button>
              ))
            )}
          </div>

          <button
            onClick={loadSheets}
            disabled={loading}
            className="mt-6 w-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
          >
            รีเฟรชรายชื่อสเปรดชีต
          </button>
        </div>
      </div>
    </div>
  );
}
