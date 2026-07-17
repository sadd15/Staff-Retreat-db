import fs from 'fs';
let text = fs.readFileSync('src/types.ts', 'utf8');
text = text.replace(
  'mapPosition?: { x: number; y: number }; // Coordinates on resort map',
  'mapPosition?: { x: number; y: number }; // Coordinates on resort map\n  mapPositionZone1?: { x: number; y: number };\n  mapPositionZone2?: { x: number; y: number };'
);
fs.writeFileSync('src/types.ts', text);
console.log('Fixed types');
