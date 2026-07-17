import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

const oldPin = `    <div
      className={\`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-tr-full rounded-tl-full rounded-bl-full rounded-br-sm rotate-45 border-[1.5px] md:border-2 border-white shadow-md transition-transform group-hover:scale-110 \${
        isFull ? 'bg-rose-500' : 'bg-emerald-500'
      } \${isActive ? 'ring-4 ring-rose-500 scale-110' : ''}\`}
    >
      <span className="-rotate-45 text-[10px] md:text-xs font-bold text-white block mt-[-1px] ml-[-1px]">
        {index + 1}
      </span>
    </div>`;

const newPin = `    <div className={\`relative flex items-center justify-center transition-transform group-hover:scale-110 origin-bottom \${isActive ? 'scale-125' : ''}\`}>
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

text = text.replace(oldPin, newPin);
fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("SVG Pin replaced!");
