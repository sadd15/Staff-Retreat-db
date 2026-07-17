import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

text = text.replace(
  '<div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="booking-system-main">\n        <div className="p-3 sm:p-6">',
  '<div className="bg-white rounded-xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="booking-system-main">\n        <div className="p-0 sm:p-6">'
);

text = text.replace(
  '<div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6 rounded-2xl">',
  '<div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6 sm:rounded-2xl">'
);

text = text.replace(
  '{/* Wizard Main Area */}\n            <div className="pt-6">',
  '{/* Wizard Main Area */}\n            <div className="pt-4 sm:pt-6 px-4 sm:px-0">'
);

fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
console.log("Mobile padding fixed!");
