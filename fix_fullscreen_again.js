import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

const oldWrapper = '<div className={`flex flex-col items-center w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-2 sm:p-8" : ""}`}>';
const newWrapper = '<div className={`flex flex-col items-center w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto overflow-x-hidden p-2 sm:p-8 block" : ""}`}>';
text = text.replace(oldWrapper, newWrapper);

const oldContainer = '<div id="map-container" className={`relative bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto ${isFullscreen ? "w-fit max-w-full max-h-full" : "w-full max-w-5xl"}`}>';
const newContainer = '<div id="map-container" className={`relative w-full bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto ${isFullscreen ? "max-w-[1600px]" : "max-w-5xl"}`}>';
text = text.replace(oldContainer, newContainer);

const oldImg = 'className={`pointer-events-none select-none block ${isFullscreen ? "w-auto h-auto max-w-full max-h-[85vh] object-contain" : "w-full h-auto"}`}';
const newImg = 'className="w-full h-auto pointer-events-none select-none block"';
text = text.replace(oldImg, newImg);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("Fullscreen scaling restored to width-based");
