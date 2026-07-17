import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

if (!text.includes("import { createPortal }")) {
  text = text.replace("import React, { useState, useMemo } from 'react';", "import React, { useState, useMemo } from 'react';\nimport { createPortal } from 'react-dom';");
}

const searchStr = "{selectedRoom && (";
const searchIdx = text.lastIndexOf(searchStr);

if (searchIdx > -1) {
  // We know where it starts. Let's replace the wrapping.
  text = text.substring(0, searchIdx) + 
  `{selectedRoom && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setSelectedRoom(null)}>
            <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl border-4 border-indigo-50 flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4 sm:mb-6 shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <span className="text-xl sm:text-2xl">🏠</span>
                </div>
                <h3 className="font-black text-lg sm:text-xl text-slate-800">{selectedRoom.roomName}</h3>
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-slate-100 rounded-full">
                  <div className={\`w-2 h-2 rounded-full \${employees.filter(e => e.roomId === selectedRoom.id).length >= selectedRoom.capacity ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}\`} />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    พักแล้ว {employees.filter(e => e.roomId === selectedRoom.id).length} / {selectedRoom.capacity} คน
                  </span>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">รายชื่อผู้เข้าพัก</p>
                <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 space-y-2 sm:space-y-3">
                  {employees.filter(e => e.roomId === selectedRoom.id).map(emp => (
                    <div key={emp.id} className="flex items-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] sm:text-xs font-bold text-indigo-600 border border-indigo-100 shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{emp.name}</p>
                        <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 truncate">{emp.department}</p>
                      </div>
                    </div>
                  ))}
                  {employees.filter(e => e.roomId === selectedRoom.id).length === 0 && (
                    <div className="py-2 sm:py-4 text-center">
                      <p className="text-[9px] sm:text-xs font-bold text-slate-300 italic tracking-wide">ยังไม่มีการจองในห้องนี้</p>
                    </div>
                  )}
                </div>
              </div>
              <button 
                className="mt-5 sm:mt-8 w-full py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black transition-all shadow-xl shadow-indigo-100 active:scale-95 shrink-0" 
                onClick={() => setSelectedRoom(null)}
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>,
          document.body
        )}` + text.substring(text.lastIndexOf('เข้าใจแล้ว') + 50).replace(/<\/button>\s*<\/div>\s*<\/div>\s*\)\}/g, '');
        
  // Note: the regex replace above cleans up the old closing tags of the modal.
  // Because it is tricky to match perfectly with indices, I'll do a string replacement.
}

fs.writeFileSync('src/components/ResortMap.tsx', text);
