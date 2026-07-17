import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Employee, Room } from '../types';
import { Maximize2, Minimize2, Copy, Download } from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import Draggable, { DraggableCore, DraggableEvent } from 'react-draggable';

interface ResortMapProps {
  rooms: Room[];
  employees: Employee[];
  onUpdateRoom?: (room: Room) => Promise<void>;
  isAdmin?: boolean;
  mapImageUrl?: string;
  mapImageUrlZone1?: string;
  mapImageUrlZone2?: string;
  onRoomSelect?: (room: Room) => void;
  onActiveZoneChange?: (zone: 'main' | 'zone1' | 'zone2') => void;
}

const Pin = ({ room, isFull, isAdmin, setSelectedRoom, onRoomSelect, index, position, isActive }: { room: Room, isFull: boolean, isAdmin: boolean, setSelectedRoom: (r: Room) => void, onRoomSelect?: (r: Room) => void, index: number, position: {x: number, y: number}, isActive?: boolean }) => (
  <div
    className="group relative flex flex-col items-center justify-center cursor-pointer z-20"
    onClick={(e) => {
      e.stopPropagation();
      if (isAdmin) return;
      if (onRoomSelect) onRoomSelect(room);
      else setSelectedRoom(room);
    }}
  >
    <div className={`relative flex flex-col items-center justify-center transition-all duration-300 origin-bottom ${isActive ? 'scale-125 z-50' : 'group-hover:scale-110 z-10'}`}>
      {/* Shadow */}
      <div className="absolute -bottom-[2px] w-3 h-1 bg-black/30 blur-[2px] rounded-full transition-all group-hover:w-2.5 group-hover:blur-[3px]" />
      
      {/* Pin Body */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Circle containing number */}
        <div className={`relative w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center border-[1.5px] sm:border-2 shadow-lg z-10 transition-colors
          ${isFull 
            ? 'bg-gradient-to-b from-rose-400 to-rose-600 border-white text-white shadow-rose-900/30' 
            : 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-white text-white shadow-emerald-900/30'
          }`}
        >
          <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black font-sans tracking-tighter drop-shadow-sm">
            {index + 1}
          </span>
          
          {/* Active Ping Effect */}
          {isActive && (
            <div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${isFull ? 'bg-rose-400' : 'bg-emerald-400'}`} />
          )}
        </div>
        
        {/* Triangle Tail */}
        <div className={`w-0 h-0 border-l-[3px] sm:border-l-[3.5px] border-r-[3px] sm:border-r-[3.5px] border-t-[4px] sm:border-t-[4.5px] border-l-transparent border-r-transparent -mt-[1px] z-0
          ${isFull ? 'border-t-rose-600' : 'border-t-emerald-600'}`} 
        />
      </div>
    </div>
    
    {/* Tooltip */}
    <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 bg-slate-900/90 backdrop-blur-sm text-white text-[10px] md:text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none shadow-xl border border-white/10 z-30 hidden sm:block">
      {room.roomName}
    </div>

    {isAdmin && isActive && (
      <span className="absolute -top-8 bg-slate-900/90 backdrop-blur-sm text-[10px] font-mono px-2 py-1 rounded-md border border-white/20 whitespace-nowrap pointer-events-none shadow-xl z-30 text-emerald-400">
        {position.x.toFixed(1)}%, {position.y.toFixed(1)}%
      </span>
    )}
  </div>
);

const DraggableWrapper = ({ 
  room, 
  isFull, 
  isAdmin, 
  setSelectedRoom, 
  onRoomSelect,
  position, 
  handleStop, 
  index,
  adminActiveRoom,
  setAdminActiveRoom,
  adminActivePos,
  setAdminActivePos 
}: { 
  room: Room, 
  isFull: boolean, 
  isAdmin: boolean, 
  setSelectedRoom: (r: Room | null) => void, 
  onRoomSelect?: (r: Room) => void,
  position: {x: number, y: number}, 
  handleStop: (room: Room, data: { x: number; y: number }) => Promise<void>, 
  index: number,
  adminActiveRoom?: Room | null,
  setAdminActiveRoom?: (r: Room | null) => void,
  adminActivePos?: {x: number, y: number} | null,
  setAdminActivePos?: (p: {x: number, y: number} | null) => void
}) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  
  const isActive = adminActiveRoom?.id === room.id;
  const currentPos = (isActive && adminActivePos) ? adminActivePos : position;

  const dragStartRef = React.useRef<{ mouseX: number, mouseY: number, startPos: { x: number, y: number } } | null>(null);

  const getClientCoords = (e: DraggableEvent) => {
    if ('clientX' in e) return { x: e.clientX, y: e.clientY };
    if ('touches' in e && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return null;
  };

  const handleStart = (e: DraggableEvent) => {
    const coords = getClientCoords(e);
    if (coords) {
      dragStartRef.current = { mouseX: coords.x, mouseY: coords.y, startPos: { ...currentPos } };
      if (isAdmin && setAdminActiveRoom && setAdminActivePos) {
        setAdminActiveRoom(room);
        setAdminActivePos({ ...currentPos });
      }
    }
  };

  const handleDrag = (e: DraggableEvent) => {
    if (!dragStartRef.current) return;
    const container = document.getElementById('map-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const coords = getClientCoords(e);
      if (coords) {
        const deltaX = coords.x - dragStartRef.current.mouseX;
        const deltaY = coords.y - dragStartRef.current.mouseY;
        
        const deltaXPercent = (deltaX / rect.width) * 100;
        const deltaYPercent = (deltaY / rect.height) * 100;
        
        const newPos = {
          x: Math.max(0, Math.min(100, dragStartRef.current.startPos.x + deltaXPercent)),
          y: Math.max(0, Math.min(100, dragStartRef.current.startPos.y + deltaYPercent))
        };
        
        if (isAdmin && setAdminActivePos) {
          setAdminActivePos(newPos);
        }
      }
    }
  };

  const DraggableCoreAny = DraggableCore as any;

  return (
    <DraggableCoreAny
      nodeRef={nodeRef}
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={() => {
        dragStartRef.current = null;
      }}
    >
      <div 
        ref={nodeRef} 
        className="absolute z-20 cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-full"
        style={{ left: `${currentPos.x}%`, top: `${currentPos.y}%` }}
        onClick={(e) => {
          e.stopPropagation();
          if (isAdmin && setAdminActiveRoom && setAdminActivePos) {
            setAdminActiveRoom(room);
            setAdminActivePos(currentPos);
          } else {
            if (onRoomSelect) onRoomSelect(room);
            else setSelectedRoom(room);
          }
        }}
      >
        <Pin room={room} isFull={isFull} isAdmin={isAdmin} setSelectedRoom={setSelectedRoom} onRoomSelect={onRoomSelect} index={index} position={currentPos} isActive={isActive} />
      </div>
    </DraggableCoreAny>
  );
};

export default function ResortMap({ rooms, employees, onUpdateRoom, isAdmin, mapImageUrl, mapImageUrlZone1, mapImageUrlZone2, onRoomSelect, onActiveZoneChange }: ResortMapProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [adminActiveRoom, setAdminActiveRoom] = useState<Room | null>(null);
  const [adminActivePos, setAdminActivePos] = useState<{ x: number, y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapRatio, setMapRatio] = useState<number | null>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [activeZone, setLocalActiveZone] = useState<'main' | 'zone1' | 'zone2'>('main');
  const setActiveZone = (zone: 'main' | 'zone1' | 'zone2') => {
    setLocalActiveZone(zone);
    if (onActiveZoneChange) onActiveZoneChange(zone);
  };

  React.useEffect(() => {
    setOptimisticPositions(prev => {
      let changed = false;
      const next = { ...prev };
      rooms.forEach(r => {
        const pos = activeZone === 'main' ? r.mapPosition : activeZone === 'zone1' ? r.mapPositionZone1 : r.mapPositionZone2;
        if (pos && next[r.id]) {
          if (Math.abs(pos.x - next[r.id].x) < 0.1 && Math.abs(pos.y - next[r.id].y) < 0.1) {
            delete next[r.id];
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [rooms]);

  const sortedRooms = useMemo(() => {
    const mainOrder = [
      'บ้านริมธาร 881',
      'บ้านริมธาร 883',
      'บ้านริมธาร 884',
      'บ้านธารทอง 882',
      'ห้องธารทอง 883',
      'ห้องธารทอง 884',
      'ห้องธารทอง 885',
      'บ้านธารทิพย์ 881',
      'บ้านธารทิพย์ 881/1',
      'บ้านธารทิพย์ 882',
      'บ้านธารทิพย์ 882/2',
      'บ้านธารทิพย์ 883',
      'บ้านธารทิพย์ 883/3',
      'บ้านธารทิพย์ 884',
      'บ้านธารทิพย์ 884/4'
    ];
    
    const zone1Order = [
      '127', '128', '129', '131-132', '131 - 132', '131 -132', '131- 132',
      'ห้อง 127', 'ห้อง 128', 'ห้อง 129', 'ห้อง 131-132', 'ห้อง 131 - 132', 'ห้อง 131 -132',
      'โซนโรงแรม ห้อง 127', 'โซนโรงแรม ห้อง 128', 'โซนโรงแรม ห้อง 129', 'โซนโรงแรม ห้อง 131-132', 'โซนโรงแรม ห้อง 131 - 132', 'โซนโรงแรม ห้อง 131 -132'
    ];

    const zone2Order = [
      '235', '236',
      'ห้อง 235', 'ห้อง 236',
      'โซนโรงแรม ห้อง 235', 'โซนโรงแรม ห้อง 236'
    ];
    
    const getIndex = (name: string, orderList: string[]) => {
      const trimmedName = name.trim();
      const normalizedName = trimmedName.replace(/\s+/g, ' ');
      
      const exactIdx = orderList.findIndex(o => {
        const normalizedO = o.replace(/\s+/g, ' ');
        return normalizedName === normalizedO || 
               normalizedName.replace(/\s*-\s*/g, '-') === normalizedO.replace(/\s*-\s*/g, '-');
      });
      
      if (exactIdx !== -1) return exactIdx;
      
      const partialIdx = orderList.findIndex(o => {
        const nName = normalizedName.replace(/\s+/g, '');
        const nO = o.replace(/\s+/g, '');
        return nName.includes(nO) || nO.includes(nName);
      });
      return partialIdx !== -1 ? partialIdx : 999;
    };

    return [...rooms]
      .filter(room => {
        const name = room.roomName || '';
        if (activeZone === 'main') return getIndex(name, mainOrder) !== 999;
        if (activeZone === 'zone1') return getIndex(name, zone1Order) !== 999;
        if (activeZone === 'zone2') return getIndex(name, zone2Order) !== 999;
        return false;
      })
      .sort((a, b) => {
        const nameA = a.roomName || '';
        const nameB = b.roomName || '';
        
        let orderList = mainOrder;
        if (activeZone === 'zone1') orderList = zone1Order;
        if (activeZone === 'zone2') orderList = zone2Order;

        const indexA = getIndex(nameA, orderList);
        const indexB = getIndex(nameB, orderList);
        
        if (indexA !== 999 && indexB !== 999) {
          return indexA - indexB;
        }
        
        if (a.sequence !== undefined && b.sequence !== undefined) {
          return a.sequence - b.sequence;
        }
        return nameA.localeCompare(nameB, 'th');
      });
  }, [rooms, activeZone]);

  const handleStop = async (room: Room, data: { x: number; y: number }) => {
    if (onUpdateRoom) {
      const clampedX = Math.max(0, Math.min(100, data.x));
      const clampedY = Math.max(0, Math.min(100, data.y));
      
      try {
        const updatePayload: any = { ...room };
        if (activeZone === 'main') updatePayload.mapPosition = { x: clampedX, y: clampedY };
        else if (activeZone === 'zone1') updatePayload.mapPositionZone1 = { x: clampedX, y: clampedY };
        else if (activeZone === 'zone2') updatePayload.mapPositionZone2 = { x: clampedX, y: clampedY };
        await onUpdateRoom(updatePayload);
      } catch (err) {
        console.error("Failed to update room position", err);
      }
    }
  };

  const currentMapUrl = activeZone === 'main' 
    ? mapImageUrl 
    : activeZone === 'zone1' 
      ? mapImageUrlZone1 
      : mapImageUrlZone2;

  // We should fetch new ratio when map URL changes
  useEffect(() => {
    setMapRatio(null); // reset when URL changes to let it recalculate
  }, [currentMapUrl]);

  const handleDownload = async () => {
    const container = document.getElementById('map-container');
    if (container) {
      const dataUrl = await toPng(container, { backgroundColor: '#ffffff', pixelRatio: 2, filter: (node) => node.id !== 'map-controls' });
      const link = document.createElement('a');
      link.download = `resort-map-${activeZone}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleCopy = async () => {
    const container = document.getElementById('map-container');
    if (container) {
      const blob = await toBlob(container, { backgroundColor: '#ffffff', pixelRatio: 2, filter: (node) => node.id !== 'map-controls' });
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('คัดลอกรูปภาพลงคลิปบอร์ดแล้ว');
        } catch (err) {
          console.error('Failed to copy: ', err);
          alert('ไม่สามารถคัดลอกรูปภาพได้');
        }
      }
    }
  };

  return (
    <div className={`flex flex-col items-center w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-2 sm:p-8" : ""}`}>
      {isFullscreen && (
        <div className="fixed inset-0 pointer-events-none z-[105]" />
      )}
      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)} className="fixed top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full flex items-center justify-center transition-colors z-[110] border border-white/20 shadow-2xl">
          <Minimize2 className="w-6 h-6" />
        </button>
      )}

      {/* Tabs */}
      <div className={`flex gap-2 mb-4 w-full max-w-5xl overflow-x-auto pb-2 ${isFullscreen ? 'z-[110] justify-center' : ''}`}>
        <button onClick={() => setActiveZone("main")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeZone === "main" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100"}`}>โซนรีสอร์ท</button>
        <button onClick={() => setActiveZone("zone1")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeZone === "zone1" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100"}`}>โซนโรงแรม 1</button>
        <button onClick={() => setActiveZone("zone2")} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeZone === "zone2" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100"}`}>โซนโรงแรม 2</button>
      </div>
      <div id="map-container" 
          className={`relative bg-slate-200 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200 m-auto ${isFullscreen ? "w-full h-full flex items-center justify-center" : "w-full border-4 border-white"}`}
          style={mapRatio ? { 
             aspectRatio: mapRatio, 
             maxWidth: isFullscreen ? `calc(90vh * ${mapRatio})` : `min(100%, calc(70vh * ${mapRatio}))`,
             maxHeight: isFullscreen ? '90vh' : '70vh'
          } : {}}
        >
        <div id="map-controls" className={`absolute top-4 right-4 flex flex-col gap-2 ${isFullscreen ? 'z-[120]' : 'z-40'}`}>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            title={isFullscreen ? "ย่อหน้าจอ" : "ขยายเต็มจอ"}
            className="group w-10 h-10 bg-white/90 backdrop-blur hover:bg-white text-slate-800 rounded-2xl flex items-center justify-center transition-all shadow-lg border border-slate-200 active:scale-95 relative"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            <span className="absolute right-12 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isFullscreen ? "ย่อหน้าจอ" : "ขยายเต็มจอ"}
            </span>
          </button>
          <button 
            onClick={handleCopy} 
            title="คัดลอกรูปภาพ"
            className="group w-10 h-10 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg border border-indigo-600 active:scale-95 relative"
          >
            <Copy className="w-5 h-5" />
            <span className="absolute right-12 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              คัดลอก
            </span>
          </button>
          <button 
            onClick={handleDownload} 
            title="ดาวน์โหลดรูปภาพ"
            className="group w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg border border-emerald-600 active:scale-95 relative"
          >
            <Download className="w-5 h-5" />
            <span className="absolute right-12 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ดาวน์โหลด
            </span>
          </button>
        </div>
        <img
          src={currentMapUrl || "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20fill%3D%22%23475569%22%3E%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%93%E0%B8%B2%E0%B8%AD%E0%B8%B1%E0%B8%9B%E0%B9%82%E0%B8%AB%E0%B8%A5%E0%B8%94%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9B%E0%B9%82%E0%B8%8B%E0%B8%99%E0%B8%99%E0%B8%B5%E0%B9%89%3C%2Ftext%3E%3C%2Fsvg%3E"}
          alt="Resort Map"
          className="w-full h-full block"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth && naturalHeight) setMapRatio(naturalWidth / naturalHeight);
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20fill%3D%22%23475569%22%3E%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%93%E0%B8%B2%E0%B8%AD%E0%B8%B1%E0%B8%9B%E0%B9%82%E0%B8%AB%E0%B8%A5%E0%B8%94%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9B%E0%B9%82%E0%B8%8B%E0%B8%99%E0%B8%99%E0%B8%B5%E0%B9%89%3C%2Ftext%3E%3C%2Fsvg%3E";
          }}
        />
        {/* Pins Overlay */}
        {sortedRooms.map((room, index) => {
          const occupants = employees.filter(e => e.roomId === room.id);
          const isFull = occupants.length >= room.capacity;
          
          const basePosition = (activeZone === 'main' ? room.mapPosition : activeZone === 'zone1' ? room.mapPositionZone1 : room.mapPositionZone2) || { 
            x: 5 + (index % 5) * 20, 
            y: 5 + Math.floor(index / 5) * 20 
          };
          
          const position = optimisticPositions[room.id] || basePosition;

          // For the map labels, in Zone 1 it starts from 17, Zone 2 starts from 21
          // Wait, if we use just `index + 1`, it will show 1, 2, 3, 4 for Zone 1.
          // Let's use the actual sequence or hardcoded map values.
          // The user mentioned: "หมุด 17 ... หมุด 22".
          // In the `Pin` component we use `index + 1`. If activeZone === 'zone1', we can pass index + 16 (since index is 0, 1, 2, 3 -> 17, 18, 19, 20).
          // For activeZone === 'zone2', pass index + 20 (so 21, 22).
          const pinNumber = activeZone === 'main' ? index + 1 : activeZone === 'zone1' ? index + 17 : index + 21;

          if (isAdmin) {
            return (
              <React.Fragment key={room.id}>
                  <DraggableWrapper 
                  room={room} 
                  isFull={isFull} 
                  isAdmin={isAdmin} 
                  setSelectedRoom={setSelectedRoom}
                  onRoomSelect={onRoomSelect}
                  position={position} 
                  handleStop={handleStop} 
                  index={pinNumber - 1} // since Pin renders index + 1
                  adminActiveRoom={adminActiveRoom}
                  setAdminActiveRoom={setAdminActiveRoom}
                  adminActivePos={adminActivePos}
                  setAdminActivePos={setAdminActivePos}
                />
              </React.Fragment>
            );
          }

          return (
            <div 
              key={room.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-full cursor-pointer"
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                if (onRoomSelect) onRoomSelect(room);
                else setSelectedRoom(room);
              }}
            >
              <Pin room={room} isFull={isFull} isAdmin={isAdmin} setSelectedRoom={setSelectedRoom} onRoomSelect={onRoomSelect} index={pinNumber - 1} position={position} isActive={false} />
            </div>
          );
        })}
      </div>

      {/* Admin Editor Modal Overlay */}
      {isAdmin && adminActiveRoom && adminActivePos && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[300px] pointer-events-none">
          <div className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-indigo-50 pointer-events-auto animate-in slide-in-from-bottom-4 duration-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">กำลังตั้งค่าตำแหน่ง</p>
            
            <p className="text-xs font-bold text-indigo-600 mb-4 bg-indigo-50 py-1.5 px-3 rounded-lg text-center">
              {adminActiveRoom.roomName}
            </p>
            
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">แกน X</p>
                <p className="text-sm font-mono font-bold text-slate-700">{adminActivePos.x.toFixed(1)}%</p>
              </div>
              <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">แกน Y</p>
                <p className="text-sm font-mono font-bold text-slate-700">{adminActivePos.y.toFixed(1)}%</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                const room = adminActiveRoom;
                const pos = adminActivePos;
                
                setOptimisticPositions(prev => ({ ...prev, [room.id]: pos }));
                
                handleStop(room, pos);
                setAdminActiveRoom(null);
                setAdminActivePos(null);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-100 active:scale-95"
            >
              บันทึกหมุด
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal */}
      {selectedRoom && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setSelectedRoom(null)}>
          <div className="bg-white p-5 sm:p-6 rounded-3xl w-full max-w-[320px] sm:max-w-sm max-h-[85vh] shadow-2xl border-4 border-indigo-50 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-3 sm:mb-4 shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <span className="text-lg sm:text-xl">🏠</span>
              </div>
              <h3 className="font-black text-base sm:text-lg text-slate-800">{selectedRoom.roomName}</h3>
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-slate-100 rounded-full">
                <div className={`w-1.5 h-1.5 rounded-full ${employees.filter(e => e.roomId === selectedRoom.id).length >= selectedRoom.capacity ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  พักแล้ว {employees.filter(e => e.roomId === selectedRoom.id).length} / {selectedRoom.capacity} คน
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 px-1 -mx-1">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">รายชื่อผู้เข้าพัก</p>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                {employees.filter(e => e.roomId === selectedRoom.id).map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-indigo-600 border border-indigo-100 shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                      <p className="text-[9px] font-medium text-slate-400 truncate">{emp.department}</p>
                    </div>
                  </div>
                ))}
                {employees.filter(e => e.roomId === selectedRoom.id).length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-xs font-medium text-slate-400">ยังไม่มีผู้เข้าพัก</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 shrink-0 mt-auto">
              <button 
                className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-lg shadow-indigo-100 active:scale-95"
                onClick={() => setSelectedRoom(null)}
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isAdmin && (
        <div className="mt-4 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
          <span className="text-lg">📍</span>
          <p className="text-xs font-bold text-indigo-700">
            โหมดตั้งค่าผัง: คลิกที่หมุดและลากเพื่อเปลี่ยนตำแหน่ง จากนั้นกด "บันทึกหมุด" ที่หน้าต่างมุมขวาบน
          </p>
        </div>
      )}
    </div>
  );
}
