import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

const oldContainer = '<div id="map-container" className={`relative bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto ${isFullscreen ? "w-max max-w-full max-h-full" : "w-full max-w-5xl"}`}>';
const newContainer = '<div id="map-container" className={`relative bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto ${isFullscreen ? "w-fit max-w-full max-h-full" : "w-full max-w-5xl"}`}>';
text = text.replace(oldContainer, newContainer);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("w-fit applied");
