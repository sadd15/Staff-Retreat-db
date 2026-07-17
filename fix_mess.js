import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

const regex = /<div id="map-container"[\s\S]*?\/>\s*<\/button>\s*\)}\s*<img[\s\S]*?onError=\{\(e\) => \{[\s\S]*?\}\}\s*\/>/m;

const newReplacement = `<div id="map-container" className={\`relative bg-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl ring-1 ring-slate-200 m-auto \${isFullscreen ? "w-max max-w-full" : "w-full max-w-5xl"}\`}>
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

text = text.replace(regex, newReplacement);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("Cleaned up duplicated container/img code.");
