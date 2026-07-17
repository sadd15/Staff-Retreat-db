import fs from 'fs';

// 1. ResortMap.tsx
let mapText = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');
mapText = mapText.replace(
  'onRoomSelect?: (room: Room) => void;',
  'onRoomSelect?: (room: Room) => void;\n  onActiveZoneChange?: (zone: \'main\' | \'zone1\' | \'zone2\') => void;'
);
mapText = mapText.replace(
  'const [activeZone, setActiveZone] = useState<\'main\' | \'zone1\' | \'zone2\'>(\'main\');',
  `const [activeZone, setLocalActiveZone] = useState<'main' | 'zone1' | 'zone2'>('main');
  const setActiveZone = (zone: 'main' | 'zone1' | 'zone2') => {
    setLocalActiveZone(zone);
    if (onActiveZoneChange) onActiveZoneChange(zone);
  };`
);
fs.writeFileSync('src/components/ResortMap.tsx', mapText);

// 2. AdminDashboard.tsx
let adminText = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Remove the buttons
adminText = adminText.replace(
  /<div className="flex gap-2 mb-4">\s*<button onClick=\{\(\) => setEditingMapZone\('main'\)\} className=\{`px-4 py-2 rounded-full text-xs font-bold transition-colors \$\{editingMapZone === 'main' \? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'\}`\}>โซนรีสอร์ท<\/button>\s*<button onClick=\{\(\) => setEditingMapZone\('zone1'\)\} className=\{`px-4 py-2 rounded-full text-xs font-bold transition-colors \$\{editingMapZone === 'zone1' \? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'\}`\}>โซน 1<\/button>\s*<button onClick=\{\(\) => setEditingMapZone\('zone2'\)\} className=\{`px-4 py-2 rounded-full text-xs font-bold transition-colors \$\{editingMapZone === 'zone2' \? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'\}`\}>โซน 2<\/button>\s*<\/div>/,
  ''
);

// Fix the labels
adminText = adminText.replace(
  /อัปโหลดรูปแผนที่สำหรับ \{editingMapZone === 'main' \? 'โซนรีสอร์ท' : editingMapZone === 'zone1' \? 'โซน 1' : 'โซน 2'\} \(JPG\/PNG\):/g,
  'อัปโหลดรูปแผนที่สำหรับ {editingMapZone === \'main\' ? \'โซนรีสอร์ท\' : editingMapZone === \'zone1\' ? \'โซนโรงแรม 1\' : \'โซนโรงแรม 2\'} (JPG/PNG):'
);

// Pass onActiveZoneChange
adminText = adminText.replace(
  /<ResortMap rooms=\{rooms\} employees=\{employees\} onUpdateRoom=\{handleUpdateRoom\} isAdmin=\{true\} mapImageUrl=\{sheetConfig\?\.mapImageUrl\} mapImageUrlZone1=\{sheetConfig\?\.mapImageUrlZone1\} mapImageUrlZone2=\{sheetConfig\?\.mapImageUrlZone2\} \/>/,
  `<ResortMap rooms={rooms} employees={employees} onUpdateRoom={handleUpdateRoom} isAdmin={true} mapImageUrl={sheetConfig?.mapImageUrl} mapImageUrlZone1={sheetConfig?.mapImageUrlZone1} mapImageUrlZone2={sheetConfig?.mapImageUrlZone2} onActiveZoneChange={setEditingMapZone} />`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', adminText);
console.log('Fixed zone sync');
