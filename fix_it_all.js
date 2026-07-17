import fs from 'fs';
const text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');
const lines = text.split('\n');

let stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('{/* Wizard Header & Step Nav */}')) stack.push('START_WIZARD');
  if (line.includes('{/* Create New Room Modal */}')) stack.push('END_WIZARD');
}

console.log("Found:", stack);
