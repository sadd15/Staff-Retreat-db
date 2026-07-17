import fs from 'fs';

const text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

// We just need to know what tags are open
let cleanText = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
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
  
  if (fullTag.endsWith('/>')) continue;
  if (['br', 'hr', 'img', 'input', 'void', '1', 'string', 'number'].includes(tagName)) continue;
  
  if (fullTag.startsWith('</')) {
    if (stack.length > 0 && stack[stack.length - 1].tagName === tagName) {
      stack.pop();
    } else {
      console.log(`Mismatch at line ${lineNum}: expected </${stack.length > 0 ? stack[stack.length - 1].tagName : 'nothing'}> but got </${tagName}>`);
      // Try to recover by popping until we find it
      let foundIndex = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === tagName) {
          foundIndex = i;
          break;
        }
      }
      if (foundIndex !== -1) {
        console.log(`Recovering by popping ${stack.length - 1 - foundIndex} elements`);
        stack.length = foundIndex; // pop up to found
      }
    }
  } else {
    stack.push({ tagName, line: lineNum });
  }
}

console.log("Unmatched at end:");
console.log(stack.filter(s => s.tagName === 'div'));
