import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

const oldImg = 'className="w-full h-full pointer-events-none select-none block"';
const newImg = 'className="w-full h-auto pointer-events-none select-none block"';
text = text.replace(oldImg, newImg);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("Image patched back to h-auto");
