import React, { useState, useMemo } from 'react';
import { Employee, Room } from '../types';
import { 
  Users, 
  Hotel, 
  Download, 
  Copy, 
  Search, 
  UserX, 
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toBlob, toPng } from 'html-to-image';

interface RoomDirectoryProps {
  employees: Employee[];
  rooms: Room[];
  onCancelBooking: (empId: string) => Promise<void>;
  userRole: 'visitor' | 'employee' | 'admin' | null;
  selectedEmployeeId: string | null;
  selectedDepartment: string | null;
  isReadOnlyEmployee?: boolean;
}

export default function RoomDirectory({ 
  employees, 
  rooms, 
  onCancelBooking,
  userRole,
  selectedEmployeeId,
  selectedDepartment,
  isReadOnlyEmployee = false,
}: RoomDirectoryProps) {
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [cancelingEmp, setCancelingEmp] = useState<Employee | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  // Calculate statistics (Simplified for this view)
  const stats = useMemo(() => {
    const occupantsByRoom: Record<string, Employee[]> = {};
    rooms.forEach(r => { occupantsByRoom[r.id] = []; });
    employees.forEach(e => {
      if (e.roomId && occupantsByRoom[e.roomId]) {
        occupantsByRoom[e.roomId].push(e);
      }
    });

    const bookedCount = employees.filter(e => e.roomId).length;
    const totalRooms = rooms.length;

    return {
      bookedCount,
      totalRooms,
      occupantsByRoom,
    };
  }, [employees, rooms]);

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
        new ClipboardItem({ [blob.type]: blob })
      ]);
      alert('คัดลอกรูปภาพแล้ว!');
    } catch (err) {
      console.error('Error copying image', err);
    }
  };

  const handleExportRoomsCsv = () => {
    const rows = [['ห้องพัก', 'ชื่อห้องพัก/สถานที่', 'ประเภท', 'เพศ', 'ความจุ', 'ผู้เข้าพัก', 'รายชื่อ']];
    sortedRooms.forEach((room, index) => {
      const occupants = stats.occupantsByRoom[room.id] || [];
      const names = occupants.map(o => `${o.name} (${o.department})`).join('; ');
      rows.push([
        `ห้องที่ ${index + 1}`,
        room.roomName || '-',
        room.roomType,
        room.genderRestriction,
        room.capacity.toString(),
        occupants.length.toString(),
        names
      ]);
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `room_directory_${Date.now()}.csv`;
    link.click();
  };

  const handleConfirmCancel = async () => {
    if (!cancelingEmp) return;
    setIsCanceling(true);
    try {
      await onCancelBooking(cancelingEmp.id);
      setCancelingEmp(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
            <Hotel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
              ทำเนียบห้องพัก (Room Directory)
            </h1>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              ตรวจสอบรายชื่อผู้เข้าพักในแต่ละห้อง และจัดการยกเลิกการจอง
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อพนักงาน / ฝ่าย..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={empSearchQuery}
              onChange={(e) => setEmpSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportRoomsCsv}
              className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all border border-emerald-100 shadow-3xs active:scale-95"
              title="ส่งออก CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleCopySummaryImage('room-directory-capture')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl transition-all shadow-md active:scale-95 font-bold text-xs"
            >
              <Copy className="w-4 h-4" />
              <span>คัดลอกรูปสรุป</span>
            </button>
          </div>
        </div>
      </div>

      <div id="room-directory-capture" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 relative">
        <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="h-8 w-1 bg-indigo-600 rounded-full" />
             <div>
               <h3 className="text-lg font-bold text-slate-800">สรุปการจัดห้องพักพนักงาน</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ข้อมูล ณ วันที่: {new Date().toLocaleString('th-TH')}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">จองแล้วทั้งหมด</p>
              <div className="flex items-center justify-end gap-2">
                <span className="text-xl font-bold text-indigo-600">{stats.bookedCount}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">คน</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="hidden md:table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-indigo-50 text-indigo-800 font-bold border-b border-indigo-100">
                <th className="px-3 py-2 border-r border-indigo-100 w-[160px]">ห้องพัก</th>
                <th className="px-3 py-2 border-r border-indigo-100 w-[140px]">ประเภท / เงื่อนไข</th>
                <th className="px-3 py-2 border-r border-indigo-100">รายชื่อผู้เข้าพัก</th>
                <th className="px-3 py-2 text-center whitespace-nowrap w-[120px]">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRooms.map((room, index) => {
                const occupants = stats.occupantsByRoom[room.id] || [];
                const count = occupants.length;
                const isFull = count >= room.capacity;
                const isEmpty = count === 0;

                return (
                  <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 align-top border-r border-slate-100">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-800 text-xs">ห้องที่ {room.sequence !== undefined ? room.sequence : index + 1}</span>
                        {room.roomName && (
                          <span className="font-medium text-indigo-700 text-xs whitespace-pre-wrap leading-tight mt-0.5 mb-0.5">{room.roomName}</span>
                        )}
                        {room.roomType !== 'Standard Twin' && (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{room.roomType}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top border-r border-slate-100">
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold w-fit border ${
                          room.genderRestriction === 'ชายล้วน' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          room.genderRestriction === 'หญิงล้วน' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {room.genderRestriction}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          จุ {room.capacity} คน
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top border-r border-slate-100">
                      {isEmpty ? (
                        <div className="text-slate-300 py-1 font-medium text-[11px]">ยังไม่มีการจอง</div>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {occupants.map(o => (
                            <div
                              key={o.id}
                              className="flex items-center gap-1.5 group/item"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                o.gender === 'หญิง' ? 'bg-rose-400' : 'bg-blue-400'
                              }`} />
                              <span className="font-bold text-slate-700 text-[11px]">{o.name}</span>
                              <span className="text-[9px] text-slate-400">({o.department})</span>
                              {!isReadOnlyEmployee && (userRole === 'admin' || (userRole === 'employee' && selectedEmployeeId === o.id)) && (
                                <button
                                  onClick={() => setCancelingEmp(o)}
                                  className="hide-in-export text-slate-300 hover:text-rose-500 transition-all p-0.5"
                                  title="ยกเลิกการจอง"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center align-top">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isFull ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          isEmpty ? 'bg-slate-50 text-slate-400 border-slate-100' : 
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {isFull ? 'เต็ม' : isEmpty ? 'ว่าง' : `${count}/${room.capacity}`}
                        </div>
                        <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-700 ${isFull ? 'bg-rose-400' : isEmpty ? 'bg-slate-200' : 'bg-emerald-400'}`} 
                            style={{ width: `${(count / room.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile View Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {sortedRooms.map((room, index) => {
              const occupants = stats.occupantsByRoom[room.id] || [];
              const count = occupants.length;
              const isFull = count >= room.capacity;
              const isEmpty = count === 0;

              return (
                <div key={room.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs">ห้องที่ {room.sequence !== undefined ? room.sequence : index + 1}</h4>
                      {room.roomName && (
                        <h5 className="font-medium text-indigo-700 text-xs whitespace-pre-wrap leading-tight mt-1">{room.roomName}</h5>
                      )}
                      {room.roomType !== 'Standard Twin' && (
                        <p className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded w-fit mt-1.5">{room.roomType}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                      room.genderRestriction === 'ชายล้วน' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      room.genderRestriction === 'หญิงล้วน' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {room.genderRestriction}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {occupants.map(o => (
                      <div key={o.id} className="flex items-center justify-between bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${o.gender === 'หญิง' ? 'bg-rose-400' : 'bg-blue-400'}`} />
                          <p className="text-[11px] font-bold text-slate-700">{o.name} <span className="text-[9px] text-slate-400">({o.department})</span></p>
                        </div>
                        {!isReadOnlyEmployee && (userRole === 'admin' || (userRole === 'employee' && selectedEmployeeId === o.id)) && (
                          <button onClick={() => setCancelingEmp(o)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {isEmpty && <p className="text-[10px] text-slate-300 italic py-1">ยังไม่มีการจอง</p>}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400">สถานะ: {count}/{room.capacity}</span>
                    <span className={`text-[9px] font-bold ${isFull ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {isFull ? 'เต็มแล้ว' : `ว่าง ${room.capacity - count}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 text-center border-t border-slate-50 pt-6">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">--- จบรายงานสรุปข้อมูลห้องพัก ---</p>
          <p className="text-[8px] text-slate-300 font-medium mt-1">วันที่ออกรายงาน: {new Date().toLocaleString('th-TH')}</p>
        </div>
      </div>


      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {cancelingEmp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isCanceling && setCancelingEmp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-display font-black text-slate-800 mb-2">ยืนยันการยกเลิกการจอง?</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                  คุณกำลังจะยกเลิกการจองห้องพักของ <span className="font-bold text-slate-800 underline decoration-rose-200">{cancelingEmp.name}</span> พนักงานจะสามารถจองห้องใหม่ได้ทันที
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setCancelingEmp(null)}
                    disabled={isCanceling}
                    className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={isCanceling}
                    className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCanceling && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {isCanceling ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิก'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
