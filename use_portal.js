import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

if (!text.includes("import { createPortal }")) {
  text = text.replace("import React, { useState, useMemo } from 'react';", "import React, { useState, useMemo, useEffect } from 'react';\nimport { createPortal } from 'react-dom';");
}

const modalStart = text.indexOf("{/* Detail Modal */}");
const adminSection = text.indexOf("{isAdmin && (");
const modalEnd = adminSection - 16; // Just before </div>

let modalText = text.substring(modalStart, modalEnd);

// Remove the modal from the map container
text = text.replace(modalText, "");

// Add portal logic
const portalModal = `
      {/* Detail Modal (Portaled) */}
      {selectedRoom && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setSelectedRoom(null)}>
          <div className="bg-white p-5 sm:p-6 rounded-3xl w-full max-w-[320px] sm:max-w-sm max-h-[85vh] shadow-2xl border-4 border-indigo-50 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-3 sm:mb-4 shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <span className="text-lg sm:text-xl">🏠</span>
              </div>
              <h3 className="font-black text-base sm:text-lg text-slate-800">{selectedRoom.roomName}</h3>
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
                <div className={\`w-1.5 h-1.5 rounded-full \${employees.filter(e => e.roomId === selectedRoom.id).length >= selectedRoom.capacity ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}\`} />
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  พักแล้ว {employees.filter(e => e.roomId === selectedRoom.id).length} / {selectedRoom.capacity} คน
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 px-1 -mx-1">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">รายชื่อผู้เข้าพัก</p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                {employees.filter(e => e.roomId === selectedRoom.id).map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-indigo-600 border border-indigo-100 shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                      <p className="text-[9px] font-medium text-slate-400 truncate">{emp.department}</p>
                    </div>
                  </div>
                ))}
                {employees.filter(e => e.roomId === selectedRoom.id).length === 0 && (
                  <div className="py-2 text-center">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-300 italic tracking-wide">ยังไม่มีการจองในห้องนี้</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 shrink-0 mt-auto">
              <button 
                className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-lg shadow-indigo-100 active:scale-95" 
                onClick={() => setSelectedRoom(null)}
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
`;

// Insert the new portal modal right before the return statement's closing </div> of ResortMap
text = text.replace("      {isAdmin && (", portalModal + "      {isAdmin && (");

fs.writeFileSync('src/components/ResortMap.tsx', text);
