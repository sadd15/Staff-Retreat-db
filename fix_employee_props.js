import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

text = text.replace(
  '<ResortMap rooms={rooms} employees={employees} isAdmin={false} mapImageUrl={mapImageUrl} />',
  '<ResortMap rooms={rooms} employees={employees} isAdmin={false} mapImageUrl={mapImageUrl} mapImageUrlZone1={sheetConfig?.mapImageUrlZone1} mapImageUrlZone2={sheetConfig?.mapImageUrlZone2} />'
);

fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
console.log('Fixed EmployeeBooking ResortMap props');
