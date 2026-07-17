import fs from 'fs';
let text = fs.readFileSync('src/lib/firebaseService.ts', 'utf8');

text = text.replace(
  'mapPosition: d.mapPosition,',
  'mapPosition: d.mapPosition,\n        mapPositionZone1: d.mapPositionZone1,\n        mapPositionZone2: d.mapPositionZone2,'
);

fs.writeFileSync('src/lib/firebaseService.ts', text);
console.log('Fixed firebaseService');
