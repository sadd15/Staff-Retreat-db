import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

text = text.replace(/iv>\s*<\/div>\s*\)\}/, '');
text = text.replace(/document\.body\n\s*\)\}\s*\{isAdmin && \(/, "document.body\n        )}\n\n      {isAdmin && (");

fs.writeFileSync('src/components/ResortMap.tsx', text);
