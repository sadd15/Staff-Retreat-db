import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

// 1. DraggableWrapper
const oldDraggable = 'className={`absolute z-20 cursor-grab active:cursor-grabbing ${isActive ? \'ring-4 ring-rose-500 rounded-full scale-110 transition-transform\' : \'transition-transform\'}`}\n        style={{ left: `${currentPos.x}%`, top: `${currentPos.y}%`, transform: \'translate(-50%, -50%)\' }}';
const newDraggable = 'className="absolute z-20 cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-full"\n        style={{ left: `${currentPos.x}%`, top: `${currentPos.y}%` }}';
text = text.replace(oldDraggable, newDraggable);

// 2. Static pin
const oldStatic = 'className="absolute z-20"\n              style={{ left: `${position.x}%`, top: `${position.y}%`, transform: \'translate(-50%, -50%)\' }}';
const newStatic = 'className="absolute z-20 -translate-x-1/2 -translate-y-full"\n              style={{ left: `${position.x}%`, top: `${position.y}%` }}';
text = text.replace(oldStatic, newStatic);

// 3. Pin wrapper
const oldPinWrapper = 'className="group relative flex flex-col items-center justify-center cursor-pointer z-20"\n    onClick={() => {';
const newPinWrapper = 'className="group relative flex flex-col items-center justify-center cursor-pointer z-20 pb-[5px] md:pb-[7px]"\n    onClick={() => {';
text = text.replace(oldPinWrapper, newPinWrapper);

// 4. Pin inner div
const oldPinInner = 'className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-tr-full rounded-tl-full rounded-bl-full rounded-br-sm rotate-45 border-[1.5px] md:border-2 border-white shadow-md transition-transform group-hover:scale-110 ${\n        isFull ? \'bg-rose-500\' : \'bg-emerald-500\'\n      }`}';
const newPinInner = 'className={`w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-tr-full rounded-tl-full rounded-bl-full rounded-br-sm rotate-45 border-[1.5px] md:border-2 border-white shadow-md transition-transform group-hover:scale-110 ${\n        isFull ? \'bg-rose-500\' : \'bg-emerald-500\'\n      } ${isActive ? \'ring-4 ring-rose-500 scale-110\' : \'\'}`}';
text = text.replace(oldPinInner, newPinInner);

fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log("Pins fixed!");
