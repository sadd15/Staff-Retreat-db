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
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { toBlob, toPng } from 'html-to-image';

interface SummaryReportProps {
  employees: Employee[];
  rooms: Room[];
}

export default function SummaryReport({ employees, rooms }: SummaryReportProps) {
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
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 py-6 font-sans">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="summary-banner">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-800 leading-tight">
            รายงานสรุปข้อมูลทริปประจำปี
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed max-w-2xl">
            รายงานสรุปข้อมูลครบถ้วน ทั้งภาพรวมการเดินทาง รายชื่อผู้พักรายห้อง และรายชื่อผู้ที่ยังไม่ได้จัดห้อง
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleCopySummaryImage('summary-table-container')}
            className="hide-in-export group bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 active:scale-95 border border-indigo-100"
          >
            <Copy className="w-3.5 h-3.5" />
            คัดลอกรูปภาพ
          </button>
          <button
            onClick={() => handleDownloadSummaryImage('summary-table-container', 'Trip-Summary-All')}
            className="hide-in-export group bg-slate-800 text-white hover:bg-slate-900 px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            ดาวน์โหลด
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-2 sm:p-4 md:p-8 overflow-x-auto shadow-xs relative">
        <div id="summary-table-container" className="min-w-[300px] sm:min-w-[700px] p-4 sm:p-8 bg-white max-w-4xl mx-auto border border-slate-100 shadow-sm rounded-2xl">
          <div className="mb-8 text-center border-b border-slate-200 pb-6">
            <h2 className="text-2xl font-bold text-slate-800 font-display uppercase tracking-wider">รายงานสรุปทริปประจำปี</h2>
            <p className="text-sm text-slate-500 mt-2">ข้อมูล ณ วันที่: {new Date().toLocaleString('th-TH')}</p>
          </div>

          {/* 1. Executive Summary & Department Breakdown */}
          <div id="summary-section-1" className="mb-8 p-4 sm:p-6 mx-0 sm:-mx-6 bg-white rounded-2xl relative group hover:ring-2 hover:ring-slate-100 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</span>
                สรุปภาพรวมผู้ร่วมเดินทางและการเข้าร่วมรายแผนก
              </h3>
              <button onClick={() => handleCopySummaryImage('summary-section-1')} className="hide-in-export opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded hover:bg-indigo-100 transition-opacity">
                <Copy className="w-3 h-3" /> คัดลอกส่วนนี้
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-slate-500 mb-1">พนักงานทั้งหมด</p>
                <p className="text-2xl font-black text-slate-800">{employees.length}</p>
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

            <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="px-4 py-3 border-r border-slate-200 w-1/4">ห้องพัก</th>
                    <th className="px-4 py-3 border-r border-slate-200 w-[15%] text-center">ความจุ</th>
                    <th className="px-4 py-3">รายชื่อผู้เข้าพัก</th>
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
                    rooms.map((room, index) => {
                      const occupants = stats.occupantsByRoom[room.id] || [];
                      return (
                        <tr key={room.id} className="hover:bg-slate-50 border-b border-slate-200 last:border-b-0">
                          <td className="px-4 py-3 border-r border-slate-200 font-bold whitespace-nowrap bg-slate-50/30">
                            ห้องที่ {index + 1}
                            <div className="text-[10px] text-slate-400 font-normal mt-1">{room.roomType}</div>
                            <div className="text-[10px] text-indigo-500 font-normal mt-0.5">{room.genderRestriction}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-200 text-center font-medium text-slate-600 bg-slate-50/30">
                            {occupants.length} / {room.capacity}
                          </td>
                          <td className="px-4 py-3">
                            {occupants.length === 0 ? (
                              <span className="text-slate-400 italic text-xs">ว่างเปล่า</span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {occupants.map(o => (
                                  <div key={o.id} className="text-slate-700 text-xs flex items-center gap-2">
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
          <div id="summary-section-4" className="mb-8 p-4 sm:p-6 mx-0 sm:-mx-6 bg-white rounded-2xl relative group hover:ring-2 hover:ring-slate-100 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center text-xs">3</span>
                ผู้ที่แจ้งว่าไปแต่ยังไม่ได้จัดห้อง
              </h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity hide-in-export">
                <button onClick={handleExportPendingRoomCsv} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded hover:bg-emerald-100 transition-colors">
                  <Download className="w-3 h-3" /> ส่งออก CSV
                </button>
                <button onClick={() => handleCopySummaryImage('summary-section-4')} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded hover:bg-indigo-100 transition-colors">
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
          <div id="summary-section-5" className="mb-8 p-4 sm:p-6 mx-0 sm:-mx-6 bg-white rounded-2xl relative group hover:ring-2 hover:ring-slate-100 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">4</span>
                สถานะการตอบรับของพนักงานทั้งหมด
              </h3>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity hide-in-export">
                <button onClick={handleExportRsvpCsv} className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded hover:bg-emerald-100 transition-colors">
                  <Download className="w-3 h-3" /> ส่งออก CSV
                </button>
                <button onClick={() => handleCopySummaryImage('summary-section-5')} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded hover:bg-indigo-100 transition-colors">
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
    </div>
  );
}
