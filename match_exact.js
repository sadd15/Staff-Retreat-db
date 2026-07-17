import fs from 'fs';
const text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

let stack = [];
let lines = text.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div(\s|>)/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  
  for(let j=0; j<opens; j++) stack.push(i+1);
  for(let j=0; j<closes; j++) {
    if(stack.length === 0) console.log("Extra closing div at line", i+1);
    else stack.pop();
  }
}
console.log("Unclosed divs opened at lines:", stack);
