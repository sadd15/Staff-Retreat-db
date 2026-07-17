import fs from 'fs';
const text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

const startIdx = text.indexOf('id="booking-system-main"');
const endIdx = text.indexOf('{/* Create New Room Modal */}');

let part = text.substring(startIdx, endIdx);

const opens = (part.match(/<div\b/g) || []).length;
const closes = (part.match(/<\/div>/g) || []).length;

console.log("Opens:", opens, "Closes:", closes);
