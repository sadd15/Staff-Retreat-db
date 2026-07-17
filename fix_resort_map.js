import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

// 1. In optimistic positions check:
text = text.replace(
  'if (r.mapPosition && next[r.id]) {',
  `const pos = activeZone === 'main' ? r.mapPosition : activeZone === 'zone1' ? r.mapPositionZone1 : r.mapPositionZone2;
        if (pos && next[r.id]) {`
);
text = text.replace(
  'if (Math.abs(r.mapPosition.x - next[r.id].x) < 0.1 && Math.abs(r.mapPosition.y - next[r.id].y) < 0.1) {',
  'if (Math.abs(pos.x - next[r.id].x) < 0.1 && Math.abs(pos.y - next[r.id].y) < 0.1) {'
);

// 2. In handleStop:
text = text.replace(
  /await onUpdateRoom\(\{[\s\S]*?\.\.\.room,[\s\S]*?mapPosition: \{ x: clampedX, y: clampedY \},[\s\S]*?\}\);/,
  `const updatePayload: any = { ...room };
        if (activeZone === 'main') updatePayload.mapPosition = { x: clampedX, y: clampedY };
        else if (activeZone === 'zone1') updatePayload.mapPositionZone1 = { x: clampedX, y: clampedY };
        else if (activeZone === 'zone2') updatePayload.mapPositionZone2 = { x: clampedX, y: clampedY };
        await onUpdateRoom(updatePayload);`
);

// 3. In basePosition
text = text.replace(
  'const basePosition = room.mapPosition || {',
  `const basePosition = (activeZone === 'main' ? room.mapPosition : activeZone === 'zone1' ? room.mapPositionZone1 : room.mapPositionZone2) || {`
);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log('Fixed ResortMap positions');
