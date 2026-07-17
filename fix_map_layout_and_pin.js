import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

// 1. Remove mapRatio state
text = text.replace('  const [mapRatio, setMapRatio] = useState<number | null>(null);\n', '');

// 2. Fix the container & image
const containerStart = text.indexOf('<div id="map-container"');
const imgEnd = text.indexOf('/>', containerStart) + 2;
const currentContainerAndImg = text.substring(containerStart, imgEnd);

const newContainerAndImg = `<div id="map-container" className={\`relative bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto \${isFullscreen ? "w-max max-w-full" : "w-full max-w-5xl"}\`}>
        {!isFullscreen && (
          <button onClick={() => setIsFullscreen(true)} className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur hover:bg-white text-slate-800 rounded-2xl flex items-center justify-center transition-all shadow-lg z-40 border border-slate-200 active:scale-95">
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
        <img
          src={mapImageUrl || "/resort-map.jpg"}
          alt="Resort Map"
          className={\`pointer-events-none select-none block \${isFullscreen ? "w-auto h-auto max-w-full max-h-[85vh] object-contain" : "w-full h-auto"}\`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20fill%3D%22%23475569%22%3Eกรุณาอัปโหลดรูปผังรีสอร์ต%3C%2Ftext%3E%3C%2Fsvg%3E';
          }}
        />`;

text = text.replace(currentContainerAndImg, newContainerAndImg);

// 3. Update the Pin SVG to be smaller and prettier
const oldSvgPin = `<div className={\`relative flex items-center justify-center transition-transform group-hover:scale-110 origin-bottom \${isActive ? 'scale-125' : ''}\`}>
      <svg width="28" height="36" viewBox="0 0 28 36" className={\`drop-shadow-md \${isFull ? 'text-rose-500' : 'text-emerald-500'}\`}>
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 22 14 22s14-12.375 14-22c0-7.732-6.268-14-14-14z" fill="currentColor" stroke="white" strokeWidth="2.5"/>
      </svg>
      <span className="absolute top-[6px] text-[11px] font-bold text-white pointer-events-none">
        {index + 1}
      </span>
      {isActive && (
        <svg width="28" height="36" viewBox="0 0 28 36" className="absolute top-0 left-0 pointer-events-none text-rose-500 animate-ping opacity-75">
           <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 22 14 22s14-12.375 14-22c0-7.732-6.268-14-14-14z" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )}
    </div>`;

const newSvgPin = `<div className={\`relative flex items-center justify-center transition-transform group-hover:scale-110 origin-bottom \${isActive ? 'scale-110' : ''}\`}>
      <svg width="24" height="32" viewBox="0 0 28 36" className={\`drop-shadow-md \${isFull ? 'text-rose-500' : 'text-emerald-500'}\`}>
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 22 14 22s14-12.375 14-22c0-7.732-6.268-14-14-14z" fill="currentColor" stroke="white" strokeWidth="2"/>
      </svg>
      <span className="absolute top-[4px] text-[10px] font-bold text-white pointer-events-none">
        {index + 1}
      </span>
      {isActive && (
        <svg width="24" height="32" viewBox="0 0 28 36" className="absolute top-0 left-0 pointer-events-none text-rose-500 animate-ping opacity-75">
           <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 22 14 22s14-12.375 14-22c0-7.732-6.268-14-14-14z" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )}
    </div>`;

text = text.replace(oldSvgPin, newSvgPin);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("Fixes applied successfully.");
