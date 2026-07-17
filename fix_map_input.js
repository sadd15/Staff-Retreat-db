import fs from 'fs';
let text = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

text = text.replace(
  "const [mapUrlInput, setMapUrlInput] = useState('');",
  `const [mapUrlInput, setMapUrlInput] = useState('');

  useEffect(() => {
    if (editingMapZone === 'main') {
      setMapUrlInput(sheetConfig?.mapImageUrl || '');
    } else if (editingMapZone === 'zone1') {
      setMapUrlInput(sheetConfig?.mapImageUrlZone1 || '');
    } else if (editingMapZone === 'zone2') {
      setMapUrlInput(sheetConfig?.mapImageUrlZone2 || '');
    }
  }, [editingMapZone, sheetConfig?.mapImageUrl, sheetConfig?.mapImageUrlZone1, sheetConfig?.mapImageUrlZone2]);`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', text);
console.log('Fixed mapUrlInput');
