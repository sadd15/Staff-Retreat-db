import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');
console.log(text.includes('function ResortMap'));
console.log(text.includes('export default function ResortMap'));
