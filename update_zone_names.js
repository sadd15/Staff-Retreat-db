import fs from 'fs';

// 1. Update ResortMap.tsx
let mapText = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

// Change label names
mapText = mapText.replace(/ผังรวม/g, 'โซนรีสอร์ท');

// Fix fallback logic for mapImageUrl
// Replace:
// const currentMapUrl = activeZone === 'main' 
//    ? mapImageUrl 
//    : activeZone === 'zone1' 
//      ? (mapImageUrlZone1 || mapImageUrl) 
//      : (mapImageUrlZone2 || mapImageUrl);
mapText = mapText.replace(
  /const currentMapUrl = activeZone === 'main'[\s\S]*?\: \(mapImageUrlZone2 \|\| mapImageUrl\);/,
  `const currentMapUrl = activeZone === 'main' 
    ? mapImageUrl 
    : activeZone === 'zone1' 
      ? mapImageUrlZone1 
      : mapImageUrlZone2;`
);

fs.writeFileSync('src/components/ResortMap.tsx', mapText);

// 2. Update AdminDashboard.tsx
let adminText = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
adminText = adminText.replace(/ผังรวม/g, 'โซนรีสอร์ท');

// The upload section has this:
// ? 'ผังรวม' : editingMapZone === 'zone1' ? 'โซน 1' : 'โซน 2'
// Let's make sure that's updated (it should be caught by global replace, but we double check)

fs.writeFileSync('src/components/AdminDashboard.tsx', adminText);
console.log('Fixed zone names and fallback logic');
