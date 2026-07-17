import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

// 1. Add state
const oldState = '  const [optimisticPositions, setOptimisticPositions] = useState<Record<string, {x: number, y: number}>>({});';
const newState = '  const [optimisticPositions, setOptimisticPositions] = useState<Record<string, {x: number, y: number}>>({});\n  const [mapRatio, setMapRatio] = useState<number | null>(null);';
text = text.replace(oldState, newState);

// 2. Adjust the wrapper
const oldWrapper = '<div className={`flex flex-col items-center w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto overflow-x-hidden p-2 sm:p-8 block" : ""}`}>';
const newWrapper = '<div className={`flex flex-col items-center w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-2 sm:p-8" : ""}`}>';
text = text.replace(oldWrapper, newWrapper);

// 3. Adjust the container
const oldContainer = '<div id="map-container" className={`relative w-full bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto ${isFullscreen ? "max-w-[1600px]" : "max-w-5xl"}`}>';
const newContainer = '<div id="map-container" className={`relative w-full bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto ${isFullscreen ? "max-w-[1600px]" : "max-w-5xl"}`}\n        style={isFullscreen && mapRatio ? { aspectRatio: mapRatio, maxHeight: "90vh", maxWidth: `calc(90vh * ${mapRatio})` } : undefined}>';
text = text.replace(oldContainer, newContainer);

// 4. Adjust the image
const oldImg = 'className="w-full h-auto pointer-events-none select-none block"\n          onError={(e) => {';
const newImg = 'className="w-full h-full pointer-events-none select-none block"\n          onLoad={(e) => {\n            const { naturalWidth, naturalHeight } = e.currentTarget;\n            if (naturalWidth && naturalHeight) setMapRatio(naturalWidth / naturalHeight);\n          }}\n          onError={(e) => {';
text = text.replace(oldImg, newImg);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("Patched!");
