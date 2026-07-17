import fs from 'fs';

let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

text = text.replace(
  /style=\{isFullscreen && mapRatio \? \{\s*aspectRatio: mapRatio,\s*maxWidth: \`calc\(85vh \* \$\{mapRatio\}\)\`,\s*\} : \{\}\}/,
  `style={mapRatio ? { 
             aspectRatio: mapRatio, 
             maxWidth: isFullscreen ? \`calc(85vh * \${mapRatio})\` : \`min(64rem, calc(70vh * \${mapRatio}))\`
          } : {}}`
);

// We need to also remove max-w-5xl from className because we are setting maxWidth in style.
text = text.replace(
  /className=\{`relative bg-slate-200 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200 m-auto \$\{isFullscreen \? "w-full" : "w-full max-w-5xl border-4 border-white"\}`\}/,
  `className={\`relative bg-slate-200 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200 m-auto \${isFullscreen ? "w-full" : "w-full border-4 border-white"}\`}`
);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log('Fixed aspect ratio');
