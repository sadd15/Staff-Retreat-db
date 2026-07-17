import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

// 1. First wrapper
text = text.replace(
  '<div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="booking-system-main">\n        <div className="p-6 sm:p-8">',
  '<div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="booking-system-main">\n        <div className="p-3 sm:p-6">'
);

// 2. Wizard header
text = text.replace(
  '<div className="border-b border-slate-100 bg-slate-50/50 p-6 rounded-2xl">',
  '<div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6 rounded-2xl">'
);

// 3. Wizard Main Area wrapper
text = text.replace(
  '{/* Wizard Main Area */}\n            <div className="p-6 sm:p-8">',
  '{/* Wizard Main Area */}\n            <div className="pt-6">'
);

// 4. Step 1 padding
text = text.replace(
  '{activeStep === 1 && (\n                <div className="space-y-6 animate-in fade-in duration-350 p-6">',
  '{activeStep === 1 && (\n                <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-350">'
);

// Let's also check for Step 2 and 3 padding.
// {activeStep === 2 && (
//   <div className="...">
text = text.replace(
  '{activeStep === 2 && (\n                <div className="space-y-8 animate-in fade-in duration-350 p-6">',
  '{activeStep === 2 && (\n                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-350">'
);

text = text.replace(
  '{activeStep === 3 && (\n                <div className="space-y-8 animate-in fade-in duration-350 p-6">',
  '{activeStep === 3 && (\n                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-350">'
);

fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
console.log("Padding fixed!");
