import fs from 'fs';
const text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

// Strip out comments and strings to avoid false positives
let cleanText = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
// rough strip of strings
cleanText = cleanText.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/`[\s\S]*?`/g, '``');

const regex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
let match;
let stack = [];

let lineNum = 1;
let lastIndex = 0;

while ((match = regex.exec(cleanText)) !== null) {
  const substr = cleanText.substring(lastIndex, match.index);
  lineNum += (substr.match(/\n/g) || []).length;
  lastIndex = match.index;
  
  const fullTag = match[0];
  const tagName = match[1];
  
  // Ignore self-closing
  if (fullTag.endsWith('/>')) continue;
  // Ignore br, hr, img, input
  if (['br', 'hr', 'img', 'input'].includes(tagName)) continue;
  
  if (fullTag.startsWith('</')) {
    const top = stack.pop();
    if (!top || top.tagName !== tagName) {
       console.log(`Mismatch at line ${lineNum}: expected </${top ? top.tagName : 'nothing'}> but got </${tagName}>`);
    }
  } else {
    stack.push({ tagName, line: lineNum });
  }
}

console.log("Unmatched at end:");
console.log(stack);
