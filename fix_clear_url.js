import fs from 'fs';
let text = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

text = text.replace(
  "const handleSaveMapUrl = async () => {\n    if (!mapUrlInput.trim()) return;\n    try {",
  `const handleSaveMapUrl = async () => {
    try {`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', text);
console.log('Fixed clear url');
