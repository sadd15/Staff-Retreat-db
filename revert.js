import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

text = text.replace(/const \[showWizardModal, setShowWizardModal\] = useState\(false\);\n\n  const handleMapPinClick = [\s\S]*?  \/\/ Auto-initialize selectedMainEmpId/m, "const [viewMode, setViewMode] = useState<'wizard' | 'map'>('wizard');\n\n  // Auto-initialize selectedMainEmpId");

const mapSectionRe = /<div className="border-b border-slate-100 p-4 sm:p-6 bg-slate-50\/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">[\s\S]*?<\/div>\n        <div className="p-4 sm:p-6 bg-slate-50\/30">\n          <ResortMap rooms=\{rooms\} employees=\{employees\} isAdmin=\{false\} mapImageUrl=\{mapImageUrl\} onRoomSelect=\{handleMapPinClick\} \/>\n        <\/div>\n      <\/div>\n\n      \{\/\* The Step-by-Step Interactive Booking Wizard \*\/\}\n      \{showWizardModal && \(\n        <div className="fixed inset-0 z-\[100\] flex items-center justify-center p-2 sm:p-4 bg-slate-900\/60 backdrop-blur-sm animate-in fade-in duration-200">\n          <div className="bg-white rounded-3xl sm:rounded-\[2rem\] border border-slate-200 shadow-2xl w-full max-w-5xl max-h-\[95vh\] flex flex-col relative overflow-hidden" id="booking-system-main">\n            <button onClick=\{\(\) => setShowWizardModal\(false\)\} className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 z-10 transition-colors">\n              <X className="w-4 h-4 sm:w-5 sm:h-5" \/>\n            <\/button>\n            <div className="overflow-y-auto p-4 sm:p-8 w-full h-full">/m;

const mapSectionReplacement = `<div className="border-b border-slate-100 p-4 sm:p-6 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-extrabold text-slate-800">แผนที่ที่พัก (Resort Map)</h2>
              <p className="text-slate-400 text-xs mt-0.5">ตรวจสอบตำแหน่งห้องพักและดูสถานะการจอง</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 bg-slate-50/30">
          <ResortMap rooms={rooms} employees={employees} isAdmin={false} mapImageUrl={mapImageUrl} />
        </div>
      </div>

      {/* The Step-by-Step Interactive Booking Wizard */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="booking-system-main">
        <div className="p-6 sm:p-8">`;

text = text.replace(mapSectionRe, mapSectionReplacement);

// We also need to remove the two closing divs at the end of the step-by-step interactive booking wizard block.
// Wait, I changed it to end with:
/*
            </div>
          </div>
        </div>
      )}

      {/* Create New Room Modal * /}
*/
const endRe = /            <\/div>\n          <\/div>\n        <\/div>\n      \)\}\n\n      \{\/\* Create New Room Modal \*\/\}/g;
const endReplacement = `            </div>
          </div>
      </div>

      {/* Create New Room Modal */}`;

text = text.replace(endRe, endReplacement);

fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
