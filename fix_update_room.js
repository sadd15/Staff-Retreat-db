import fs from 'fs';

// 1. Fix firebaseService.ts
let fbText = fs.readFileSync('src/lib/firebaseService.ts', 'utf8');
fbText = fbText.replace(
  'export async function updateRoomPositionInFirestore(roomId: string, position: { x: number; y: number }): Promise<void> {\n  const roomRef = doc(db, \'rooms\', roomId);\n  await updateDoc(roomRef, {\n    mapPosition: position\n  });\n}',
  `export async function updateRoomPositionInFirestore(roomId: string, position?: { x: number; y: number }, positionZone1?: { x: number; y: number }, positionZone2?: { x: number; y: number }): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  const updateData: any = {};
  if (position !== undefined) updateData.mapPosition = position;
  if (positionZone1 !== undefined) updateData.mapPositionZone1 = positionZone1;
  if (positionZone2 !== undefined) updateData.mapPositionZone2 = positionZone2;
  if (Object.keys(updateData).length > 0) {
    await updateDoc(roomRef, updateData);
  }
}`
);
fs.writeFileSync('src/lib/firebaseService.ts', fbText);

// 2. Fix AdminDashboard.tsx
let adText = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
adText = adText.replace(
  /if \(updatedRoom\.mapPosition\) \{\n      try \{\n        await updateRoomPositionInFirestore\(updatedRoom\.id, updatedRoom\.mapPosition\);\n      \} catch \(err\) \{\n        console\.error\("Failed to save room position directly:", err\);\n      \}\n    \}/,
  `if (updatedRoom.mapPosition || updatedRoom.mapPositionZone1 || updatedRoom.mapPositionZone2) {
      try {
        await updateRoomPositionInFirestore(updatedRoom.id, updatedRoom.mapPosition, updatedRoom.mapPositionZone1, updatedRoom.mapPositionZone2);
      } catch (err) {
        console.error("Failed to save room position directly:", err);
      }
    }`
);
fs.writeFileSync('src/components/AdminDashboard.tsx', adText);
console.log('Fixed updateRoomPositionInFirestore');
