import fs from 'fs';
let text = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

text = text.replace(
  /const mapRef = ref\(storage, 'resort-map\.jpg'\);[\s\S]*?await updateMapImageUrlInFirestore\(url\);[\s\S]*?alert\('อัปโหลดผังรีสอร์ตสำเร็จ'\);/m,
  `const field = editingMapZone === 'main' ? 'mapImageUrl' : editingMapZone === 'zone1' ? 'mapImageUrlZone1' : 'mapImageUrlZone2';
      const fileName = editingMapZone === 'main' ? 'resort-map.jpg' : editingMapZone === 'zone1' ? 'resort-map-zone1.jpg' : 'resort-map-zone2.jpg';
      const mapRef = ref(storage, fileName);
      await uploadBytes(mapRef, file);
      const url = await getDownloadURL(mapRef);
      await updateMapImageUrlInFirestore(url, field);
      alert('อัปโหลดแผนที่สำเร็จ');`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', text);
console.log('Fixed handleMapUpload');
