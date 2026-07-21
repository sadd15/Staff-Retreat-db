import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast as globalToast } from './Toast';
import { createPortal } from 'react-dom';
import { Employee, Room, MapZone } from '../types';
import { Maximize2, Minimize2, Copy, Download, X, HelpCircle, Upload, Link, Map as MapIcon, ChevronRight, Image as ImageIcon, RefreshCw, Sparkles, Trash2, Plus, Minus, Focus, Search, Filter, List, Settings, Eye, EyeOff, Wrench, Bed, Waves, Trees, Bath, Info, Compass } from 'lucide-react';
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
  onActiveZoneChange?: (zone: string) => void;
  activeZoneProp?: string;
  zones?: MapZone[];
  setActiveTab?: (tab: 'rsvp' | 'booking' | 'directory' | 'summary' | 'admin') => void;
  setBookingSelectedRoomId?: (roomId: string) => void;
  // Admin upload props
  onMapUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSaveMapUrl?: () => Promise<void>;
  onClearMap?: () => Promise<void>;
  uploadingMap?: boolean;
  mapUrlInput?: string;
  setMapUrlInput?: (url: string) => void;
}

const Pin = ({ 
  room, 
  status, 
  isAdmin, 
  setSelectedRoom, 
  onRoomSelect, 
  index, 
  position, 
  isActive,
  isHighlighted
}: { 
  room: Room, 
  status: 'empty' | 'partial' | 'full', 
  isAdmin: boolean, 
  setSelectedRoom: (r: Room) => void, 
  onRoomSelect?: (r: Room) => void, 
  index: number, 
  position: {x: number; y: number}, 
  isActive?: boolean,
  isHighlighted?: boolean
}) => {
  const shortRoomName = room.roomName
    .replace('บ้านริมธาร ', '')
    .replace('บ้านธารทอง ', '')
    .replace('ห้องธารทอง ', '')
    .replace('บ้านธารทิพย์ ', '')
    .replace('โซนโรงแรม ห้อง ', '')
    .replace('ห้อง ', '')
    .trim();

  const colorMap = {
    empty: {
      bg: 'bg-gradient-to-tr from-emerald-500 to-teal-400',
      border: 'border-white',
      shadow: 'shadow-emerald-500/30',
      text: 'text-white',
      tail: 'border-t-emerald-500',
      ping: 'bg-emerald-400'
    },
    partial: {
      bg: 'bg-gradient-to-tr from-amber-500 to-orange-400',
      border: 'border-white',
      shadow: 'shadow-amber-500/30',
      text: 'text-white',
      tail: 'border-t-amber-500',
      ping: 'bg-amber-400'
    },
    full: {
      bg: 'bg-gradient-to-tr from-rose-500 to-red-600',
      border: 'border-white',
      shadow: 'shadow-rose-500/30',
      text: 'text-white',
      tail: 'border-t-rose-500',
      ping: 'bg-rose-400'
    }
  };

  const currentColors = colorMap[status] || colorMap.empty;

  return (
    <div
      className="group relative flex flex-col items-center justify-center cursor-pointer z-20"
      onClick={(e) => {
        e.stopPropagation();
        if (isAdmin) return;
        if (onRoomSelect) onRoomSelect(room);
        else setSelectedRoom(room);
      }}
    >
      <div className={`relative flex flex-col items-center justify-center transition-all duration-300 origin-bottom ${isActive || isHighlighted ? 'scale-125 z-50' : 'group-hover:scale-110 z-10'}`}>
        {/* Soft shadow below the pin */}
        <div className="absolute -bottom-[2px] w-3 h-1 bg-black/40 blur-[2px] rounded-full transition-all group-hover:w-2.5 group-hover:blur-[3px]" />
        
        {/* Pin Body */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Circle containing number */}
          <div className={`relative w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center border-2 shadow-md z-10 transition-all ${currentColors.bg} ${currentColors.border} ${currentColors.text} ${currentColors.shadow} ${isHighlighted ? 'ring-4 ring-yellow-400 animate-bounce' : ''}`}
          >
            <span className="text-[9px] sm:text-[10px] md:text-[11px] font-black font-sans tracking-tight drop-shadow-sm">
              {index + 1}
            </span>
            
            {/* Active or Pulsing Ping Effect */}
            {(isActive || isHighlighted || status === 'partial') && (
              <div className={`absolute -inset-1 rounded-full animate-ping opacity-25 ${currentColors.ping}`} />
            )}
          </div>
          
          {/* Triangle Tail */}
          <div className={`w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-t-[5px] border-l-transparent border-r-transparent -mt-[1px] z-0 ${currentColors.tail}`} />
        </div>
      </div>
      
      {/* Tooltip */}
      <div className="absolute top-[40px] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 bg-slate-900/95 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap pointer-events-none shadow-2xl border border-white/15 z-35 hidden sm:block">
        <div className="flex flex-col gap-0.5 text-center">
          <span className="text-indigo-300 text-[10px] font-black"># {index + 1}</span>
          <span className="font-extrabold text-[12px]">{room.roomName}</span>
          <span className="text-[10px] opacity-80">{room.roomType}</span>
        </div>
      </div>

      {isAdmin && isActive && (
        <span className="absolute -top-9 bg-slate-950/90 backdrop-blur-md text-[9px] font-mono px-2 py-1 rounded-lg border border-white/15 whitespace-nowrap pointer-events-none shadow-2xl z-30 text-indigo-400 font-extrabold">
          X: {position.x.toFixed(1)}% | Y: {position.y.toFixed(1)}%
        </span>
      )}
    </div>
  );
};

const DraggableWrapper = ({ 
  room, 
  status, 
  isAdmin, 
  setSelectedRoom, 
  onRoomSelect,
  position, 
  handleStop, 
  index,
  adminActiveRoom,
  setAdminActiveRoom,
  adminActivePos,
  setAdminActivePos,
  isHighlighted
}: { 
  room: Room, 
  status: 'empty' | 'partial' | 'full', 
  isAdmin: boolean, 
  setSelectedRoom: (r: Room | null) => void, 
  onRoomSelect?: (r: Room) => void,
  position: {x: number, y: number}, 
  handleStop: (room: Room, data: { x: number; y: number }) => Promise<void>, 
  index: number,
  adminActiveRoom?: Room | null,
  setAdminActiveRoom?: (r: Room | null) => void,
  adminActivePos?: {x: number, y: number} | null,
  setAdminActivePos?: (p: {x: number, y: number} | null) => void,
  isHighlighted?: boolean
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
        <Pin room={room} status={status} isAdmin={isAdmin} setSelectedRoom={setSelectedRoom} onRoomSelect={onRoomSelect} index={index} position={currentPos} isActive={isActive} isHighlighted={isHighlighted} />
      </div>
    </DraggableCoreAny>
  );
};

const getSpecialBadges = (room: Room) => {
  const badges: { text: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }[] = [];
  const textToScan = `${room.roomName} ${room.roomType} ${room.notes || ''}`.toLowerCase();

  // 1. Extra bed / เตียงเสริม
  if (textToScan.includes('เตียงเสริม') || textToScan.includes('เสริมเตียง') || textToScan.includes('extra bed')) {
    badges.push({
      text: 'มีเตียงเสริม',
      icon: <Bed className="w-3 h-3 shrink-0" />,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    });
  }

  // 2. Poolside / ติดสระ / วิวสระ / ริมสระ
  if (textToScan.includes('ติดสระ') || textToScan.includes('วิวสระ') || textToScan.includes('ริมสระ') || textToScan.includes('pool') || textToScan.includes('สระว่ายน้ำ') || textToScan.includes('พูลวิลล่า')) {
    badges.push({
      text: 'ห้องติดสระ / วิวสระ',
      icon: <Waves className="w-3 h-3 shrink-0" />,
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200'
    });
  }

  // 3. Bathtub / อ่างอาบน้ำ
  if (textToScan.includes('อ่างอาบน้ำ') || textToScan.includes('bathtub') || textToScan.includes('อ่าง')) {
    badges.push({
      text: 'มีอ่างอาบน้ำ',
      icon: <Bath className="w-3 h-3 shrink-0" />,
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    });
  }

  // 4. Garden view / วิวสวน
  if (textToScan.includes('วิวสวน') || textToScan.includes('garden view') || textToScan.includes('สวน')) {
    badges.push({
      text: 'วิวสวนธรรมชาติ',
      icon: <Trees className="w-3 h-3 shrink-0" />,
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    });
  }

  // 5. Mountain view / วิวภูเขา
  if (textToScan.includes('วิวภูเขา') || textToScan.includes('mountain view') || textToScan.includes('ภูเขา')) {
    badges.push({
      text: 'วิวภูเขาพาโนรามา',
      icon: <Trees className="w-3 h-3 shrink-0" />,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    });
  }

  // 6. Sea view / วิวทะเล / ริมน้ำ
  if (textToScan.includes('วิวทะเล') || textToScan.includes('sea view') || textToScan.includes('ทะเล') || textToScan.includes('ริมน้ำ') || textToScan.includes('ริมธาร')) {
    badges.push({
      text: 'วิวทะเล / ริมธาร',
      icon: <Compass className="w-3 h-3 shrink-0" />,
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200'
    });
  }

  // 7. Twin Bed / เตียงคู่
  if (textToScan.includes('เตียงคู่') || textToScan.includes('twin bed')) {
    badges.push({
      text: 'เตียงคู่ (Twin)',
      icon: <Bed className="w-3 h-3 shrink-0" />,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50/60',
      borderColor: 'border-indigo-100'
    });
  }

  // 8. Single Grand Bed / เตียงเดี่ยว
  if (textToScan.includes('เตียงเดี่ยว') || textToScan.includes('king bed') || textToScan.includes('queen bed') || textToScan.includes('เตียงเดี่ยวใหญ่')) {
    badges.push({
      text: 'เตียงเดี่ยวใหญ่',
      icon: <Bed className="w-3 h-3 shrink-0" />,
      color: 'text-slate-700',
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200'
    });
  }

  // 9. Connecting / ห้องเชื่อม
  if (textToScan.includes('ห้องเชื่อม') || textToScan.includes('connecting')) {
    badges.push({
      text: 'ห้องมีประตูเชื่อมกัน',
      icon: <Info className="w-3 h-3 shrink-0" />,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    });
  }

  return badges;
};

export default function ResortMap({ 
  rooms, 
  employees, 
  onUpdateRoom, 
  isAdmin, 
  mapImageUrl, 
  mapImageUrlZone1, 
  mapImageUrlZone2, 
  onRoomSelect, 
  onActiveZoneChange, 
  activeZoneProp,
  setActiveTab, 
  setBookingSelectedRoomId,
  onMapUpload,
  onSaveMapUrl,
  onClearMap,
  uploadingMap,
  mapUrlInput,
  setMapUrlInput,
  zones = []
}: ResortMapProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [adminActiveRoom, setAdminActiveRoom] = useState<Room | null>(null);
  const [adminActivePos, setAdminActivePos] = useState<{ x: number, y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapRatio, setMapRatio] = useState<number | null>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [activeZone, setLocalActiveZone] = useState<string>(activeZoneProp || 'main');

  useEffect(() => {
    if (activeZoneProp && activeZoneProp !== activeZone) {
      setLocalActiveZone(activeZoneProp);
    }
  }, [activeZoneProp]);

  const [showPinningModal, setShowPinningModal] = useState(false);
  const [selectedRoomToPinId, setSelectedRoomToPinId] = useState<string>('');
  const [pinNumberInput, setPinNumberInput] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [highlightedRoomId, setHighlightedRoomId] = useState<string>('');
  const [showAdminHelp, setShowAdminHelp] = useState(false);
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isResetting, setIsResetting] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapNodeRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [pointers, setPointers] = useState<Record<number, { x: number, y: number }>>({});
  const lastDistRef = React.useRef<number | null>(null);

  const handleReset = () => {
    setIsResetting(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setTimeout(() => setIsResetting(false), 400);
  };

    // Re-calculate container size for minimap
    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          setContainerSize({
            w: containerRef.current.clientWidth,
            h: containerRef.current.clientHeight
          });
        }
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }, [isFullscreen]);
  
    const minimapViewportStyle = useMemo(() => {
      if (zoom <= 1 || !containerSize.w) return { display: 'none' };
      
      const w = 100 / zoom;
      const h = 100 / zoom;
      
      // Calculate viewport position relative to image center
      const left = (0.5 - (pan.x / zoom / containerSize.w)) * 100 - w / 2;
      const top = (0.5 - (pan.y / zoom / containerSize.h)) * 100 - h / 2;
      
      return {
        width: `${w}%`,
        height: `${h}%`,
        left: `${left}%`,
        top: `${top}%`,
      };
    }, [zoom, pan, containerSize]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const newPointers = { ...pointers, [e.pointerId]: { x: e.clientX, y: e.clientY } };
    setPointers(newPointers);
    if (Object.keys(newPointers).length < 2) {
      lastDistRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointers[e.pointerId]) {
      const newPointers = { ...pointers, [e.pointerId]: { x: e.clientX, y: e.clientY } };
      setPointers(newPointers);

      const pointerIds = Object.keys(newPointers).map(Number);
      if (pointerIds.length === 2) {
        const p1 = newPointers[pointerIds[0]];
        const p2 = newPointers[pointerIds[1]];
        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        if (lastDistRef.current !== null) {
          const delta = dist - lastDistRef.current;
          const sensitivity = 0.01;
          setZoom(prev => {
            const next = Math.max(1, Math.min(5, prev + delta * sensitivity));
            if (next === 1) setPan({ x: 0, y: 0 });
            return next;
          });
        }
        lastDistRef.current = dist;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const newPointers = { ...pointers };
    delete newPointers[e.pointerId];
    setPointers(newPointers);
    if (Object.keys(newPointers).length < 2) {
      lastDistRef.current = null;
    }
  };

  // Reset zoom and pan when zone changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeZone]);

  // Update spotlight position when step changes
  useEffect(() => {
    if (tourStep === null) {
      setSpotlightRect(null);
      return;
    }

    const timer = setTimeout(() => {
      let targetId = '';
      if (tourStep === 1) targetId = 'map-zone-tabs';
      if (tourStep === 2) targetId = 'map-upload-btn';
      if (tourStep === 3) targetId = 'map-add-pin-btn';

      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          setSpotlightRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        }
      } else {
        setSpotlightRect(null);
      }
    }, 150); // Small delay to allow UI to settle (like panel opening)

    return () => clearTimeout(timer);
  }, [tourStep, showAdminUpload]);

  const startTour = () => {
    setTourStep(1);
    setLocalActiveZone('main');
    setShowAdminUpload(false);
  };
  const setActiveZone = (zone: string) => {
    setLocalActiveZone(zone);
    if (onActiveZoneChange) onActiveZoneChange(zone);
  };

  React.useEffect(() => {
    setOptimisticPositions(prev => {
      let changed = false;
      const next = { ...prev };
      rooms.forEach(r => {
        let pos;
        if (activeZone === 'main') pos = r.mapPosition;
        else if (activeZone === 'zone1') pos = r.mapPositionZone1;
        else if (activeZone === 'zone2') pos = r.mapPositionZone2;
        else pos = r.zonePositions?.[activeZone];

        if (pos && next[r.id]) {
          if (Math.abs(pos.x - next[r.id].x) < 0.1 && Math.abs(pos.y - next[r.id].y) < 0.1) {
            delete next[r.id];
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [rooms, activeZone]);

  const allRoomsInZone = useMemo(() => {
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

    const getZoneForRoom = (room: Room): string | null => {
      const name = room.roomName || '';
      const lowerName = name.toLowerCase();
      
      // 1. Main Zone Classification (Saves Deluxe, Superior, Family, Presidential, Suite, Villa and sequences <= 16 to main zone)
      if (
        name.includes('บ้าน') || 
        name.includes('ธารทอง') || 
        name.includes('ธารทิพย์') || 
        name.includes('ริมธาร') ||
        lowerName.includes('deluxe') ||
        lowerName.includes('superior') ||
        lowerName.includes('family') ||
        lowerName.includes('presidential') ||
        lowerName.includes('suite') ||
        lowerName.includes('villa') ||
        (room.sequence !== undefined && Number(room.sequence) <= 16) ||
        ['101', '102', '103', '201', '202', '203', '301', '302'].includes(room.id)
      ) {
        return 'main';
      }
      
      // 2. Zone-based sequence check (17-19 is zone1, 20-24 is zone2)
      if (room.sequence !== undefined) {
        const seqNum = Number(room.sequence);
        if (seqNum >= 17 && seqNum <= 19) {
          return 'zone1';
        }
        if (seqNum >= 20 && seqNum <= 24) {
          return 'zone2';
        }
      }
      
      // 3. Fallback/Regex-based Classification
      const match = name.match(/\d+/);
      if (match) {
        const numStr = match[0];
        // If it contains 131 or 132, it belongs to zone2 (Hotel Zone 2, starting with pin 20)
        if (numStr === '131' || numStr === '132' || name.includes('131') || name.includes('132')) {
          return 'zone2';
        }
        if (numStr.startsWith('1')) return 'zone1';
        if (numStr.startsWith('2')) return 'zone2';
      }
      
      if (getIndex(name, mainOrder) !== 999) return 'main';
      if (getIndex(name, zone1Order) !== 999) return 'zone1';
      if (getIndex(name, zone2Order) !== 999) return 'zone2';

      // Check if it's already assigned to a dynamic zone
      if (room.zonePositions) {
        const assignedZone = Object.keys(room.zonePositions).find(zid => room.zonePositions?.[zid]);
        if (assignedZone) return assignedZone;
      }
      
      return null;
    };

    return [...rooms]
      .filter(room => getZoneForRoom(room) === activeZone)
      .sort((a, b) => {
        // 1. Sort by database sequence primarily
        const seqA = a.sequence !== undefined ? Number(a.sequence) : Infinity;
        const seqB = b.sequence !== undefined ? Number(b.sequence) : Infinity;
        if (seqA !== seqB) {
          return seqA - seqB;
        }

        // 2. Sort by pre-defined order list as secondary fallback
        const nameA = a.roomName || '';
        const nameB = b.roomName || '';
        
        let orderList = mainOrder;
        if (activeZone === 'zone1') orderList = zone1Order;
        if (activeZone === 'zone2') orderList = zone2Order;

        const indexA = getIndex(nameA, orderList);
        const indexB = getIndex(nameB, orderList);
        
        if (indexA !== indexB) {
          return indexA - indexB;
        }
        
        // 3. Alphabetical fallback
        return nameA.localeCompare(nameB, 'th');
      });
  }, [rooms, activeZone]);

  const unpinnedRoomsInActiveZone = useMemo(() => {
    return allRoomsInZone.filter(room => {
      if (activeZone === 'main') {
        return !room.mapPosition || room.mapPosition.x === undefined;
      }
      if (activeZone === 'zone1') {
        return !room.mapPositionZone1 || room.mapPositionZone1.x === undefined;
      }
      if (activeZone === 'zone2') {
        return !room.mapPositionZone2 || room.mapPositionZone2.x === undefined;
      }
      return !room.zonePositions?.[activeZone];
    });
  }, [allRoomsInZone, activeZone]);

  const parsedPinNumber = useMemo(() => {
    if (!pinNumberInput.trim()) return null;
    const num = parseInt(pinNumberInput.trim(), 10);
    return isNaN(num) ? null : num;
  }, [pinNumberInput]);

  // Find if there is a room with this sequence (pin number)
  const matchedRoom = useMemo(() => {
    if (parsedPinNumber === null) return null;
    return rooms.find(room => {
      const isSameSeq = room.sequence !== undefined && Number(room.sequence) === parsedPinNumber;
      return isSameSeq;
    });
  }, [rooms, parsedPinNumber]);

  // Check if matchedRoom is already pinned in the current active zone
  const isMatchedRoomPinned = useMemo(() => {
    if (!matchedRoom) return false;
    if (activeZone === 'main') {
      return !!matchedRoom.mapPosition && matchedRoom.mapPosition.x !== undefined;
    }
    if (activeZone === 'zone1') {
      return !!matchedRoom.mapPositionZone1 && matchedRoom.mapPositionZone1.x !== undefined;
    }
    if (activeZone === 'zone2') {
      return !!matchedRoom.mapPositionZone2 && matchedRoom.mapPositionZone2.x !== undefined;
    }
    return !!matchedRoom.zonePositions?.[activeZone];
  }, [matchedRoom, activeZone]);

  // Track last warned pin to prevent infinite alerts
  const [lastWarnedPin, setLastWarnedPin] = useState<number | null>(null);

  useEffect(() => {
    if (showPinningModal && parsedPinNumber !== null) {
      if (parsedPinNumber === lastWarnedPin) return;
      
      if (matchedRoom) {
        if (isMatchedRoomPinned) {
          showToast(`⚠️ หมุดหมายเลข ${parsedPinNumber} มีการเชื่อมโยงไปยังห้องพัก "${matchedRoom.roomName || matchedRoom.id}" แล้ว และถูกปักหมุดอยู่บนแผนที่`, 'warning');
          setLastWarnedPin(parsedPinNumber);
        } else {
          showToast(`🟢 พบข้อมูล: หมุดหมายเลข ${parsedPinNumber} เชื่อมโยงกับ "${matchedRoom.roomName || matchedRoom.id}" ยังไม่ได้ปักหมุด`, 'success');
          setLastWarnedPin(parsedPinNumber);
        }
      } else {
        setLastWarnedPin(null);
      }
    } else {
      setLastWarnedPin(null);
    }
  }, [parsedPinNumber, matchedRoom, isMatchedRoomPinned, showPinningModal, lastWarnedPin]);

  const sortedRooms = useMemo(() => {
    return allRoomsInZone.filter(room => {
      if (activeZone === 'main') {
        return room.mapPosition && room.mapPosition.x !== undefined && room.mapPosition.y !== undefined;
      }
      if (activeZone === 'zone1') {
        return room.mapPositionZone1 && room.mapPositionZone1.x !== undefined && room.mapPositionZone1.y !== undefined;
      }
      if (activeZone === 'zone2') {
        return room.mapPositionZone2 && room.mapPositionZone2.x !== undefined && room.mapPositionZone2.y !== undefined;
      }
      return room.zonePositions?.[activeZone] && room.zonePositions[activeZone].x !== undefined;
    });
  }, [allRoomsInZone, activeZone]);

  const handleStop = async (room: Room, data: { x: number; y: number }) => {
    if (onUpdateRoom) {
      const clampedX = Math.max(0, Math.min(100, data.x));
      const clampedY = Math.max(0, Math.min(100, data.y));
      
      try {
        const updatePayload: any = { ...room };
        if (activeZone === 'main') updatePayload.mapPosition = { x: clampedX, y: clampedY };
        else if (activeZone === 'zone1') updatePayload.mapPositionZone1 = { x: clampedX, y: clampedY };
        else if (activeZone === 'zone2') updatePayload.mapPositionZone2 = { x: clampedX, y: clampedY };
        else {
          if (!updatePayload.zonePositions) updatePayload.zonePositions = {};
          updatePayload.zonePositions[activeZone] = { x: clampedX, y: clampedY };
        }
        await onUpdateRoom(updatePayload);
      } catch (err) {
        console.error("Failed to update room position", err);
      }
    }
  };

  const currentMapUrl = useMemo(() => {
    if (activeZone === 'main') return mapImageUrl;
    if (activeZone === 'zone1') return mapImageUrlZone1;
    if (activeZone === 'zone2') return mapImageUrlZone2;
    return zones.find(z => z.id === activeZone)?.imageUrl;
  }, [activeZone, mapImageUrl, mapImageUrlZone1, mapImageUrlZone2, zones]);

  // We should fetch new ratio when map URL changes
  useEffect(() => {
    setMapRatio(null); // reset when URL changes to let it recalculate
  }, [currentMapUrl]);

  const handleDownload = async () => {
    const container = document.getElementById('map-container');
    if (container) {
      const toastId = globalToast.loading('กำลังประมวลผลรูปภาพแผนที่ความคมชัดสูงระดับ 8K...', 30000);
      try {
        const containerWidth = container.getBoundingClientRect().width || container.clientWidth || 1000;
        const targetPixelRatio = Math.min(8, Math.max(4, 7680 / containerWidth));

        const dataUrl = await toPng(container, { 
          backgroundColor: '#ffffff', 
          pixelRatio: targetPixelRatio, 
          filter: (node) => node.id !== 'map-controls' 
        });
        const link = document.createElement('a');
        link.download = `resort-map-${activeZone}-8k.png`;
        link.href = dataUrl;
        link.click();
        globalToast.dismiss(toastId);
        globalToast.success('ดาวน์โหลดรูปภาพแผนที่ความคมชัดสูงระดับ 8K สำเร็จเรียบร้อยแล้ว! 💾✨');
      } catch (err) {
        console.error('Error downloading map image', err);
        globalToast.dismiss(toastId);
        globalToast.error('ดาวน์โหลดรูปภาพแผนที่ล้มเหลว กรุณาลองใหม่อีกครั้ง ❌');
      }
    }
  };

  const handleCopy = async () => {
    const container = document.getElementById('map-container');
    if (container) {
      const toastId = globalToast.loading('กำลังสร้างรูปภาพแผนที่ระดับ 8K และเตรียมคัดลอก...', 30000);
      try {
        const containerWidth = container.getBoundingClientRect().width || container.clientWidth || 1000;
        const targetPixelRatio = Math.min(8, Math.max(4, 7680 / containerWidth));

        const blob = await toBlob(container, { 
          backgroundColor: '#ffffff', 
          pixelRatio: targetPixelRatio, 
          filter: (node) => node.id !== 'map-controls' 
        });
        if (!blob) throw new Error('Failed to create blob');

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        globalToast.dismiss(toastId);
        globalToast.success('คัดลอกรูปภาพแผนที่ระดับ 8K ลง Clipboard สำเร็จแล้ว! สามารถนำไปวางได้ทันที 📸✨');
      } catch (err) {
        console.error('Error copying map image to clipboard', err);
        // Fallback: download the image instead of failing
        try {
          const containerWidth = container.getBoundingClientRect().width || container.clientWidth || 1000;
          const targetPixelRatio = Math.min(8, Math.max(4, 7680 / containerWidth));
          const dataUrl = await toPng(container, { 
            backgroundColor: '#ffffff', 
            pixelRatio: targetPixelRatio, 
            filter: (node) => node.id !== 'map-controls' 
          });
          const link = document.createElement('a');
          link.download = `resort-map-${activeZone}-8k-fallback.png`;
          link.href = dataUrl;
          link.click();
          globalToast.dismiss(toastId);
          globalToast.warning('คัดลอกลง Clipboard ไม่สำเร็จเนื่องจากระบบความปลอดภัยเบราว์เซอร์ ระบบดาวน์โหลดเป็นภาพ 8K แทนโดยอัตโนมัติ! 💾');
        } catch (fallbackErr) {
          globalToast.dismiss(toastId);
          globalToast.error('ไม่สามารถบันทึกหรือคัดลอกรูปภาพได้ กรุณาคลิกหน้าจอหนึ่งครั้งแล้วลองอีกครั้ง ❌');
        }
      }
    }
  };

  const DraggableAny = Draggable as any;

  return (
    <div className={`flex flex-col items-center w-full ${isFullscreen ? "fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-2 sm:p-8" : ""}`}>
      {toast && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-6 right-6 z-[10001] pointer-events-none animate-in fade-in slide-in-from-top-4">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center gap-3 max-w-sm pointer-events-auto bg-white ${
            toast.type === 'warning' ? 'border-amber-100 bg-amber-50/95 text-amber-900 shadow-amber-100' :
            toast.type === 'error' ? 'border-rose-100 bg-rose-50/95 text-rose-900 shadow-rose-100' :
            'border-emerald-100 bg-emerald-50/95 text-emerald-900 shadow-emerald-100'
          }`}>
            <span className="text-lg">
              {toast.type === 'warning' ? '⚠️' : toast.type === 'error' ? '❌' : '✅'}
            </span>
            <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
          </div>
        </div>,
        document.body
      )}
      {isFullscreen && (
        <div className="fixed inset-0 pointer-events-none z-[105]" />
      )}
      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)} className="fixed top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur text-white rounded-full flex items-center justify-center transition-colors z-[110] border border-white/20 shadow-2xl">
          <Minimize2 className="w-6 h-6" />
        </button>
      )}

      {/* Admin Quick Guide Button */}
      {isAdmin && !isFullscreen && (
        <div className="w-full max-w-5xl mb-2 flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest">Admin Map Tools</span>
            <button 
              onClick={startTour}
              className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" />
              สอนการใช้งาน (Tour)
            </button>
          </div>
          <button 
            onClick={() => setShowAdminHelp(true)}
            className="text-[10px] font-black text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors group"
          >
            <HelpCircle className="w-3 h-3 group-hover:rotate-12 transition-transform" />
            วิธีใช้งานโหมดตั้งค่า
          </button>
        </div>
      )}

      {/* Toolbar / Zone Selector / Admin Tools - MOVED TO MAIN TOOLBAR BELOW */}

      {/* Admin Background Upload Panel (Unified) */}
      {isAdmin && showAdminUpload && (
        <div className="w-full max-w-5xl mb-6 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-xl shadow-indigo-100/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <ImageIcon className="w-32 h-32 text-indigo-600" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="max-w-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <MapIcon className="w-4 h-4" />
                  </div>
                  <h4 className="font-black text-slate-800 tracking-tight">อัปโหลดแผนที่ใหม่: <span className="text-indigo-600">{activeZone === 'main' ? 'โซนรีสอร์ท' : activeZone === 'zone1' ? 'โซนโรงแรม 1' : 'โซนโรงแรม 2'}</span></h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  คุณสามารถเปลี่ยนรูปแผนที่ของโซนที่เลือกอยู่ได้โดยการอัปโหลดไฟล์ หรือระบุ URL รูปภาพโดยตรง
                </p>
                
                {/* Clear Map Button */}
                <button
                  onClick={() => {
                    if (window.confirm(`คุณต้องการลบรูปแผนที่ของ ${activeZone === 'main' ? 'โซนรีสอร์ท' : activeZone === 'zone1' ? 'โซนโรงแรม 1' : 'โซนโรงแรม 2'} และกลับไปใช้ค่าเริ่มต้นใช่หรือไม่?`)) {
                      onClearMap && onClearMap();
                    }
                  }}
                  className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black transition-all border border-rose-100"
                >
                  <Trash2 className="w-3 h-3" />
                  ล้างรูปแผนที่ (คืนค่าเริ่มต้น)
                </button>
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* File Upload Box */}
                  <div className="relative group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">อัปโหลดไฟล์ใหม่</label>
                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group-hover:shadow-sm">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onMapUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={uploadingMap}
                      />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                          {uploadingMap ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{uploadingMap ? 'กำลังอัปโหลด...' : 'เลือกไฟล์รูปภาพ'}</p>
                          <p className="text-[10px] text-slate-400">JPG, PNG หรือ WebP</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* URL Input Box */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ระบุ URL รูปภาพ</label>
                    <div className="space-y-2">
                      <div className="relative">
                        <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={mapUrlInput || ''}
                          onChange={(e) => setMapUrlInput && setMapUrlInput(e.target.value)}
                          placeholder="https://example.com/map.jpg"
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                        />
                      </div>
                      <button
                        onClick={onSaveMapUrl}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-100"
                      >
                        บันทึก URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Map Toolbar - Outside map container */}
      <div className={`w-full max-w-7xl flex flex-wrap items-center justify-between gap-4 px-2 ${isFullscreen ? 'mb-4 z-[120]' : 'mb-2'}`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs / Zone Selector integrated into toolbar */}
          {(!isAdmin || isFullscreen) && (
            <div id="map-zone-tabs" className={`flex p-1 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar ${isFullscreen ? 'bg-white/10 border-white/10 backdrop-blur-md' : 'bg-white border-slate-200'}`}>
              <button 
                onClick={() => setActiveZone("main")} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeZone === "main" 
                  ? (isFullscreen ? "bg-white text-slate-900 shadow-lg" : "bg-indigo-600 text-white shadow-md shadow-indigo-100") 
                  : (isFullscreen ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800")
                }`}
              >
                <MapIcon className={`w-3 h-3 ${activeZone === "main" ? (isFullscreen ? "text-slate-900" : "text-white") : (isFullscreen ? "text-white/40" : "text-slate-400")}`} />
                โซนรีสอร์ท
              </button>
              <button 
                onClick={() => setActiveZone("zone1")} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeZone === "zone1" 
                  ? (isFullscreen ? "bg-white text-slate-900 shadow-lg" : "bg-indigo-600 text-white shadow-md shadow-indigo-100") 
                  : (isFullscreen ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800")
                }`}
              >
                <MapIcon className={`w-3 h-3 ${activeZone === "zone1" ? (isFullscreen ? "text-slate-900" : "text-white") : (isFullscreen ? "text-white/40" : "text-slate-400")}`} />
                โรงแรม 1
              </button>
              <button 
                onClick={() => setActiveZone("zone2")} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeZone === "zone2" 
                  ? (isFullscreen ? "bg-white text-slate-900 shadow-lg" : "bg-indigo-600 text-white shadow-md shadow-indigo-100") 
                  : (isFullscreen ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800")
                }`}
              >
                <MapIcon className={`w-3 h-3 ${activeZone === "zone2" ? (isFullscreen ? "text-slate-900" : "text-white") : (isFullscreen ? "text-white/40" : "text-slate-400")}`} />
                โรงแรม 2
              </button>

              {zones.length > 0 && <div className={`w-px h-5 mx-1 self-center ${isFullscreen ? 'bg-white/20' : 'bg-slate-200'}`} />}

              {zones.map(zone => (
                <button 
                  key={zone.id}
                  onClick={() => setActiveZone(zone.id)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeZone === zone.id 
                    ? (isFullscreen ? "bg-indigo-500 text-white shadow-lg shadow-indigo-900/20" : "bg-indigo-600 text-white shadow-md shadow-indigo-100") 
                    : (isFullscreen ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800")
                  }`}
                >
                  <Sparkles className={`w-3 h-3 ${activeZone === zone.id ? "text-white" : (isFullscreen ? "text-indigo-400" : "text-indigo-300")}`} />
                  {zone.name}
                </button>
              ))}
            </div>
          )}

          {/* Admin Specific Tools inside Toolbar */}
          {isAdmin && !isFullscreen && (
            <div className="flex items-center gap-2">
              <button
                id="map-upload-btn"
                onClick={() => setShowAdminUpload(!showAdminUpload)}
                className={`flex items-center gap-1.5 h-10 px-4 rounded-xl text-[10px] font-black transition-all border shadow-sm active:scale-95 ${
                  showAdminUpload ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MapIcon className="w-3 h-3" />
                เพิ่มแผนที่
              </button>
              <button
                id="map-add-pin-btn"
                onClick={() => {
                  let suggestedSeq = '';
                  if (unpinnedRoomsInActiveZone.length > 0) {
                    const firstUnpinned = unpinnedRoomsInActiveZone[0];
                    setSelectedRoomToPinId(firstUnpinned.id);
                    if (firstUnpinned.sequence !== undefined) {
                      suggestedSeq = String(firstUnpinned.sequence);
                    }
                  } else {
                    setSelectedRoomToPinId('');
                  }
                  
                  if (!suggestedSeq) {
                    const zoneSeqs = allRoomsInZone
                      .map(r => r.sequence)
                      .filter((s): s is number => s !== undefined);
                    const maxSeq = zoneSeqs.length > 0 ? Math.max(...zoneSeqs) : 0;
                    
                    if (maxSeq > 0) {
                      suggestedSeq = String(maxSeq + 1);
                    } else {
                      suggestedSeq = activeZone === 'main' ? '1' : activeZone === 'zone1' ? '17' : activeZone === 'zone2' ? '20' : '1';
                    }
                  }
                  
                  setPinNumberInput(suggestedSeq);
                  setShowPinningModal(true);
                }}
                className="flex items-center gap-1.5 h-10 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black transition-all border border-indigo-100 shadow-sm active:scale-95"
              >
                <span>📍</span> เพิ่มหมุด
              </button>
            </div>
          )}

          {/* Search Trigger */}
          <div className="relative">
            <button 
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              className={`h-10 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm border active:scale-95 cursor-pointer font-bold text-xs ${showSearchPanel ? 'bg-indigo-500 text-white border-indigo-600 shadow-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
              <Search className={`w-3.5 h-3.5 ${showSearchPanel ? 'text-white' : 'text-indigo-500'}`} />
              <span>ค้นหาห้องพัก</span>
            </button>

            {/* Search Panel Overlay */}
            {showSearchPanel && (
              <div className="absolute top-14 left-0 bg-white/95 backdrop-blur-xl w-72 sm:w-85 rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden flex flex-col max-h-[500px] z-[150] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                  <Search className="w-4 h-4 text-indigo-500" />
                  <input 
                    autoFocus
                    placeholder="ค้นหาชื่อห้องพัก..." 
                    className="bg-transparent border-0 focus:ring-0 text-sm w-full font-bold text-slate-700 placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button onClick={() => setShowSearchPanel(false)} className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                
                <div className="overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {rooms.filter(r => {
                    const isVisible = r.roomName?.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesZone = (activeZone === 'main' && r.mapPosition) || 
                                       (activeZone === 'zone1' && r.mapPositionZone1) || 
                                       (activeZone === 'zone2' && r.mapPositionZone2);
                    return isVisible && matchesZone;
                  }).length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">ไม่พบห้องพักที่ค้นหา</p>
                    </div>
                  ) : (
                    rooms
                      .filter(r => {
                        const isVisible = r.roomName?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesZone = (activeZone === 'main' && r.mapPosition) || 
                                           (activeZone === 'zone1' && r.mapPositionZone1) || 
                                           (activeZone === 'zone2' && r.mapPositionZone2);
                        return isVisible && matchesZone;
                      })
                      .sort((a, b) => {
                        const occA = employees.filter(e => e.roomId === a.id).length;
                        const occB = employees.filter(e => e.roomId === b.id).length;
                        if (occA === 0 && occB > 0) return -1;
                        if (occA > 0 && occB === 0) return 1;
                        return (a.roomName || '').localeCompare(b.roomName || '');
                      })
                      .map(r => {
                        const occupantsCount = employees.filter(e => e.roomId === r.id).length;
                        const isFull = occupantsCount >= r.capacity;
                        const isEmpty = occupantsCount === 0;
                        
                        return (
                          <button
                            key={r.id}
                            onClick={() => {
                              setHighlightedRoomId(r.id);
                              if (isAdmin) {
                                setAdminActiveRoom(r);
                                const basePosition = (activeZone === 'main' ? r.mapPosition : activeZone === 'zone1' ? r.mapPositionZone1 : r.mapPositionZone2) || { x: 50, y: 50 };
                                setAdminActivePos(basePosition);
                              } else {
                                if (onRoomSelect) onRoomSelect(r);
                                else setSelectedRoom(r);
                              }
                              setShowSearchPanel(false);
                            }}
                            className={`w-full px-4 py-3.5 flex items-center justify-between hover:bg-indigo-50 transition-all border-l-4 ${highlightedRoomId === r.id ? 'bg-indigo-50/80 border-indigo-500' : 'border-transparent'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${isEmpty ? 'bg-emerald-500' : isFull ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                              <div className="text-left">
                                <p className="text-sm font-black text-slate-700 leading-tight">{r.roomName}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{r.roomType || 'Standard'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-sm ${isEmpty ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : isFull ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                {isEmpty ? 'ว่าง' : isFull ? 'เต็ม' : `${occupantsCount}/${r.capacity}`}
                              </span>
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Pill-Style Legend */}
          <motion.div 
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-2 p-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm overflow-x-auto scrollbar-none"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 group relative cursor-help shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 border border-white shadow-sm" />
              <span className="text-[11px] font-bold text-slate-600">ว่าง</span>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-[160] shadow-xl translate-y-1 group-hover:translate-y-0">
                ไม่มีผู้เข้าพักอาศัย
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 group relative cursor-help shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 border border-white shadow-sm animate-pulse" />
              <span className="text-[11px] font-bold text-slate-600">มีคนพัก</span>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-[160] shadow-xl translate-y-1 group-hover:translate-y-0">
                เข้าพักบางส่วน (ยังไม่เต็ม)
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 group relative cursor-help shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 border border-white shadow-sm" />
              <span className="text-[11px] font-bold text-slate-600">เต็ม</span>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-[160] shadow-xl translate-y-1 group-hover:translate-y-0">
                ผู้เข้าพักเต็มจำนวนความจุ
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Zone Title */}
        {isFullscreen && (
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 hidden md:block">
            <span className="text-white font-black tracking-widest text-xs uppercase">
              {activeZone === 'main' ? 'แผนที่รวม' : activeZone === 'zone1' ? 'โซนบ้านพัก 1' : 'โซนบ้านพัก 2'}
            </span>
          </div>
        )}
      </div>

      <div id="map-container" 
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative bg-slate-200 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200 m-auto touch-none ${isFullscreen ? "w-full h-full flex items-center justify-center" : "w-full border-4 border-white"}`}
          style={mapRatio ? { 
             aspectRatio: mapRatio, 
             maxWidth: isFullscreen ? `calc(90vh * ${mapRatio})` : `min(100%, calc(70vh * ${mapRatio}))`,
             maxHeight: isFullscreen ? '90vh' : '70vh'
          } : {}}
        >
        {/* Minimap Indicator */}
        <AnimatePresence>
          {zoom > 1.1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 w-32 aspect-video bg-white/80 backdrop-blur-md rounded-xl border border-white shadow-xl z-[125] overflow-hidden hidden sm:block p-1"
            >
              <div className="relative w-full h-full bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                <img 
                  src={currentMapUrl || "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23cbd5e1%22%2F%3E%3C/svg%3E"} 
                  className="w-full h-full object-cover opacity-50"
                  alt="minimap"
                />
                <div 
                  className="absolute border-2 border-indigo-500 bg-indigo-500/20 rounded shadow-[0_0_8px_rgba(79,70,229,0.4)] transition-all duration-100 ease-out"
                  style={minimapViewportStyle}
                />
              </div>
              <div className="absolute top-1 right-1">
                <span className="text-[8px] font-bold text-slate-400 bg-white/80 px-1 rounded uppercase tracking-tighter">Minimap</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Search & Legend Area Removed from here */}

        <div id="map-controls" 
             className={`absolute top-4 right-4 flex flex-col items-end gap-2 ${isFullscreen ? 'z-[120]' : 'z-45'}`}
             onMouseLeave={() => setShowControls(false)}
        >
          {/* Top Row: Zoom Controls + Gear Toggle */}
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showControls && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <button 
                    onClick={handleReset} 
                    title="รีเซ็ตตำแหน่ง"
                    className="group w-9 h-9 bg-white/90 backdrop-blur hover:bg-white text-slate-700 rounded-xl flex items-center justify-center transition-all shadow-lg border border-slate-200 active:scale-95 relative cursor-pointer"
                  >
                    <Focus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))} 
                    title="ซูมออก"
                    className="group w-9 h-9 bg-white/90 backdrop-blur hover:bg-white text-slate-700 rounded-xl flex items-center justify-center transition-all shadow-lg border border-slate-200 active:scale-95 relative cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setZoom(prev => Math.min(prev + 0.5, 5))} 
                    title="ซูมเข้า"
                    className="group w-9 h-9 bg-white/90 backdrop-blur hover:bg-white text-slate-700 rounded-xl flex items-center justify-center transition-all shadow-lg border border-slate-200 active:scale-95 relative cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Toggle Button - Gear Icon */}
            <button 
              onClick={() => setShowControls(!showControls)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-xl border active:scale-90 z-[131] cursor-pointer ${showControls ? 'bg-indigo-600 text-white border-indigo-700 rotate-90' : 'bg-white/90 backdrop-blur text-slate-700 border-slate-200 hover:bg-white'}`}
              title="เครื่องมือแผนที่"
            >
              {showControls ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </button>
          </div>

          {/* Vertical Actions below Gear Toggle */}
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-end gap-2"
              >
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)} 
                  title={isFullscreen ? "ย่อหน้าจอ" : "ขยายเต็มจอ"}
                  className="group w-9 h-9 bg-white/90 backdrop-blur hover:bg-white text-slate-700 rounded-xl flex items-center justify-center transition-all shadow-lg border border-slate-200 active:scale-95 relative cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={handleCopy} 
                  title="คัดลอกรูปภาพ"
                  className="group w-9 h-9 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg border border-indigo-600 active:scale-95 relative cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleDownload} 
                  title="ดาวน์โหลดรูปภาพ"
                  className="group w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg border border-emerald-600 active:scale-95 relative cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <DraggableAny
          nodeRef={mapNodeRef}
          disabled={zoom === 1}
          position={pan}
          onDrag={(_e: any, data: any) => setPan({ x: data.x, y: data.y })}
          scale={zoom}
        >
          <div ref={mapNodeRef} className={`w-full h-full relative ${isResetting ? 'transition-transform duration-400 ease-out' : ''}`}>
            <div className={`w-full h-full relative ${isResetting ? 'transition-transform duration-400 ease-out' : 'transition-transform duration-200 ease-out'}`} style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
            <img
              src={currentMapUrl || "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20fill%3D%22%23475569%22%3E%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%93%E0%B8%B2%E0%B8%AD%E0%B8%B1%E0%B8%9B%E0%B9%82%E0%B8%AB%E0%B8%A5%E0%B8%94%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9B%E0%B9%82%E0%B8%8B%E0%B8%99%E0%B8%99%E0%B8%B5%E0%B9%89%3C%2Ftext%3E%3C%2Fsvg%3E"}
              alt="Resort Map"
              className="w-full h-full block select-none pointer-events-none"
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
              const occupantsCount = occupants.length;
              const status = occupantsCount === 0 
                ? 'empty' 
                : occupantsCount >= room.capacity 
                  ? 'full' 
                  : 'partial';
              
              const basePosition = (activeZone === 'main' ? room.mapPosition : activeZone === 'zone1' ? room.mapPositionZone1 : room.mapPositionZone2) || { 
                x: 5 + (index % 5) * 20, 
                y: 5 + Math.floor(index / 5) * 20 
              };
              
              const position = optimisticPositions[room.id] || basePosition;
              
              const stableIndex = allRoomsInZone.findIndex(r => r.id === room.id);
              const pinNumber = room.sequence !== undefined 
                ? Number(room.sequence) 
                : (activeZone === 'main' ? stableIndex + 1 : activeZone === 'zone1' ? stableIndex + 17 : stableIndex + 20);
    
              if (isAdmin) {
                return (
                  <React.Fragment key={room.id}>
                      <DraggableWrapper 
                      room={room} 
                      status={status} 
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
                      isHighlighted={highlightedRoomId === room.id}
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
                  <Pin room={room} status={status} isAdmin={isAdmin} setSelectedRoom={setSelectedRoom} onRoomSelect={onRoomSelect} index={pinNumber - 1} position={position} isActive={false} isHighlighted={highlightedRoomId === room.id} />
                </div>
              );
            })}
            </div>
          </div>
        </DraggableAny>
      </div>

      {/* Admin Editor Modal Overlay */}
      {isAdmin && adminActiveRoom && adminActivePos && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[300px] pointer-events-none">
          <div className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-indigo-50 pointer-events-auto animate-in slide-in-from-bottom-4 duration-200 relative">
            <button 
              onClick={() => {
                setAdminActiveRoom(null);
                setAdminActivePos(null);
              }}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors cursor-pointer"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">กำลังตั้งค่าตำแหน่ง</p>
            
            <p className="text-xs font-bold text-indigo-600 mb-4 bg-indigo-50 py-1.5 px-3 rounded-lg text-center pr-6">
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
            
             <div className="flex gap-2">
               <button
                 onClick={async () => {
                   if (window.confirm(`คุณต้องการนำหมุดห้อง "${adminActiveRoom.roomName}" ออกจากผังนี้ใช่หรือไม่?`)) {
                     try {
                       const updatedRoom = { ...adminActiveRoom };
                       if (activeZone === 'main') {
                         updatedRoom.mapPosition = null as any;
                       } else if (activeZone === 'zone1') {
                         updatedRoom.mapPositionZone1 = null as any;
                       } else if (activeZone === 'zone2') {
                         updatedRoom.mapPositionZone2 = null as any;
                       } else {
                         if (!updatedRoom.zonePositions) updatedRoom.zonePositions = {};
                         updatedRoom.zonePositions = {
                           ...updatedRoom.zonePositions,
                           [activeZone]: null as any
                         };
                       }
                       if (onUpdateRoom) {
                         await onUpdateRoom(updatedRoom);
                       }
                       setAdminActiveRoom(null);
                       setAdminActivePos(null);
                       showToast(`🗑️ นำหมุดห้อง "${updatedRoom.roomName}" ออกจากผังเรียบร้อยแล้ว`, 'success');
                     } catch (err) {
                       console.error("Error removing pin position:", err);
                       showToast(`เกิดข้อผิดพลาดในการนำหมุดออก`, 'error');
                     }
                   }
                 }}
                 className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all border border-rose-100/60 active:scale-95"
               >
                 ลบหมุดออก
               </button>
               <button
                 onClick={() => {
                   const room = adminActiveRoom;
                   const pos = adminActivePos;
                   
                   setOptimisticPositions(prev => ({ ...prev, [room.id]: pos }));
                   
                   handleStop(room, pos);
                   setAdminActiveRoom(null);
                   setAdminActivePos(null);
                 }}
                 className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-100 active:scale-95"
               >
                 บันทึกหมุด
               </button>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal */}
      {selectedRoom && typeof document !== 'undefined' && (() => {
        const specialBadges = getSpecialBadges(selectedRoom);
        return createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setSelectedRoom(null)}>
            <div className="bg-white p-5 sm:p-6 rounded-3xl w-full max-w-[340px] sm:max-w-md md:max-w-[460px] max-h-[90vh] shadow-2xl border-4 border-indigo-50 flex flex-col relative" onClick={(e) => e.stopPropagation()}>
              
              {/* Top-right 'X' close button */}
              <button
                onClick={() => setSelectedRoom(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm cursor-pointer z-10"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-3 sm:mb-4 shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-lg sm:text-xl">🏠</span>
                </div>
                <h3 className="font-black text-base sm:text-lg text-slate-800 pr-6">{selectedRoom.roomName}</h3>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">ID: {selectedRoom.id.slice(0, 6)}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">จุได้: {selectedRoom.capacity}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-slate-100 rounded-full">
                  <div className={`w-1.5 h-1.5 rounded-full ${employees.filter(e => e.roomId === selectedRoom.id).length >= selectedRoom.capacity ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    พักแล้ว {employees.filter(e => e.roomId === selectedRoom.id).length} / {selectedRoom.capacity} คน
                  </span>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-1 -mx-1">
                
                {/* Room Specifications & Conditions */}
                <div className="space-y-2">
                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">รายละเอียด & เงื่อนไขห้องพัก</p>
                  <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 space-y-3 text-xs">
                    {/* Row 1: Room Type & Floor */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <span className="text-[9px] text-slate-400 font-bold uppercase leading-none">ประเภทห้อง</span>
                        <span className="font-extrabold text-slate-700 mt-1 truncate" title={selectedRoom.roomType}>{selectedRoom.roomType || 'ทั่วไป'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <span className="text-[9px] text-slate-400 font-bold uppercase leading-none">ชั้น / ระดับ</span>
                        <span className="font-extrabold text-slate-700 mt-1 truncate">{selectedRoom.floor ? `ชั้น ${selectedRoom.floor}` : 'ทั่วไป'}</span>
                      </div>
                    </div>

                    {/* Row 2: Gender Restriction */}
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">เงื่อนไขสิทธิ์</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                        selectedRoom.genderRestriction === 'ชายล้วน' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        selectedRoom.genderRestriction === 'หญิงล้วน' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        {selectedRoom.genderRestriction === 'ชายล้วน' ? '🔵 ชายล้วน' :
                         selectedRoom.genderRestriction === 'หญิงล้วน' ? '🔴 หญิงล้วน' :
                         '⚪ ไม่จำกัดเพศ'}
                      </span>
                    </div>

                    {/* Dynamic Condition Badges */}
                    {specialBadges.length > 0 && (
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col gap-2 text-left">
                        <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">🏷️ คุณลักษณะพิเศษ / เงื่อนไข</span>
                        <div className="flex flex-wrap gap-1.5">
                          {specialBadges.map((badge, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${badge.bgColor} ${badge.color} ${badge.borderColor}`}
                            >
                              {badge.icon}
                              <span>{badge.text}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Row 3: Notes / Remarks */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/40 flex flex-col gap-2 text-left transition-all">
                      <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        หมายเหตุ / เงื่อนไขเพิ่มเติม
                      </span>
                      <p className="text-[11px] text-slate-700 font-medium leading-relaxed whitespace-pre-line break-words bg-white/80 p-2.5 rounded-lg border border-amber-100">
                        {selectedRoom.notes && selectedRoom.notes.trim() ? selectedRoom.notes : 'ไม่มีเงื่อนไขเพิ่มเติม'}
                      </p>
                    </div>
                  </div>
                </div>

              {/* Guest List */}
              <div className="space-y-2">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">รายชื่อผู้เข้าพัก</p>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                  {employees.filter(e => e.roomId === selectedRoom.id).map(emp => (
                    <div key={emp.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-indigo-600 border border-indigo-100 shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] sm:text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                        <p className="text-[9px] font-medium text-slate-400 truncate">{emp.department}</p>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        emp.gender === 'ชาย' ? 'bg-blue-50 text-blue-500' : 'bg-rose-50 text-rose-500'
                      }`}>
                        {emp.gender}
                      </span>
                    </div>
                  ))}
                  {employees.filter(e => e.roomId === selectedRoom.id).length === 0 && (
                    <div className="py-4 text-center bg-white rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-medium text-slate-400">ยังไม่มีผู้เข้าพัก</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
            
            <div className="pt-4 shrink-0 mt-auto flex gap-2">
              <button 
                className="flex-1 py-2.5 sm:py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-sm border border-slate-200 active:scale-95"
                onClick={() => setSelectedRoom(null)}
              >
                ปิดหน้าต่าง
              </button>
              <button 
                className="flex-1 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-1.5"
                onClick={() => {
                  if (setBookingSelectedRoomId) setBookingSelectedRoomId(selectedRoom.id);
                  if (setActiveTab) setActiveTab('booking');
                  // Exit full-screen to ensure the booking wizard/next screen is visible
                  setIsFullscreen(false);
                  setSelectedRoom(null);
                }}
              >
                จองห้องนี้ / จัดการคนเข้าพัก
              </button>
            </div>
          </div>
        </div>,
        document.body
        );
      })()}
 
      {/* Pinning Modal */}
      {isAdmin && showPinningModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4" onClick={() => setShowPinningModal(false)}>
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border-4 border-indigo-50 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                <span className="text-lg">📍</span> 
                เพิ่ม/ตั้งค่าหมุดห้องพัก ({activeZone === 'main' ? 'โซนรีสอร์ท' : activeZone === 'zone1' ? 'โซนโรงแรม 1' : 'โซนโรงแรม 2'})
              </h3>
              <button 
                onClick={() => setShowPinningModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">กำหนดหมายเลขหมุด / ลำดับห้องพัก</label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={pinNumberInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPinNumberInput(val);
                    // If matchedRoom changes or is empty, select a default unpinned room
                    const num = parseInt(val.trim(), 10);
                    if (!isNaN(num)) {
                      const matched = rooms.find(r => r.sequence !== undefined && Number(r.sequence) === num);
                      if (!matched && unpinnedRoomsInActiveZone.length > 0) {
                        setSelectedRoomToPinId(unpinnedRoomsInActiveZone[0].id);
                      }
                    }
                  }}
                  placeholder="ตัวอย่างเช่น 1, 17, 20"
                  className="w-full border-2 border-indigo-100 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-colors font-bold bg-indigo-50/20"
                />
              </div>

              {parsedPinNumber === null ? (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-[11px] leading-relaxed">
                  ⚠️ กรุณากรอกหมายเลขหมุดเพื่อทำการตรวจสอบข้อมูล
                </div>
              ) : matchedRoom ? (
                isMatchedRoomPinned ? (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-[11px] leading-relaxed space-y-1">
                      <p className="font-black text-rose-800 flex items-center gap-1.5">
                        <span>⚠️</span> หมายเลขหมุด {parsedPinNumber} ถูกใช้งานแล้ว
                      </p>
                      <p className="text-[10px] text-rose-600/90">
                        หมุดหมายเลขนี้ถูกเชื่อมโยงและปักบนแผนที่เรียบร้อยแล้ว หากต้องการย้ายตำแหน่ง สามารถลากหมุดบนแผนที่ได้โดยตรง
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] space-y-1.5">
                      <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">รายละเอียดห้องพักที่ใช้หมุดนี้</p>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ชื่อห้องพัก:</span>
                        <span className="font-black text-slate-700">{matchedRoom.roomName || matchedRoom.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ประเภทห้องพัก:</span>
                        <span className="font-bold text-slate-600">{matchedRoom.roomType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ชั้น:</span>
                        <span className="font-bold text-slate-600">{matchedRoom.floor} ชั้น</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ความจุ:</span>
                        <span className="font-bold text-slate-600">{matchedRoom.capacity} ท่าน</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-[11px] leading-relaxed space-y-1">
                      <p className="font-black text-emerald-900 flex items-center gap-1.5">
                        <span>🟢</span> พบการเชื่อมโยงห้องพัก (ยังไม่ปักหมุด)
                      </p>
                      <p className="text-[10px] text-emerald-700/90">
                        พบห้องพัก "{matchedRoom.roomName || matchedRoom.id}" ลำดับที่ {parsedPinNumber} ในระบบ สามารถกดปุ่มเพื่อปักหมุดลงบนแผนที่ได้ทันที
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] space-y-1.5">
                      <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">รายละเอียดห้องพัก</p>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ชื่อห้องพัก:</span>
                        <span className="font-black text-slate-700">{matchedRoom.roomName || matchedRoom.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ประเภทห้องพัก:</span>
                        <span className="font-bold text-slate-600">{matchedRoom.roomType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ชั้น:</span>
                        <span className="font-bold text-slate-600">{matchedRoom.floor} ชั้น</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ความจุ:</span>
                        <span className="font-bold text-slate-600">{matchedRoom.capacity} ท่าน</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800 text-[11px] leading-relaxed space-y-1">
                    <p className="font-black text-blue-950 flex items-center gap-1.5">
                      <span>🔍</span> ไม่พบข้อมูลการเชื่อมโยงหมุดนี้
                    </p>
                    <p className="text-[10px] text-blue-700/90">
                      ไม่พบห้องพักที่มีหมุดลำดับที่ {parsedPinNumber} ในระบบ คุณสามารถเลือกเชื่อมโยงหมายเลขนี้กับห้องพักที่ยังไม่ปักหมุดด้านล่างได้
                    </p>
                  </div>

                  {unpinnedRoomsInActiveZone.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      ไม่มีห้องพักที่ยังไม่ได้ปักหมุดในโซนปัจจุบัน
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">เลือกห้องพักเพื่อกำหนดเป็นหมุด {parsedPinNumber}</label>
                      <select
                        value={selectedRoomToPinId}
                        onChange={(e) => setSelectedRoomToPinId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      >
                        <option value="">-- เลือกห้องพักที่ยังไม่ปักหมุด --</option>
                        {unpinnedRoomsInActiveZone.map(room => (
                          <option key={room.id} value={room.id}>
                            {room.roomName || room.id} ({room.roomType})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPinningModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={
                  parsedPinNumber === null || 
                  (matchedRoom ? isMatchedRoomPinned : (!selectedRoomToPinId))
                }
                onClick={async () => {
                  if (parsedPinNumber === null) return;
                  
                  if (matchedRoom) {
                    try {
                      await handleStop(matchedRoom, { x: 50, y: 50 });
                      setAdminActiveRoom(matchedRoom);
                      setAdminActivePos({ x: 50, y: 50 });
                      setShowPinningModal(false);
                      showToast(`🎉 ปักหมุดห้อง "${matchedRoom.roomName || matchedRoom.id}" ลงบนแผนที่เรียบร้อยแล้ว`, 'success');
                    } catch (err) {
                      console.error("Error pinning matched room:", err);
                      showToast(`เกิดข้อผิดพลาดในการปักหมุด`, 'error');
                    }
                  } else if (selectedRoomToPinId) {
                    const targetRoom = rooms.find(r => r.id === selectedRoomToPinId);
                    if (targetRoom) {
                      try {
                        const updatePayload = { ...targetRoom, sequence: parsedPinNumber };
                        // Update sequence first
                        if (onUpdateRoom) {
                          await onUpdateRoom(updatePayload);
                        }
                        // Then save map position
                        await handleStop(updatePayload, { x: 50, y: 50 });
                        setAdminActiveRoom(updatePayload);
                        setAdminActivePos({ x: 50, y: 50 });
                        setShowPinningModal(false);
                        showToast(`🎉 เชื่อมโยงหมุดหมายเลข ${parsedPinNumber} และปักหมุดสำเร็จ`, 'success');
                      } catch (err) {
                        console.error("Error linking and pinning room:", err);
                        showToast(`เกิดข้อผิดพลาดในการเชื่อมโยงและปักหมุด`, 'error');
                      }
                    }
                  }
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-100 active:scale-95 text-center cursor-pointer"
              >
                {matchedRoom ? 'ปักหมุดลงแผนที่' : 'เชื่อมโยงและปักหมุด'}
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
      {/* Admin Help Modal */}
      {isAdmin && showAdminHelp && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300" onClick={() => setShowAdminHelp(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl border-[6px] border-indigo-50/50 flex flex-col relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-full -ml-32 -mb-32 opacity-50 blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative p-8 sm:p-10 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
              <button 
                onClick={() => setShowAdminHelp(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
                  <HelpCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">คู่มือการตั้งค่าผังรีสอร์ต</h2>
                  <p className="text-sm text-slate-500 font-medium">ทำความเข้าใจระบบ Interactive Map ใน 1 นาที</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-y-auto p-8 sm:p-10 space-y-10">
              {/* Step 1 */}
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-400 shrink-0 border border-slate-200">1</div>
                <div>
                  <h4 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-indigo-500" />
                    การเปลี่ยนโซนแผนที่
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    ใช้ปุ่ม <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">โซนรีสอร์ท</span>, <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">โซนโรงแรม 1-2</span> ด้านบนเพื่อสลับดูผังของแต่ละพื้นที่ หมุดห้องพักจะถูกแยกเก็บตามโซนที่คุณเลือก
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-400 shrink-0 border border-slate-200">2</div>
                <div>
                  <h4 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-indigo-500" />
                    การเปลี่ยนรูปแผนที่ที่พัก
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    กดปุ่ม <span className="bg-white text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">เปลี่ยนรูปแผนที่</span> เพื่อเปิดแผงอัปโหลด คุณสามารถเลือกไฟล์จากเครื่อง หรือแปะ URL รูปภาพเพื่อเปลี่ยนพื้นหลังของโซนที่กำลังเลือกอยู่ได้ และสามารถกด <span className="text-rose-600 font-bold">ล้างรูปแผนที่</span> เพื่อคืนค่าเดิมได้
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-400 shrink-0 border border-slate-200">3</div>
                <div>
                  <h4 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
                    <span>📍</span>
                    การวางหมุดห้องพัก
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    หากห้องพักใดยังไม่มีหมุด ให้กดปุ่ม <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">เพิ่มหมุดห้องพัก</span> แล้วเลือกห้อง ระบบจะวางหมุดไว้ตรงกลางแผนที่ให้คุณลากไปวางตำแหน่งจริง
                  </p>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      <b>เคล็ดลับ:</b> คุณสามารถคลิกค้างที่หมุดที่มีอยู่แล้วเพื่อ <b>"ลาก"</b> เปลี่ยนตำแหน่งได้ตลอดเวลา อย่าลืมกด <b>"บันทึกหมุด"</b> ที่หน้าต่างสีขาวด้านล่างหลังจากวางตำแหน่งเสร็จสิ้น
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 sm:p-10 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setShowAdminHelp(false)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
              >
                เข้าใจแล้ว เริ่มใช้งานเลย
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Admin Step-by-Step Tour Overlay */}
      {isAdmin && tourStep !== null && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[11000] pointer-events-none">
          {/* Subtle Background Dimming */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
          
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-auto">
            <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl border-[4px] border-indigo-600 relative overflow-hidden animate-in zoom-in-95 duration-300">
              {/* Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500" 
                  style={{ width: `${(tourStep / 4) * 100}%` }}
                />
              </div>

              <div className="p-6 pt-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-indigo-100">
                  {tourStep === 1 && '🗺️'}
                  {tourStep === 2 && '🖼️'}
                  {tourStep === 3 && '📍'}
                  {tourStep === 4 && '💡'}
                </div>

                <h3 className="text-lg font-black text-slate-800 mb-2 tracking-tight">
                  {tourStep === 1 && 'ยินดีต้อนรับสู่โหมดแผนที่'}
                  {tourStep === 2 && 'การเปลี่ยนรูปแผนที่'}
                  {tourStep === 3 && 'การจัดการหมุดห้องพัก'}
                  {tourStep === 4 && 'พร้อมใช้งานแล้ว!'}
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed mb-6 px-2">
                  {tourStep === 1 && 'คุณสามารถแยกจัดการแผนที่ได้ 3 โซน (รีสอร์ท, โรงแรม 1, โรงแรม 2) โดยเลือกสลับได้ที่ปุ่มด้านบนครับ'}
                  {tourStep === 2 && 'หากต้องการเปลี่ยนรูปพื้นหลังหรือเพิ่มไฟล์แผนที่ใหม่ ให้กดปุ่ม "เพิ่มแผนที่ที่พัก" เพื่ออัปโหลดไฟล์ใหม่ได้ทันที'}
                  {tourStep === 3 && 'กด "เพิ่มหมุดห้องพัก" เพื่อวางห้องที่ยังไม่มีตำแหน่งลงบนแผนที่ ระบบจะวางไว้กลางจอให้คุณลากไปวางได้เลย'}
                  {tourStep === 4 && 'คุณสามารถคลิกค้างที่หมุดใดก็ได้เพื่อ "ลาก" เปลี่ยนตำแหน่งใหม่ และอย่าลืมกดบันทึกหลังจากแก้ไขเสร็จนะครับ'}
                </p>

                <div className="flex gap-2">
                  {tourStep > 1 && (
                    <button 
                      onClick={() => setTourStep(tourStep - 1)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs transition-all cursor-pointer"
                    >
                      ย้อนกลับ
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (tourStep < 4) {
                        setTourStep(tourStep + 1);
                        if (tourStep === 1) setShowAdminUpload(true);
                        if (tourStep === 2) setShowAdminUpload(false);
                      } else {
                        setTourStep(null);
                      }
                    }}
                    className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-indigo-200 cursor-pointer"
                  >
                    {tourStep < 4 ? 'ขั้นตอนถัดไป' : 'เข้าใจแล้ว เริ่มเลย!'}
                  </button>
                </div>

                <button 
                  onClick={() => setTourStep(null)}
                  className="mt-4 text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ข้ามการแนะนำ
                </button>
              </div>
            </div>
          </div>

          {/* Visual Indicators (Dynamic Spotlight) */}
          {spotlightRect && (
            <div 
              className="absolute border-2 border-indigo-600 border-dashed rounded-2xl animate-pulse shadow-[0_0_0_9999px_rgba(15,23,42,0.4)] transition-all duration-300"
              style={{
                top: spotlightRect.top - 4,
                left: spotlightRect.left - 4,
                width: spotlightRect.width + 8,
                height: spotlightRect.height + 8
              }}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
