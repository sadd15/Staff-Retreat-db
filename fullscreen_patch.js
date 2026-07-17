import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

// Add icons
text = text.replace("import { Employee, Room } from '../types';", "import { Employee, Room } from '../types';\nimport { Maximize2, Minimize2 } from 'lucide-react';");

// Add state
const componentStart = text.indexOf("export default function ResortMap(");
const stateEnd = text.indexOf("const [optimisticPositions, setOptimisticPositions] = useState", componentStart);

text = text.substring(0, stateEnd) + "const [isFullscreen, setIsFullscreen] = useState(false);\n  " + text.substring(stateEnd);

// Add fullscreen styles to wrapper
const wrapperStart = text.indexOf('<div className="flex flex-col items-center w-full">');
text = text.replace(
  '<div className="flex flex-col items-center w-full">',
  '<div className={`flex flex-col items-center w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-4 sm:p-8" : ""}`}>\n      {isFullscreen && (\n        <button onClick={() => setIsFullscreen(false)} className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full flex items-center justify-center transition-colors z-[110] border border-white/20 shadow-2xl">\n          <Minimize2 className="w-6 h-6" />\n        </button>\n      )}'
);

// Tweak the map container
const mapContainerStart = text.indexOf('<div id="map-container" className="relative w-full max-w-5xl bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200">');
text = text.replace(
  '<div id="map-container" className="relative w-full max-w-5xl bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200">',
  '<div id="map-container" className={`relative w-full max-w-5xl bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 ${isFullscreen ? "max-w-[1200px] w-full max-h-[90vh] flex items-center justify-center" : ""}`}>\n        {!isFullscreen && (\n          <button onClick={() => setIsFullscreen(true)} className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur hover:bg-white text-slate-800 rounded-2xl flex items-center justify-center transition-all shadow-lg z-40 border border-slate-200 active:scale-95">\n            <Maximize2 className="w-5 h-5" />\n          </button>\n        )}'
);

// Tweak the image to fit
text = text.replace(
  'className="w-full h-auto pointer-events-none select-none block"',
  'className={`w-full h-auto pointer-events-none select-none block ${isFullscreen ? "object-contain max-h-[90vh]" : ""}`}'
);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("Patch applied!");
