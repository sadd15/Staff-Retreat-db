import fs from 'fs';
// 1. Fix firebaseService.ts
let firebaseText = fs.readFileSync('src/lib/firebaseService.ts', 'utf8');
firebaseText = firebaseText.replace(
  'mapImageUrl?: string }) => void) {',
  'mapImageUrl?: string; mapImageUrlZone1?: string; mapImageUrlZone2?: string }) => void) {'
);
firebaseText = firebaseText.replace(
  'mapImageUrl: d.mapImageUrl',
  'mapImageUrl: d.mapImageUrl,\n        mapImageUrlZone1: d.mapImageUrlZone1,\n        mapImageUrlZone2: d.mapImageUrlZone2'
);
fs.writeFileSync('src/lib/firebaseService.ts', firebaseText);

// 2. Fix App.tsx
let appText = fs.readFileSync('src/App.tsx', 'utf8');
appText = appText.replace(
  'mapImageUrl: settings.mapImageUrl',
  'mapImageUrl: settings.mapImageUrl,\n          mapImageUrlZone1: settings.mapImageUrlZone1,\n          mapImageUrlZone2: settings.mapImageUrlZone2'
);

// Add props to EmployeeBooking
appText = appText.replace(
  'mapImageUrl={sheetConfig?.mapImageUrl}',
  'mapImageUrl={sheetConfig?.mapImageUrl}\n                    mapImageUrlZone1={sheetConfig?.mapImageUrlZone1}\n                    mapImageUrlZone2={sheetConfig?.mapImageUrlZone2}'
);

fs.writeFileSync('src/App.tsx', appText);

console.log('Fixed settings');
