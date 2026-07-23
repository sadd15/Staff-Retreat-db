import React, { useMemo } from 'react';
import { Employee, Room } from '../types';
import { 
  Users, 
  Bed, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  FileText, 
  Download, 
  Copy,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from './Toast';
import { toBlob, toPng } from 'html-to-image';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface SummaryReportProps {
  employees: Employee[];
  rooms: Room[];
}

export default function SummaryReport({ employees, rooms }: SummaryReportProps) {
  const [splitSize, setSplitSize] = React.useState<number>(15);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const parseRoomSortKey = (room: Room) => {
        const name = room.roomName || '';
        const id = room.id || '';
        const seq = room.sequence !== undefined ? Number(room.sequence) : 9999;
        const floor = room.floor !== undefined ? Number(room.floor) : 1;

        let houseNumber = 9999;
        let slashNumber = 0;

        const patternMatch = name.match(/(\d+)(?:\/(\d+))?/);
        if (patternMatch) {
          houseNumber = Number(patternMatch[1]);
          if (patternMatch[2]) {
            slashNumber = Number(patternMatch[2]);
          }
        } else {
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

      if (aKey.sequence !== bKey.sequence) {
        return aKey.sequence - bKey.sequence;
      }

      if (aKey.houseNumber !== bKey.houseNumber) {
        return aKey.houseNumber - bKey.houseNumber;
      }

      if (aKey.slashNumber !== bKey.slashNumber) {
        return aKey.slashNumber - bKey.slashNumber;
      }

      if (aKey.floor !== bKey.floor) {
        return aKey.floor - bKey.floor;
      }

      return a.id.localeCompare(b.id, 'en', { numeric: true });
    });
  }, [rooms]);

  const chunks = useMemo(() => {
    const res = [];
    for (let i = 0; i < sortedRooms.length; i += splitSize) {
      res.push(sortedRooms.slice(i, i + splitSize));
    }
    return res;
  }, [sortedRooms, splitSize]);

  // Calculate statistics (Exact logic from AdminDashboard)
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const bookedCount = employees.filter(e => e.roomId).length;
    const unbookedCount = totalEmployees - bookedCount;
    const totalRooms = rooms.length;
    
    const occupantsByRoom: Record<string, Employee[]> = {};
    rooms.forEach(r => { occupantsByRoom[r.id] = []; });
    employees.forEach(e => {
      if (e.roomId && occupantsByRoom[e.roomId]) {
        occupantsByRoom[e.roomId].push(e);
      }
    });

    let totalCapCount = 0;
    let totalOccupiedBeds = 0;

    rooms.forEach(room => {
      const occs = occupantsByRoom[room.id] || [];
      totalCapCount += room.capacity;
      totalOccupiedBeds += occs.length;
    });

    const roomFillingPercentage = totalCapCount > 0 ? Math.round((totalOccupiedBeds / totalCapCount) * 100) : 0;

    return {
      totalEmployees,
      bookedCount,
      unbookedCount,
      totalRooms,
      totalCapacity: totalCapCount,
      roomFillingPercentage,
      occupantsByRoom,
    };
  }, [employees, rooms]);

  // Generate trend data (Simulated for visualization)
  const trendData = useMemo(() => {
    const today = new Date();
    const data = [];
    const currentRate = stats.roomFillingPercentage;
    
    // Create a 7-day trend leading up to current rate
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      let rate = currentRate;
      if (i > 0) {
        // Backtrack with some randomness to simulate growth
        const steps = i;
        rate = Math.max(10, currentRate - (steps * 8) - (Math.random() * 5));
      }
      
      data.push({
        date: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        occupancy: Math.round(rate),
      });
    }
    return data;
  }, [stats.roomFillingPercentage]);

  const filterExport = (node: HTMLElement | any) => {
    if (node?.classList?.contains('hide-in-export')) return false;
    return true;
  };

  const handleCopySummaryImage = async (elementId: string, customPixelRatio = 2) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const toastId = toast.loading('กำลังสร้างรูปภาพสรุปความชัดสูงพิเศษ...', 15000);
    try {
      const blob = await toBlob(element, { backgroundColor: '#ffffff', pixelRatio: customPixelRatio, filter: filterExport });
      if (!blob) throw new Error('Failed to create blob');
      
      // Attempt to copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      toast.dismiss(toastId);
      toast.success('คัดลอกรูปภาพสรุปสำเร็จ! คุณสามารถกดวาง (Paste) ในแอป Line ได้ทันที 📸');
    } catch (err) {
      console.error('Error copying image to clipboard', err);
      // Fallback: download the image instead of failing
      try {
        const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: customPixelRatio, filter: filterExport });
        const link = document.createElement('a');
        link.download = `Room-Summary-Export-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        toast.dismiss(toastId);
        toast.warning('คัดลอกลง Clipboard ไม่สำเร็จ (ไม่มีโฟกัสหน้าจอ) ระบบจึงสลับเป็นดาวน์โหลดไฟล์ภาพความชัดสูงให้แทนโดยอัตโนมัติ! 💾');
      } catch (fallbackErr) {
        toast.dismiss(toastId);
        toast.error('ไม่สามารถบันทึกหรือคัดลอกรูปภาพได้ กรุณาคลิกหน้าจอหนึ่งครั้งแล้วลองอีกครั้ง ❌');
      }
    }
  };

  const handleDownloadSummaryImage = async (elementId: string, filename: string, customPixelRatio = 2) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const toastId = toast.loading('กำลังจัดเตรียมและดาวน์โหลดไฟล์รูปภาพความชัดสูง...', 15000);
    try {
      const dataUrl = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: customPixelRatio, filter: filterExport });
      const link = document.createElement('a');
      link.download = `${filename}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.dismiss(toastId);
      toast.success('ดาวน์โหลดรูปภาพสรุปความชัดสูงเสร็จเรียบร้อยแล้ว! 💾');
    } catch (err) {
      console.error('Error downloading image', err);
      toast.dismiss(toastId);
      toast.error('ดาวน์โหลดรูปภาพล้มเหลว กรุณาลองใหม่อีกครั้ง ❌');
    }
  };

  const handleExportRoomsCsv = () => {
    try {
      const rows = [
        ['กลุ่มห้องพัก', 'ชื่อห้องพัก/สถานที่', 'ประเภทห้อง', 'จำนวนผู้เข้าพัก (คน)', 'รายชื่อผู้เข้าพัก']
      ];

      rooms.forEach(room => {
        const occupants = stats.occupantsByRoom[room.id] || [];
        const occupantsStr = occupants.map(o => `${o.name} (${o.department})`).join(', ');
        rows.push([
          room.id,
          room.roomName || '-',
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
      toast.success('ส่งออกรายงานสรุปข้อมูลห้องพัก CSV เรียบร้อยแล้ว! 📊');
    } catch (err) {
      toast.error('ส่งออกไฟล์ล้มเหลว ❌');
    }
  };

  const handleExportPendingRoomCsv = () => {
    try {
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
      toast.success('ส่งออกรายชื่อพนักงานรอจัดห้องพัก CSV เรียบร้อยแล้ว! 📊');
    } catch (err) {
      toast.error('ส่งออกไฟล์ล้มเหลว ❌');
    }
  };

  const handleExportRsvpCsv = () => {
    try {
      const rows = [
        ['ลำดับ', 'ชื่อ - สกุล', 'ฝ่าย', 'สถานะการตอบรับ']
      ];

      [...employees]
        .sort((a, b) => {
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
      link.setAttribute("download", `rsvp_status_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ส่งออกรายงานสรุปสถานะการตอบรับ (RSVP) CSV เรียบร้อยแล้ว! 📊');
    } catch (err) {
      toast.error('ส่งออกไฟล์ล้มเหลว ❌');
    }
  };

  return (
    <div className="space-y-4 pb-10 max-w-7xl mx-auto px-4 py-3 font-sans">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3" id="summary-banner">
        <div>
          <h1 className="text-lg sm:text-xl font-display font-extrabold text-slate-800 leading-tight">
            รายงานสรุปข้อมูลทริปประจำปี
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-2xl">
            รายงานสรุปข้อมูลครบถ้วน ทั้งภาพรวมการเดินทาง รายชื่อผู้พักรายห้อง และรายชื่อผู้ที่ยังไม่ได้จัดห้อง
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleCopySummaryImage('summary-table-container')}
            className="hide-in-export group bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 active:scale-95 border border-indigo-100 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            คัดลอกรูปภาพ
          </button>
          <button
            onClick={() => handleDownloadSummaryImage('summary-table-container', 'Trip-Summary-All')}
            className="hide-in-export group bg-slate-800 text-white hover:bg-slate-900 px-4 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            ดาวน์โหลด
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-4 overflow-x-auto shadow-xs relative">
        <div id="summary-table-container" className="min-w-[300px] sm:min-w-[700px] p-4 sm:p-6 bg-white w-full border border-slate-100 shadow-sm rounded-xl">
          <div className="mb-5 text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-800 font-display uppercase tracking-wider">รายงานสรุปทริปประจำปี</h2>
            <p className="text-xs text-slate-500 mt-1">ข้อมูล ณ วันที่: {new Date().toLocaleString('th-TH')}</p>
          </div>

          {/* 1. Executive Summary & Department Breakdown */}
          <div id="summary-section-1" className="mb-5 p-3 sm:p-4 mx-0 sm:-mx-4 bg-white rounded-xl relative group hover:ring-2 hover:ring-slate-100 transition-all">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</span>
                สรุปภาพรวมผู้ร่วมเดินทางและการเข้าร่วมรายแผนก
              </h3>
              <button onClick={() => handleCopySummaryImage('summary-section-1')} className="hide-in-export opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-opacity cursor-pointer">
                <Copy className="w-3 h-3" /> คัดลอกส่วนนี้
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 mb-0.5">พนักงานทั้งหมด</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800">{employees.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-emerald-600 mb-1">ตอบรับ (ไป)</p>
                <p className="text-2xl font-black text-emerald-700">{employees.filter(e => e.rsvpStatus === 'ไป').length}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-rose-600 mb-1">ปฏิเสธ (ไม่ไป)</p>
                <p className="text-2xl font-black text-rose-700">{employees.filter(e => e.rsvpStatus === 'ไม่ไป').length}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-amber-600 mb-1">รอยืนยัน</p>
                <p className="text-2xl font-black text-amber-700">{employees.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length}</p>
              </div>
            </div>

            {/* Occupancy Trend Chart */}
            <div className="mb-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-700">แนวโน้มการจองห้องพัก (Occupancy Trend)</h4>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="occupancy" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorOccupancy)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center font-medium italic">
                * ข้อมูลจำลองแสดงแนวโน้มการเติบโตของการจองห้องพักในช่วง 7 วันที่ผ่านมา
              </p>
            </div>

            <h4 className="text-sm font-bold text-slate-700 mb-3 border-t border-slate-100 pt-4">แยกตามฝ่าย</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(
                employees.reduce((acc, emp) => {
                  const dept = emp.department || 'ไม่ระบุ';
                  if (!acc[dept]) acc[dept] = { total: 0, going: 0 };
                  acc[dept].total++;
                  if (emp.rsvpStatus === 'ไป') acc[dept].going++;
                  return acc;
                }, {} as Record<string, {total: number, going: number}>)
              ).sort((a, b) => a[0].localeCompare(b[0])).map(([dept, data]) => (
                <div key={dept} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <span className="font-bold text-slate-700 text-sm">{dept}</span>
                  <div className="text-xs font-medium text-slate-500">
                    ไป <span className="text-emerald-600 font-bold">{data.going}</span> / {data.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Room Assignments */}
          <div id="summary-section-3" className="mb-8 p-4 sm:p-6 mx-0 sm:-mx-6 bg-white rounded-2xl relative group hover:ring-2 hover:ring-slate-100 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                รายชื่อผู้เข้าพักและการจัดห้องพัก (รายละเอียด)
              </h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity hide-in-export">
                <button onClick={handleExportRoomsCsv} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded hover:bg-emerald-100 transition-colors">
                  <Download className="w-3 h-3" /> ส่งออก CSV
                </button>
                <button onClick={() => handleCopySummaryImage('summary-section-3')} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded hover:bg-indigo-100 transition-colors">
                  <Copy className="w-3 h-3" /> คัดลอกส่วนนี้
                </button>
              </div>
            </div>
            
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] sm:text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-center border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0">
                ห้องทั้งหมด: <span className="font-bold text-slate-800">{stats.totalRooms} ห้อง</span>
              </div>
              <div className="text-center border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0">
                มีผู้เข้าพักแล้ว: <span className="font-bold text-emerald-600">{stats.bookedCount} คน</span>
              </div>
              <div className="text-center">
                ยังไม่มีห้อง: <span className="font-bold text-amber-600">{employees.filter(e => e.rsvpStatus === 'ไป' && !e.roomId).length} คน</span>
              </div>
            </div>

            {/* 📸 Split High-Resolution (4K) Export Option */}
            <div className="mb-5 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/80 hide-in-export">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b border-indigo-100/50">
                <div>
                  <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    📸 ฟีเจอร์แบ่งรูปภาพความชัดสูงพิเศษ (4K Split Copy) สำหรับส่ง Line
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                    หมดปัญหารูปภาพเบลอเมื่อข้อมูลยาวเกินไป! สามารถเลือกคัดลอกหรือดาวน์โหลดทีละพาร์ท (พาร์ทละ {splitSize} ห้อง) ภาพที่ได้จะคมชัดระดับ 4K เห็นตัวหนังสือและรายชื่อชัดเจน 100%
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-extrabold text-slate-500 whitespace-nowrap">จำนวนห้องต่อ 1 รูป:</span>
                  <div className="flex rounded-lg bg-white p-0.5 border border-slate-200">
                    {[10, 15, 20, 25].map(size => (
                      <button
                        key={size}
                        onClick={() => setSplitSize(size)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                          splitSize === size 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {size} ห้อง
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Render clickable segments */}
              {chunks.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-2 font-medium">ยังไม่มีข้อมูลห้องพักสำหรับแบ่งส่วน</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {chunks.map((chunkRooms, chunkIdx) => {
                    const startIdx = chunkIdx * splitSize + 1;
                    const endIdx = Math.min((chunkIdx + 1) * splitSize, sortedRooms.length);
                    return (
                      <div 
                        key={chunkIdx}
                        className="bg-white border border-indigo-100/60 p-3 rounded-xl flex flex-col justify-between hover:shadow-xs hover:border-indigo-200/80 transition-all"
                      >
                        <div className="mb-2">
                          <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            ส่วนที่ {chunkIdx + 1} / {chunks.length}
                          </span>
                          <div className="text-[11px] font-black text-slate-700 mt-1">
                            ห้องที่ {startIdx} - {endIdx}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            รวม {chunkRooms.length} ห้องพัก
                          </div>
                        </div>
                        <div className="flex gap-1 border-t border-slate-50 pt-2 mt-1">
                          <button
                            onClick={() => handleCopySummaryImage(`summary-split-part-${chunkIdx}`, 3.5)}
                            className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] py-1.5 px-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            <Copy className="w-2.5 h-2.5 shrink-0" /> คัดลอกรูป
                          </button>
                          <button
                            onClick={() => handleDownloadSummaryImage(`summary-split-part-${chunkIdx}`, `Room-Part-${chunkIdx + 1}`, 3.5)}
                            className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] py-1.5 px-1.5 rounded-lg transition-all active:scale-95 border border-slate-200 cursor-pointer"
                          >
                            <Download className="w-2.5 h-2.5 shrink-0" /> โหลดรูป
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-800 font-bold border-b border-indigo-100">
                    <th className="px-3 py-2 border-r border-indigo-100 w-1 whitespace-nowrap">ลำดับที่</th>
                    <th className="px-3 py-2 border-r border-indigo-100 w-1 whitespace-nowrap">ประเภท / เงื่อนไข</th>
                    <th className="px-3 py-2">รายชื่อผู้เข้าพัก</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">
                        ยังไม่มีข้อมูลห้องพัก
                      </td>
                    </tr>
                  ) : (
                    sortedRooms.map((room, index) => {
                      const occupants = stats.occupantsByRoom[room.id] || [];
                      const displaySeq = room.sequence !== undefined ? room.sequence : (index + 1);
                      return (
                        <tr key={room.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
                          <td className="px-3 py-2.5 border-r border-slate-100 bg-slate-50/20 align-top text-left">
                            <div className="font-bold text-slate-800 mb-0.5 text-xs whitespace-nowrap">ลำดับที่ {displaySeq}</div>
                            {room.roomName && (
                              <div className="font-medium text-indigo-700 text-xs whitespace-nowrap leading-relaxed mb-0.5">{room.roomName}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-100 align-top">
                            <div className="flex flex-col gap-1 min-w-max">
                              <div className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  ความจุ {room.capacity} คน
                                </span>
                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  ผู้เข้าพัก {occupants.length}/{room.capacity} คน
                                </span>
                                {room.genderRestriction !== 'ไม่จำกัด' && (
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    room.genderRestriction === 'ชายล้วน' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    room.genderRestriction === 'หญิงล้วน' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {room.genderRestriction}
                                  </span>
                                )}
                              </div>
                              {room.notes && room.notes.trim() && (
                                <div className="text-[10px] text-indigo-900 bg-indigo-50/50 border border-indigo-100 px-1.5 py-1 rounded-lg font-medium mt-1 whitespace-nowrap leading-tight">
                                  <span className="font-extrabold text-[9px] text-indigo-700 block mb-0.5 uppercase tracking-wider">เงื่อนไข/หมายเหตุ:</span>
                                  {room.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 align-top text-left">
                            {occupants.length === 0 ? (
                              <span className="text-slate-300 italic text-xs">ยังไม่มีการจอง</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {occupants.map(o => (
                                  <div key={o.id} className="text-slate-700 text-xs flex items-center gap-2 whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                    <span className="font-bold">{o.name}</span>
                                    <span className="text-slate-400">({o.department})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Missing / Pending action lists */}
          <div id="summary-section-4" className="mb-5 p-3 sm:p-4 mx-0 sm:-mx-4 bg-white rounded-xl relative group hover:ring-2 hover:ring-slate-100 transition-all">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center text-xs">3</span>
                ผู้ที่แจ้งว่าไปแต่ยังไม่ได้จัดห้อง
              </h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity hide-in-export">
                <button onClick={handleExportPendingRoomCsv} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors cursor-pointer">
                  <Download className="w-3 h-3" /> ส่งออก CSV
                </button>
                <button onClick={() => handleCopySummaryImage('summary-section-4')} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors cursor-pointer">
                  <Copy className="w-3 h-3" /> คัดลอกส่วนนี้
                </button>
              </div>
            </div>
            {employees.filter(e => e.rsvpStatus === 'ไป' && !e.roomId).length === 0 ? (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-center text-sm font-bold border border-emerald-100">
                ทุกคนที่แจ้งว่าไป ได้รับการจัดห้องครบแล้ว!
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-rose-50">
                    <tr className="text-rose-800 font-bold">
                      <th className="px-3 py-2 w-16 text-center border-b border-r border-rose-100">ลำดับ</th>
                      <th className="px-3 py-2 border-b border-r border-rose-100">ชื่อ - สกุล</th>
                      <th className="px-3 py-2 border-b border-rose-100">ฝ่าย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(e => e.rsvpStatus === 'ไป' && !e.roomId)
                      .sort((a, b) => a.department.localeCompare(b.department))
                      .map((emp, index) => (
                        <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-500 font-medium border-r border-slate-100">{index + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-700 border-r border-slate-100">{emp.name}</td>
                          <td className="px-3 py-2 text-slate-600">{emp.department}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. Complete RSVP List */}
          <div id="summary-section-5" className="mb-5 p-3 sm:p-4 mx-0 sm:-mx-4 bg-white rounded-xl relative group hover:ring-2 hover:ring-slate-100 transition-all">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">4</span>
                สถานะการตอบรับของพนักงานทั้งหมด
              </h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity hide-in-export">
                <button onClick={handleExportRsvpCsv} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors cursor-pointer">
                  <Download className="w-3 h-3" /> ส่งออก CSV
                </button>
                <button onClick={() => handleCopySummaryImage('summary-section-5')} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors cursor-pointer">
                  <Copy className="w-3 h-3" /> คัดลอกส่วนนี้
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-indigo-50">
                  <tr className="text-indigo-800 font-bold">
                    <th className="px-3 py-2 w-16 text-center border-b border-r border-indigo-100">ลำดับ</th>
                    <th className="px-3 py-2 border-b border-r border-indigo-100">ชื่อ - สกุล</th>
                    <th className="px-3 py-2 border-b border-r border-indigo-100">ฝ่าย</th>
                    <th className="px-3 py-2 border-b border-indigo-100">สถานะการตอบรับ</th>
                  </tr>
                </thead>
                <tbody>
                  {[...employees]
                    .sort((a, b) => {
                      const statusOrder = { 'ไป': 1, 'ไม่ไป': 2, 'ยังไม่ระบุ': 3, '': 3 };
                      const aStatus = statusOrder[(a.rsvpStatus as keyof typeof statusOrder) || ''] || 4;
                      const bStatus = statusOrder[(b.rsvpStatus as keyof typeof statusOrder) || ''] || 4;
                      if (aStatus !== bStatus) return aStatus - bStatus;
                      return a.department.localeCompare(b.department);
                    })
                    .map((emp, index) => (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-center text-slate-500 font-medium border-r border-slate-100">{index + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-700 border-r border-slate-100">{emp.name}</td>
                      <td className="px-3 py-2 text-slate-600 border-r border-slate-100">{emp.department}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          emp.rsvpStatus === 'ไป' ? 'bg-emerald-50 text-emerald-600' :
                          emp.rsvpStatus === 'ไม่ไป' ? 'bg-rose-50 text-rose-600' :
                          'bg-slate-50 text-slate-400'
                        }`}>
                          {emp.rsvpStatus || 'ยังไม่ระบุ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 📸 Hidden containers for 4K Split Copy Image Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden', height: 0 }}>
        {chunks.map((chunkRooms, chunkIdx) => {
          const startIdx = chunkIdx * splitSize + 1;
          const endIdx = Math.min((chunkIdx + 1) * splitSize, sortedRooms.length);
          const containerId = `summary-split-part-${chunkIdx}`;
          
          return (
            <div 
              key={chunkIdx}
              id={containerId}
              style={{ width: '800px' }}
              className="p-8 bg-white"
            >
              <div className="mb-6 text-center border-b-2 border-indigo-100 pb-5">
                <h2 className="text-xl font-extrabold text-slate-800 tracking-wide font-display">
                  รายงานสรุปการจัดห้องพัก (ส่วนที่ {chunkIdx + 1} / {chunks.length})
                </h2>
                <div className="mt-2">
                  <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 inline-block">
                    ห้องพักลำดับที่ {startIdx} - {endIdx} (จากทั้งหมด {sortedRooms.length} ห้อง)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2.5">ข้อมูล ณ วันที่: {new Date().toLocaleString('th-TH')}</p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-50 text-indigo-800 font-bold border-b border-indigo-100">
                      <th className="px-3 py-2.5 border-r border-indigo-100 w-1 whitespace-nowrap text-xs font-bold">ลำดับที่</th>
                      <th className="px-3 py-2.5 border-r border-indigo-100 w-1 whitespace-nowrap text-xs font-bold">ประเภท / เงื่อนไข</th>
                      <th className="px-3 py-2.5 text-xs font-bold">รายชื่อผู้เข้าพัก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunkRooms.map((room) => {
                      const occupants = stats.occupantsByRoom[room.id] || [];
                      const displaySeq = room.sequence !== undefined ? room.sequence : (sortedRooms.indexOf(room) + 1);
                      return (
                        <tr key={room.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-3 py-2.5 border-r border-slate-100 bg-slate-50/20 align-top text-left">
                            <div className="font-bold text-slate-800 mb-0.5 text-xs whitespace-nowrap">ลำดับที่ {displaySeq}</div>
                            {room.roomName && (
                              <div className="font-medium text-indigo-700 text-xs whitespace-nowrap leading-relaxed">{room.roomName}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-100 align-top">
                            <div className="flex flex-col gap-1 min-w-max">
                              <div className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  ความจุ {room.capacity} คน
                                </span>
                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  ผู้เข้าพัก {occupants.length}/{room.capacity} คน
                                </span>
                                {room.genderRestriction !== 'ไม่จำกัด' && (
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    room.genderRestriction === 'ชายล้วน' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    room.genderRestriction === 'หญิงล้วน' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {room.genderRestriction}
                                  </span>
                                )}
                              </div>
                              {room.notes && room.notes.trim() && (
                                <div className="text-[10px] text-indigo-900 bg-indigo-50/50 border border-indigo-100 px-1.5 py-1 rounded-lg font-medium mt-1 whitespace-nowrap leading-tight">
                                  <span className="font-extrabold text-[9px] text-indigo-700 block mb-0.5 uppercase tracking-wider">เงื่อนไข/หมายเหตุ:</span>
                                  {room.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top text-left">
                            {occupants.length === 0 ? (
                              <span className="text-slate-300 italic text-[11px]">ยังไม่มีการจอง</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {occupants.map(o => (
                                  <div key={o.id} className="text-slate-700 text-xs flex items-center gap-2 whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                    <span className="font-bold">{o.name}</span>
                                    <span className="text-slate-400">({o.department})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 text-center flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>ความละเอียดภาพสูงพิเศษ (Split Clear Image 4K)</span>
                <span>ระบบจัดแต่งห้องพักผู้เดินทาง</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
