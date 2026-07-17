import fs from 'fs';
const text = fs.readFileSync('tree.txt', 'utf8');
const lines = text.split('\n');

let openDivs = [];
for (const line of lines) {
  if (line.includes('<div>')) openDivs.push(line);
  else if (line.includes('</div>')) openDivs.pop();
}

console.log("Unmatched divs:", openDivs);
