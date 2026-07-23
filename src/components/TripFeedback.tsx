import React, { useState, useMemo, useEffect } from 'react';
import type { Employee, TripFeedback } from '../types';
import { 
  Star, 
  MessageSquare, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  User, 
  Users, 
  Plus, 
  Send, 
  ThumbsUp, 
  Award, 
  ClipboardCheck, 
  Building2, 
  AlertCircle,
  TrendingUp,
  Smile,
  Megaphone,
  Check,
  Shield,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  HelpCircle,
  Compass,
  Home,
  Coffee,
  CheckCircle,
  Sparkle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';
import { wipeAllFeedbacksInFirestore } from '../lib/firebaseService';
import FeedbackAnalytics from './FeedbackAnalytics';
import SurveyDashboard from './SurveyDashboard';

// Safely play custom retro-synthesized audio cues using the Web Audio API
const playSound = (type: 'hover' | 'select' | 'success' | 'click' | 'back', soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'select') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now); // G4
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.1); // C5
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'back') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.12); // F4
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'success') {
      // Arpeggio sound C5 -> E5 -> G5 -> C6
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, idx) => {
        const oscNode = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscNode.type = 'sine';
        oscNode.frequency.setValueAtTime(f, now + idx * 0.07);
        gainNode.gain.setValueAtTime(0.05, now + idx * 0.07);
        gainNode.gain.linearRampToValueAtTime(0, now + idx * 0.07 + 0.22);
        oscNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscNode.start(now + idx * 0.07);
        oscNode.stop(now + idx * 0.07 + 0.22);
      });
    }
  } catch (e) {
    console.warn('Audio synthesis restricted or unsupported:', e);
  }
};

// Map score to custom Thai feedback labels and interactive animated emojis
const getScoreReaction = (score: number) => {
  switch (score) {
    case 1:
      return {
        emoji: '😭',
        label: 'ต้องปรับปรุงด่วนที่สุด',
        color: 'text-red-950 bg-red-100 border-red-300 font-extrabold',
        quote: 'แย่มากเลย รู้สึกไม่โอเคและติดขัดหลายจุด'
      };
    case 2:
      return {
        emoji: '😞',
        label: 'พอใช้ได้ / ยังมีข้อบกพร่อง',
        color: 'text-orange-950 bg-orange-100 border-orange-300 font-extrabold',
        quote: 'ค่อนข้างเงียบเหงาหรือยังมีจุดที่ขาดหายไปบ้าง'
      };
    case 3:
      return {
        emoji: '😐',
        label: 'ปานกลาง / พอใจระดับเฉลี่ยทั่วไป',
        color: 'text-amber-950 bg-amber-100 border-amber-300 font-extrabold',
        quote: 'พอใช้ได้ ทั่วๆ ไป มีทั้งจุดที่ดีและจุดที่อยากให้ปรับปรุง'
      };
    case 4:
      return {
        emoji: '😊',
        label: 'ดีงามมาก / ประทับใจเลยครับ',
        color: 'text-emerald-950 bg-emerald-100 border-emerald-300 font-extrabold',
        quote: 'ดีมาก สนุกสนาน ประทับใจในทุกมิติเลยครับ'
      };
    case 5:
      return {
        emoji: '🤩',
        label: 'ยอดเยี่ยมที่สุด / รักเลยทริปนี้',
        color: 'text-fuchsia-950 bg-fuchsia-100 border-fuchsia-300 font-extrabold',
        quote: 'ที่สุดของแจ้! สนุก ตื้นตันใจ อิ่มอกอิ่มใจ ได้ใจไปเลย 100/100!'
      };
    default:
      return {
        emoji: '😐',
        label: 'ปานกลาง / พอใจระดับเฉลี่ยทั่วไป',
        color: 'text-slate-950 bg-slate-100 border-slate-300 font-extrabold',
        quote: 'พอใช้ได้ ทั่วๆ ไป'
      };
  }
};

const ideaCardsLikedMost = [
  {
    id: 'like-party',
    title: 'อาหารอร่อยโต๊ะจีน & ขาหมูเชลล์ชวนชิม 🍲😋',
    subtitle: 'อิ่มอร่อยจนลืมไดเอท ขาหมูนุ่มละมุนกินจนฟินยกโต๊ะ',
    description: 'ประทับใจอาหารจัดเลี้ยงโต๊ะจีนมากครับ โดยเฉพาะขาหมูเชลล์ชวนชิมนุ่มละลายในปาก ปลานึ่งมะนาวแซ่บๆ กินจนลืมควบคุมน้ำหนักไปเลย คุ้มค่าและประทับใจสุดๆ 🍲✨',
    emoji: '🍲',
  },
  {
    id: 'like-hotel',
    title: 'นอนเปื่อยฟังเสียงลำธาร คีรีธารทิพย์ รีสอร์ท 🛌🌲',
    subtitle: 'ที่พักสวยบรรยากาศฮีลใจ นั่งเปื่อยฟังเสียงน้ำตกชาร์จแบตชีวิต',
    description: 'ที่พักคีรีธารทิพย์ รีสอร์ท บรรยากาศเงียบสงบ ร่มรื่นด้วยธรรมชาติ ได้นอนเปื่อยฟังเสียงลำธารฮีลใจ ช่วยชาร์จพลังกายพลังใจจากการทำงานหนักได้ร้อยเปอร์เซ็นต์ครับ 🌿✨',
    emoji: '🛌',
  },
  {
    id: 'like-spots',
    title: 'จุดแวะถ่ายรูป La Tosca & พนมรุ้ง เมมเต็มรูปปัง 📸🏛️',
    subtitle: 'วิวสวยสะกดใจ ถ่ายรูปจนแบตหมด แต่ได้รูปโปรไฟล์ใหม่ใช้ยาวถึงปีหน้า',
    description: 'ประทับใจจุดแวะถ่ายรูป La Tosca สไตล์ยุโรป และปราสาทพนมรุ้งมากครับ วิวสวยตระการตา ถ่ายรูปจนเมโมรี่การ์ดเต็ม ได้รูปโปรไฟล์ปังๆ เอาไว้ใช้อวดเพื่อนยาวๆ ไปเลย 📸💖',
    emoji: '📸',
  },
  {
    id: 'like-ceremony',
    title: 'งานเลี้ยงเกษียณ & ฉลองสังสรรค์สุดอบอุ่นซาบซึ้งใจ 💖✨',
    subtitle: 'บรรยากาศอบอุ่น ตื้นตันใจ ได้ส่งต่อมิตรภาพและความผูกพันดีๆ',
    description: 'ประทับใจงานเลี้ยงแสดงมุทิตาจิตเกษียณอายุราชการและงานเลี้ยงสังสรรค์ บรรยากาศอบอุ่นเป็นกันเอง ซาบซึ้งใจ ได้เห็นรอยยิ้มและความผูกพันของพี่ๆ น้องๆ ทุกคนครับ 💖🥺',
    emoji: '💖',
  },
  {
    id: 'like-concert',
    title: 'เวทีคาราโอเกะสายย่อ ปล่อยพลังเสียงหลงสะท้านทรวง 🎤⚡',
    subtitle: 'สนุกสนานฮากระจาย เสียงหลงไม่ว่า แต่ใจมันรักเวที!',
    description: 'ปาร์ตี้คาราโอเกะสนุกสนานฮากระจายมากครับ ได้เห็นพี่ๆ ทุกแผนกขึ้นสเต็ปแดนซ์ ร้องเพลงเสียงหลงแต่ความมันส์ระดับสิบ ปลดปล่อยความล้าจากการทำงานได้เกลี้ยงเลย 💃🎶',
    emoji: '🎤',
  },
  {
    id: 'like-staff',
    title: 'ทีมงานสตาฟและผู้จัดบริการอบอุ่นประดุจญาติมิตร 💐🥰',
    subtitle: 'คอยดูแล ถ่ายรูป และเสิร์ฟความสุขให้พวกเราตลอดทริป',
    description: 'ประทับใจความตั้งใจและไมตรีจิตของทีมงานสตาฟและผู้จัดงานมากครับ คอยอำนวยความสะดวก ถ่ายรูป และเสิร์ฟน้ำเสิร์ฟอาหารอย่างน่ารักและอบอุ่นมากครับ 💐✨',
    emoji: '💐',
  },
];

const ideaCardsSuggestions = [
  {
    id: 'sug-freetime',
    title: 'เสนอปรับเวลาเดินทางให้ผ่อนคลาย ไม่ต้องตื่นเช้าสู้ชีวิต ⏰🛌',
    subtitle: 'ปรับเวลาออกเดินทางให้สโลว์ไลฟ์ ไม่ต้องสะดุ้งตื่นตีสี่',
    description: 'เสนอให้ขยับเวลาออกเดินทางให้สายขึ้นนิดนึงครับ พนักงานไม่ได้เกลียดการเดินทาง แต่เกลียดการตื่นเช้าสู้ชีวิต ขอตื่นแบบสบายๆ ชาร์จแบตเต็มร้อยครับ ⏰✨',
    emoji: '⏰',
  },
  {
    id: 'sug-nature',
    title: 'ขอช่วงเวลา Free Time นั่งเปื่อยฮีลใจฟังเสียงลำธาร 🌲☕',
    subtitle: 'เติมพลังใจด้วยเสียงธรรมชาติ นั่งคุยเปิดใจกันริมน้ำตก',
    description: 'อยากให้เพิ่มช่วงเวลาพักผ่อนอิสระ นั่งจิบกาแฟฟังเสียงลำธารร่วมกัน เป็นช่วงเวลาสั้นๆ ที่ได้หยุดพัก นั่งคุยแลกเปลี่ยนมุมมองชีวิตและฮีลใจร่วมกันครับ 🌿☕',
    emoji: '🌲',
  },
  {
    id: 'sug-mookata',
    title: 'ปาร์ตี้หมูกระทะเยียวยาจิตใจ กระชับมิตรทุกแผนก 🥓❤️',
    subtitle: 'ย่างหมูไป นินทาความเหนื่อยไป แต่โคตรซาบซึ้งในความสนิทสนม',
    description: 'เสนอทริปหน้าปิ้งย่างหมูกระทะริมลำธารครับ ถึงควันจะโชยเข้าตา และต้องแย่งเบคอนกัน แต่การได้ล้อมวงกินของอร่อยมันทำให้พี่น้องทุกแผนกสนิทกันอย่างซึ้งใจจริงๆ ครับ 🥓❤️',
    emoji: '🥓',
  },
  {
    id: 'sug-music',
    title: 'ขยายเวลาปาร์ตี้คาราโอเกะโต้รุ่ง ลูกคอแปดชั้นสู้ชีวิต 💃🎤',
    subtitle: 'เสียงหลงไม่ว่า แต่ใจมันรักเวที ขอไมค์ไม่หลุดมือ!',
    description: 'เสนอขยายเวลาช่วงปาร์ตี้คาราโอเกะครับ เพลงยังร้องไม่ครบทุกยุค และลูกคอพี่ๆ ยังทำงานไม่ครบแปดชั้น อยากร้องให้คอแห้งไปข้างเลยครับ 🎤⚡',
    emoji: '🎤',
  },
  {
    id: 'sug-teambuilding',
    title: 'เพิ่มช่วงเวลาจับฉลากแจกรางวัลสายฮา & กิจกรรมกระชับมิตร 🎁⚡',
    subtitle: 'เน้นแจกจริง เน้นฮากระจาย ให้พนักงานได้ลุ้นรางวัลลืมวัย',
    description: 'เสนอทริปหน้าให้เพิ่มกิจกรรมเกมฮาๆ กระชับมิตร และการจับฉลากแจกของรางวัลสุดพีคครับ ไม่เน้นวิชาการ เน้นแจกจริง เน้นหัวเราะลืมเหนื่อย ให้ทุกคนได้ลุ้นรางวัลใหญ่กลับบ้านกันอย่างสะใจครับ! 🎁🎉',
    emoji: '🎁',
  },
  {
    id: 'sug-trip',
    title: 'ขอจัดทริปบรรยากาศดีๆ แบบนี้ทุกปี สัญญาว่าจะตั้งใจทำงาน! 🏔️🌊',
    subtitle: 'ทริปนี้โคตรดีจนไม่อยากกลับไปทำงาน แต่ถ้าสัญญาว่ามีทริปหน้า จะสู้ตายครับ!',
    description: 'ติดใจทริปนี้มากจนไม่อยากกลับไปเจอเอ็กเซลล์เลยครับ! แต่ถ้าบริษัทสัญญาว่าจะพาไปเที่ยวฮีลใจแบบนี้ทุกปี พวกเราก็พร้อมจะก้มหน้าก้มตาปั๊มยอดให้ปังๆ เลยครับ 🚀🥺',
    emoji: '🌿',
  },
];

const ideaCardsShoutout = [
  {
    id: 'shout-staff',
    title: 'ขอบคุณทีมสตาฟและผู้จัด ดูดูแลดียิ่งกว่าคนคุย! 💐👑',
    subtitle: 'บริการระดับห้าดาว เสิร์ฟน้ำ เติมอาหาร ดูดูแลดียันก้าวขึ้นรถ',
    description: 'ขอขอบคุณทีมงานสตาฟและผู้จัดงานทุกท่านที่ทุ่มเทดูแลพวกเราดียิ่งกว่าคนคุย! อาหารไม่เคยขาด น้ำไม่เคยแห้ง ดูแลดีจนอบอุ่นหัวใจและประทับใจสุดๆ ครับ 🙏👑',
    emoji: '💐',
  },
  {
    id: 'shout-management',
    title: 'ขอบพระคุณผู้บริหารและองค์กรสำหรับทริปฮีลใจสุดพิเศษ 🥺❤️',
    subtitle: 'สนับสนุนทริปสัมมนาชาร์จพลัง เติมขวัญและกำลังใจพนักงาน',
    description: 'ขอขอบพระคุณคณะผู้บริหารและองค์กรที่มอบโอกาสทริปสัมมนาชาร์จพลังประจำปีนี้ เป็นทริปที่เติมเต็มรอยยิ้ม ความสุข และทำให้รู้สึกภาคภูมิใจที่ได้เป็นส่วนหนึ่งขององค์กรนี้ครับ 💖✨',
    emoji: '❤️',
  },
  {
    id: 'shout-roommate',
    title: 'ขอบคุณรูมเมทที่กรนแข่งกัน และอยู่เคียงข้างตลอดคืนและตลอดทริป 🤝😴',
    subtitle: 'ถึงจะแย่งกันใช้ห้องน้ำ แต่ก็ช่วยกันหารของกินและแบ่งปันรอยยิ้ม',
    description: 'ขอบคุณรูมเมทและเพื่อนร่วมทางทุกคนครับ ถึงจะนอนกรนประสานเสียงแข่งกันตลอดคืน แต่ก็คอยแบ่งขนม ดูแลกันตอนเมา และอยู่เคียงข้างตลอดทริป เป็นมิตรภาพที่ฮาและซึ้งใจมากๆ ครับ 🤝💖',
    emoji: '🤝',
  },
  {
    id: 'shout-karaoke-hero',
    title: 'ยกย่องนักร้องสายย่อและตัวตึงประจำทริป 🎤⚡',
    subtitle: 'สร้างสีสัน เสียงหัวเราะ และเอ็นเตอร์เทนจนงานไม่มีเงียบเหงา',
    description: 'ขออวยยศให้ตัวตึงทุกแผนกที่ขึ้นไปปล่อยพลังบนเวทีคาราโอเกะ! ขอบคุณที่ช่วยสร้างรอยยิ้มและเสียงหัวเราะให้พวกเราคลายเครียด ชาร์จพลังชีวิตได้เต็มร้อยครับ 🎤💃',
    emoji: '🎤',
  },
  {
    id: 'shout-team-warm',
    title: 'ขอบคุณมิตรภาพรอยยิ้ม และความอบอุ่นจากพี่น้องทุกแผนก 🌻✨',
    subtitle: 'ก้าวข้ามกำแพงแผนก ได้เพื่อนใหม่ และความผูกพันที่แน่นแฟ้น',
    description: 'ขอบคุณเพื่อนๆ พนักงานทุกแผนกสำหรับรอยยิ้มและความจริงใจตลอดทริปครับ ได้พูดคุย สนิทสนม และเห็นมุมน่ารักๆ ของทุกคน รู้สึกอบอุ่นและโชคดีมากที่มีทีมงานน่ารักขนาดนี้ 💖🌻',
    emoji: '🌻',
  },
  {
    id: 'shout-survivors',
    title: 'ขอบคุณพวกเราทุกคนที่สู้ศึกงานมาด้วยกัน แล้วมาหัวเราะด้วยกันทริปนี้! 🚀🥂',
    subtitle: 'เหนื่อยงานมาทั้งปี แต่ได้มาปล่อยแก่และเติมพลังใจด้วยกันคือที่สุดแล้ว!',
    description: 'ขอบคุณพวกเราทุกคนที่กอดคอฟันฝ่าความเหนื่อยล้ามาตลอดปี ถึงงานจะหนักหนาแค่ไหน แต่พอได้มาเที่ยว หัวเราะ และกินของอร่อยด้วยกันแบบนี้ รู้เลยว่าเราจะไม่ยอมแพ้เพราะมีทีมที่ดีที่สุดครับ! 🥂❤️',
    emoji: '🌟',
  },
];

const quickSparksLikedMost = [
  'ประทับใจอาหารโต๊ะจีน ขาหมูเชลล์ชวนชิม อร่อยลืมไดเอทไปเลย 🍲😋',
  'พักผ่อนสบายที่คีรีธารทิพย์ รีสอร์ท นอนฟังเสียงน้ำตกเยียวยาจิตใจ 🛌🌲',
  'ประทับใจจุดถ่ายรูป La Tosca & พนมรุ้ง เมมเต็มได้รูปปังไปใช้ทั้งปี 📸🏛️',
  'งานเลี้ยงสังสรรค์อบอุ่น ซาบซึ้งใจ ได้เห็นรอยยิ้มพี่น้องทุกแผนก 💖✨',
  'เวทีคาราโอเกะสนุกฮากระจาย ได้ปลดปล่อยความเครียดเต็มที่ 🎤⚡',
  'ประทับใจความใส่ใจของทีมงานสตาฟ ดูแลดีจนอบอุ่นหัวใจมากครับ 💐🥰'
];

const quickSparksSuggestions = [
  'เสนอปรับเวลาเดินทางให้ผ่อนคลาย ไม่ต้องตื่นเช้าสู้ชีวิต ⏰🛌',
  'ขอเพิ่มช่วง Free Time นั่งเปื่อยจิบกาแฟฟังเสียงน้ำตกฮีลใจ 🌲☕',
  'ทริปหน้าขอปาร์ตี้หมูกระทะริมน้ำ ย่างหมูไปกระชับมิตรไป 🥓❤️',
  'เสนอเพิ่มเวลาคาราโอเกะโต้รุ่ง เสียงหลงแค่ไหนก็ใจสู้ 💃🎤',
  'เสนอเพิ่มเกมสายฮา & จับฉลากแจกรางวัลสุดพีค ลุ้นกันมันส์ๆ 🎁⚡',
  'ติดใจทริปนี้มาก ขอสัญญาว่าจะจัดทริปปังๆ แบบนี้ทุกปีนะครับ 🏔️🥺'
];

const quickSparksShoutout = [
  'ขอบคุณทีมงานสตาฟทุกท่าน ดูแลดีใส่ใจยิ่งกว่าคนคุย ประทับใจมากครับ 🙏👑',
  'ขอบพระคุณผู้บริหารและองค์กรที่มอบทริปฮีลใจ เติมพลังบวกให้พวกเรา 🥺❤️',
  'ขอบคุณรูมเมทที่กรนแข่งกัน ช่วยหารของกินและอยู่เคียงข้างตลอดทริป 🤝😴',
  'ยกย่องตัวตึงคาราโอเกะทุกท่าน ขอบคุณที่สร้างเสียงหัวเราะและความมันส์ 🎤⚡',
  'ขอบคุณมิตรภาพและความอบอุ่นของพี่น้องทุกแผนก ดีใจที่มีทุกคนครับ 🌻✨',
  'เหนื่อยงานมาทั้งปี แต่ได้มาปล่อยแก่และหัวเราะด้วยกันแบบนี้โคตรฮีลใจ 🥂❤️'
];

export default function TripFeedback({
  employees,
  feedbacks,
  onSubmitFeedback,
  userRole,
  selectedEmployeeId,
  selectedDepartment,
  syncing,
  onSwitchEmployee
}: {
  employees: Employee[];
  feedbacks: TripFeedback[];
  onSubmitFeedback: (feedback: any) => Promise<void>;
  userRole: string;
  selectedEmployeeId: string;
  selectedDepartment: string;
  syncing?: boolean;
  onSwitchEmployee?: () => void;
}) {
  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, employees]);

  const existingFeedback = useMemo(() => {
    if (!currentEmployee) return null;
    return feedbacks.find(f => f.employeeId === currentEmployee.id) || null;
  }, [currentEmployee, feedbacks]);

  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingAccommodation, setRatingAccommodation] = useState(5);
  const [ratingFood, setRatingFood] = useState(5);
  const [ratingActivities, setRatingActivities] = useState(5);
  const [ratingSchedule, setRatingSchedule] = useState(5);
  const [ratingRestTime, setRatingRestTime] = useState(5);
  const [ratingBeverages, setRatingBeverages] = useState(5);
  const [ratingMusic, setRatingMusic] = useState(5);

  const [hoverOverall, setHoverOverall] = useState<number | null>(null);
  const [hoverAccommodation, setHoverAccommodation] = useState<number | null>(null);
  const [hoverFood, setHoverFood] = useState<number | null>(null);
  const [hoverActivities, setHoverActivities] = useState<number | null>(null);
  const [hoverSchedule, setHoverSchedule] = useState<number | null>(null);
  const [hoverRestTime, setHoverRestTime] = useState<number | null>(null);
  const [hoverBeverages, setHoverBeverages] = useState<number | null>(null);
  const [hoverMusic, setHoverMusic] = useState<number | null>(null);

  const [likedMost, setLikedMost] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [shoutout, setShoutout] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redesign States
  const [questMode, setQuestMode] = useState(true); // Toggle between Step-by-Step Quest and Single-Page
  const [currentStep, setCurrentStep] = useState(0); // 0 = Stay, 1 = Dining, 2 = Entertainment, 3 = Written Feedback
  const [direction, setDirection] = useState(0); // Gesture direction for Framer Motion (-1 = right/prev, 1 = left/next)
  const [soundEnabled, setSoundEnabled] = useState(true); // Sound effects toggle
  const [showItineraryModal, setShowItineraryModal] = useState(false); // Pop-up trip itinerary modal state
  const [activeWrittenTab, setActiveWrittenTab] = useState<'likedMost' | 'suggestions' | 'shoutout'>('likedMost');

  // Initialize form with existing feedback if they want to edit
  const handleEditExisting = () => {
    if (existingFeedback) {
      setRatingOverall(existingFeedback.ratingOverall);
      setRatingAccommodation(existingFeedback.ratingAccommodation);
      setRatingFood(existingFeedback.ratingFood);
      setRatingActivities(existingFeedback.ratingActivities);
      setRatingSchedule(existingFeedback.ratingSchedule || 5);
      setRatingRestTime(existingFeedback.ratingRestTime || 5);
      setRatingBeverages(existingFeedback.ratingBeverages || 5);
      setRatingMusic(existingFeedback.ratingMusic || 5);
      setLikedMost(existingFeedback.likedMost || '');
      setSuggestions(existingFeedback.suggestions || '');
      setShoutout(existingFeedback.shoutout || '');
      setIsAnonymous(existingFeedback.isAnonymous);
    }
  };

  const [showForm, setShowForm] = useState(!existingFeedback);
  const [showGuidanceModal, setShowGuidanceModal] = useState(true);
  const [showDeleteFeedbackConfirm, setShowDeleteFeedbackConfirm] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'analytics' | 'comments' | 'controls'>('dashboard');

  // Auto-sync form state when selected employee or existingFeedback changes
  useEffect(() => {
    if (existingFeedback) {
      setRatingOverall(existingFeedback.ratingOverall);
      setRatingAccommodation(existingFeedback.ratingAccommodation);
      setRatingFood(existingFeedback.ratingFood);
      setRatingActivities(existingFeedback.ratingActivities);
      setRatingSchedule(existingFeedback.ratingSchedule || 5);
      setRatingRestTime(existingFeedback.ratingRestTime || 5);
      setRatingBeverages(existingFeedback.ratingBeverages || 5);
      setRatingMusic(existingFeedback.ratingMusic || 5);
      setLikedMost(existingFeedback.likedMost || '');
      setSuggestions(existingFeedback.suggestions || '');
      setShoutout(existingFeedback.shoutout || '');
      setIsAnonymous(existingFeedback.isAnonymous !== undefined ? existingFeedback.isAnonymous : true);
      setShowForm(false); // If they already submitted, show the "Thank You / Edit" page first
    } else {
      // Reset form to defaults
      setRatingOverall(5);
      setRatingAccommodation(5);
      setRatingFood(5);
      setRatingActivities(5);
      setRatingSchedule(5);
      setRatingRestTime(5);
      setRatingBeverages(5);
      setRatingMusic(5);
      setLikedMost('');
      setSuggestions('');
      setShoutout('');
      setIsAnonymous(true);
      setShowForm(true); // If no feedback exists, show the form directly so they can complete it
      setShowGuidanceModal(true);
    }
    // Always start at step 0 for a new or reset session
    setCurrentStep(0);
  }, [selectedEmployeeId, existingFeedback]);

  const renderStarDisplay = (score: number, size = "w-3 h-3") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= Math.round(score)
                ? "text-amber-400 fill-amber-400"
                : "text-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderStarInput = (
    label: string, 
    value: number, 
    onChange: (val: number) => void, 
    hoverValue: number | null, 
    setHoverValue: (val: number | null) => void,
    desc: string,
    icon: string,
    gradientTheme: string,
    compact = false
  ) => {
    const activeValue = hoverValue !== null ? hoverValue : value;
    const reaction = getScoreReaction(activeValue);

    if (compact) {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 sm:p-4 bg-slate-50/90 border border-slate-300 rounded-2xl relative overflow-hidden group">
          <div className="space-y-1 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg filter drop-shadow-sm">{icon}</span>
              <h5 className="text-xs sm:text-sm font-black text-slate-950 tracking-tight leading-snug">{label}</h5>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-800 font-semibold leading-relaxed">{desc}</p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-end gap-0.5 sm:gap-1 w-full sm:w-auto">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = hoverValue !== null ? star <= hoverValue : star <= value;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        onChange(star);
                        playSound("select", soundEnabled);
                      }}
                      onMouseEnter={() => {
                        setHoverValue(star);
                        playSound("hover", soundEnabled);
                      }}
                      onMouseLeave={() => setHoverValue(null)}
                      className="p-0.5 cursor-pointer transition-all hover:scale-115 active:scale-95 touch-manipulation"
                    >
                      <Star 
                        className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-150 ${
                          isFilled 
                            ? "text-amber-400 fill-amber-400 filter drop-shadow-[0_1px_3px_rgba(251,191,36,0.3)]" 
                            : "text-slate-200 hover:text-amber-300"
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>

              <span className="text-[10px] sm:text-xs font-bold text-slate-800 min-w-[2.2rem] text-center font-mono bg-white border border-slate-300 px-1.5 sm:px-2 py-0.5 rounded-lg ml-1 shadow-3xs shrink-0">
                {activeValue} / 5
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeValue}
                initial={{ opacity: 0, y: 2, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -2, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[10.5px] sm:text-xs font-bold ${reaction.color} shadow-3xs select-none max-w-full`}
              >
                <span className="text-xs sm:text-sm shrink-0">{reaction.emoji}</span>
                <span className="font-extrabold leading-none">{reaction.label}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden group">
        <div className={`absolute top-0 right-0 -mr-10 -mt-10 w-24 h-24 bg-gradient-to-br ${gradientTheme} opacity-[0.03] rounded-full blur-xl group-hover:scale-125 transition-all duration-500`} />
        
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-1 flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl filter drop-shadow-sm">{icon}</span>
              <h4 className="text-sm sm:text-base font-black text-slate-950 tracking-tight leading-snug">{label}</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold font-sans">{desc}</p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-end gap-1 w-full sm:w-auto">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = hoverValue !== null ? star <= hoverValue : star <= value;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        onChange(star);
                        playSound("select", soundEnabled);
                      }}
                      onMouseEnter={() => {
                        setHoverValue(star);
                        playSound("hover", soundEnabled);
                      }}
                      onMouseLeave={() => setHoverValue(null)}
                      className="p-0.5 cursor-pointer transition-all hover:scale-115 active:scale-95 touch-manipulation"
                    >
                      <Star 
                        className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-all duration-150 ${
                          isFilled 
                            ? "text-amber-400 fill-amber-400 filter drop-shadow-[0_1.5px_4px_rgba(251,191,36,0.35)]" 
                            : "text-slate-200 hover:text-amber-300"
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>

              <span className="text-xs font-bold text-slate-800 min-w-[2.3rem] text-center font-mono bg-white border border-slate-300 px-2 py-0.5 rounded-xl ml-1 shadow-3xs shrink-0">
                {activeValue} / 5
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeValue}
                initial={{ opacity: 0, y: 3, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -3, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl border text-xs font-bold ${reaction.color} shadow-3xs select-none max-w-full`}
              >
                <span className="text-xs sm:text-sm shrink-0">{reaction.emoji}</span>
                <span className="font-extrabold leading-none">{reaction.label}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) {
      toast.error("คุณต้องเลือกรายชื่อพนักงานก่อนเพื่อบันทึกแบบประเมิน");
      return;
    }

    if (questMode && currentStep < 4) {
      toast.info("กรุณาตอบคำถามให้คะแนนความพึงพอใจให้ครบถ้วนก่อนส่งข้อมูลครับ 📝");
      return;
    }

    // Trigger Privacy & Identity Confirmation Modal before final submit
    playSound("click", soundEnabled);
    setShowSubmitConfirmModal(true);
  };

  const executeFinalSubmit = async () => {
    if (!currentEmployee) return;

    setShowSubmitConfirmModal(false);
    setIsSubmitting(true);
    try {
      await onSubmitFeedback({
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        department: currentEmployee.department,
        ratingOverall,
        ratingAccommodation,
        ratingFood,
        ratingActivities,
        ratingSchedule,
        ratingRestTime,
        ratingBeverages,
        ratingMusic,
        likedMost: likedMost.trim(),
        suggestions: suggestions.trim(),
        shoutout: shoutout.trim(),
        isAnonymous
      });
      playSound("success", soundEnabled);
      toast.success("บันทึกแบบประเมินความเห็นของคุณเรียบร้อยแล้ว ขอบคุณมากครับ! 🎉");
      setShowForm(false);
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล โปรดลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };


  // Stats computation
  const stats = useMemo(() => {
    if (feedbacks.length === 0) {
      return {
        avgOverall: 0,
        avgAccommodation: 0,
        avgFood: 0,
        avgActivities: 0,
        avgSchedule: 0,
        avgRestTime: 0,
        avgBeverages: 0,
        avgMusic: 0,
        totalSubmitted: 0,
        percentSubmitted: 0
      };
    }

    const total = feedbacks.length;
    const sumOverall = feedbacks.reduce((acc, f) => acc + f.ratingOverall, 0);
    const sumAccommodation = feedbacks.reduce((acc, f) => acc + f.ratingAccommodation, 0);
    const sumFood = feedbacks.reduce((acc, f) => acc + f.ratingFood, 0);
    const sumActivities = feedbacks.reduce((acc, f) => acc + f.ratingActivities, 0);
    const sumSchedule = feedbacks.reduce((acc, f) => acc + (f.ratingSchedule || 5), 0);
    const sumRestTime = feedbacks.reduce((acc, f) => acc + (f.ratingRestTime || 5), 0);
    const sumBeverages = feedbacks.reduce((acc, f) => acc + (f.ratingBeverages || 5), 0);
    const sumMusic = feedbacks.reduce((acc, f) => acc + (f.ratingMusic || 5), 0);

    // Filter going employees count
    const goingEmployees = employees.filter(e => e.rsvpStatus === 'ไป').length;

    return {
      avgOverall: Number((sumOverall / total).toFixed(1)),
      avgAccommodation: Number((sumAccommodation / total).toFixed(1)),
      avgFood: Number((sumFood / total).toFixed(1)),
      avgActivities: Number((sumActivities / total).toFixed(1)),
      avgSchedule: Number((sumSchedule / total).toFixed(1)),
      avgRestTime: Number((sumRestTime / total).toFixed(1)),
      avgBeverages: Number((sumBeverages / total).toFixed(1)),
      avgMusic: Number((sumMusic / total).toFixed(1)),
      totalSubmitted: total,
      percentSubmitted: goingEmployees > 0 ? Math.min(100, Math.round((total / goingEmployees) * 100)) : 0
    };
  }, [feedbacks, employees]);

  // Redesign: Step Definitions for the "Survey Quest"
  const questSteps = [
    {
      title: 'สบายนอนหรู & บรรยากาศขุนเขา 🏨🌲',
      subtitle: 'การประเมินที่พัก สภาพแวดล้อม และบริการต้อนรับจากรีสอร์ทเขาใหญ่',
      icon: '🌲',
      colorTheme: 'from-blue-500 to-indigo-600',
      questions: [
        {
          label: '1. ภาพรวมความสุขล้นพุงในทริปปีนี้ 🧭✨',
          desc: 'ความประทับใจโดยรวมต่อกิจกรรมทริปสัมมนาเขาใหญ่ประจำปี ความตื่นเต้น และระดับดัชนีความสุขที่ล้นทะลักเป้ากลับบ้าน',
          value: ratingOverall,
          onChange: setRatingOverall,
          hover: hoverOverall,
          setHover: setHoverOverall,
          emoji: '🧭',
          theme: 'from-amber-400 to-orange-500'
        },
        {
          label: '2. ที่พัก คีรีธารทิพย์ รีสอร์ท และความสะดวกสบายของห้องพัก 🏢🛌',
          desc: 'ความพึงพอใจต่อระดับความสะอาด สิ่งอำนวยความสะดวกในรีสอร์ท, แอร์ฉ่ำ, เตียงดูดวิญญาณ, ห้องน้ำ, การจัดสรรรูมเมท และการต้อนรับของโรงแรม',
          value: ratingAccommodation,
          onChange: setRatingAccommodation,
          hover: hoverAccommodation,
          setHover: setHoverAccommodation,
          emoji: '🏢',
          theme: 'from-blue-400 to-indigo-500'
        }
      ]
    },
    {
      title: 'อิ่มพุงกางชาร์จพลัง & สปีดล้อหมุน 🍲📅',
      subtitle: 'ขาหมูในตำนาน อาหารจัดเลี้ยงริมลำธาร และความกระชับของตารางเวลา',
      icon: '🍲',
      colorTheme: 'from-emerald-500 to-teal-600',
      questions: [
        {
          label: '3. คุณภาพและรสชาติอาหารจัดเลี้ยงแบบโต๊ะจีน 🍲✨',
          desc: 'ประเมินรสชาติความอร่อย วัตถุดิบ ความสมบูรณ์ของอาหารโต๊ะจีน อาทิ ขาหมูเชลล์ชวนชิม, ปลานึ่งมะนาว, ไก่ย่างจิ้มแจ่ว, ตุ๋นเยื่อไผ่, ปลาหมึกผัดไข่เค็ม, ยำถั่วพู, ผลไม้สด และบริการเครื่องดื่ม',
          value: ratingFood,
          onChange: setRatingFood,
          hover: hoverFood,
          setHover: setHoverFood,
          emoji: '🍹',
          theme: 'from-emerald-400 to-teal-500'
        },
        {
          label: '4. ความกระชับของตารางเดินทาง และสปีดความตรงต่อเวลา 📅🚌',
          desc: 'ตารางเดินทางพัดโบก แวะจุดท่องเที่ยวอุทยานประวัติศาสตร์พนมรุ้งและคาเฟ่ 361 มีจังหวะเวลาพักร่างลงตัวพอดี',
          value: ratingSchedule,
          onChange: setRatingSchedule,
          hover: hoverSchedule,
          setHover: setHoverSchedule,
          emoji: '📅',
          theme: 'from-orange-400 to-red-500'
        },
        {
          label: '5. เวลาปล่อยตัวชิลอิสระ และความเป็นส่วนตัวริมลำธาร 🌲🧘',
          desc: 'ชั่วโมงทองคำแบบไม่มีตารางกิจกรรมบังคับ ได้ถ่ายรูปคาเฟ่เก๋ๆ หรือนอนพักชาร์จแบตริมน้ำตกลำธารธรรมชาติโดยไม่มีสตาฟมาไล่',
          value: ratingRestTime,
          onChange: setRatingRestTime,
          hover: hoverRestTime,
          setHover: setHoverRestTime,
          emoji: '🌲',
          theme: 'from-teal-400 to-cyan-500'
        }
      ]
    },
    {
      title: 'กิจกรรมสวมวิญญาณสู้ชีวิต & ค่ำคืนโยกยับ 🎤🥤',
      subtitle: 'กิจกรรมสร้างสรรค์สามัคคี แอลกอฮอล์เย็นฉ่ำ และเวทีแดนซ์กระจายสะโพกพัง',
      icon: '🎤',
      colorTheme: 'from-fuchsia-500 to-rose-600',
      questions: [
        {
          label: '6. เกมสันทนาการละลายพฤติกรรม (Team Building) 🎯🤝',
          desc: 'ความสนุกหลุดกรอบในการจับกลุ่มกระชับมิตร ความมันส์ฮากลางแจ้งสะสมสารเอนดอร์ฟินเพื่อสู้ชีวิตข้ามสายงาน',
          value: ratingActivities,
          onChange: setRatingActivities,
          hover: hoverActivities,
          setHover: setHoverActivities,
          emoji: '🎯',
          theme: 'from-purple-400 to-pink-500'
        },
        {
          label: '7. ไลน์เครื่องดื่มสังสรรค์ น้ำมีฟอง และเบียร์เย็นเจี๊ยบฉ่ำทรวง 🥤🍻',
          desc: 'ปริมาณแอลกอฮอล์และซอฟต์ดริ้งค์แก้คอแห้งตลอดยามค่ำคืนปาร์ตี้เกษียณ และความเอาใจใส่กระฉับกระเฉงเติมของสตาฟ',
          value: ratingBeverages,
          onChange: setRatingBeverages,
          hover: hoverBeverages,
          setHover: setHoverBeverages,
          emoji: '🥤',
          theme: 'from-fuchsia-400 to-purple-500'
        },
        {
          label: '8. ชุดเครื่องเสียงร้องคาราโอเกะ คอนเสิร์ตสดโยกสะโพกพัง 🎸🎤',
          desc: 'ความสมบูรณ์กระหึ่มของลำโพง แสงสีเวทีจัดเต็ม วงดนตรีสดสุดนัว และเสียงพนักงานที่แหบแห้งยามดึกสะท้านคืนปาร์ตี้',
          value: ratingMusic,
          onChange: setRatingMusic,
          hover: hoverMusic,
          setHover: setHoverMusic,
          emoji: '🎸',
          theme: 'from-pink-400 to-rose-500'
        }
      ]
    },
    {
      title: 'ระเบิดหัวใจสารพัดฟีดแบ็ค & ส่งกำลังใจ 💌💖',
      subtitle: 'เขียนบอกช่วงเวลาที่ใช่ ไอเดียที่ชอบ และขอบคุณเพื่อนคู่เตียงสุดแสนดี',
      icon: '💌',
      colorTheme: 'from-amber-500 to-orange-600',
      questions: [] // Handled customly for textareas
    }
  ];

  // Memoized 5-category list for swipeable card deck
  const questCards = useMemo(() => [
    {
      id: 'step-hotel',
      title: 'ด่านที่ 1: ที่ซุกหัวนอน & สปีดการล้อหมุน 🏨🚌',
      desc: 'ประเมินความนุ่มระดับดูดวิญญาณของเตียงนอนที่ คีรีธารทิพย์ รีสอร์ท และความจังหวะกระชับของตารางเดินทางสู้ชีวิต',
      emoji: '🏨',
      type: 'questions',
      theme: 'from-blue-500 to-indigo-600',
      questions: [
        {
          id: 'accommodation',
          label: 'ที่พัก คีรีธารทิพย์ รีสอร์ท แอร์ฉ่ำ & เตียงดูดวิญญาณ',
          desc: 'ห้องนอนสะอาด แอร์ฉ่ำปอดประหนึ่งนอนขั้วโลกเหนือ หรือเตียงนุ่มสลายกระดูกจนลืมตื่นเช้ามาทานบุฟเฟต์!',
          value: ratingAccommodation,
          onChange: setRatingAccommodation,
          hover: hoverAccommodation,
          setHover: setHoverAccommodation,
          emoji: '🏢',
          theme: 'from-blue-400 to-indigo-500'
        },
        {
          id: 'schedule',
          label: 'ตารางกำหนดการเดินทาง และสปีดความตรงเวลา',
          desc: 'จัดสรรจุดแวะได้ชิคกำลังดี หรือตารางแน่นเหนื่อยร่างพังจนต้องร้องขอชีวิต? ตื่นเช้าล้อหมุนไปพนมรุ้งทันกันไหม?',
          value: ratingSchedule,
          onChange: setRatingSchedule,
          hover: hoverSchedule,
          setHover: setHoverSchedule,
          emoji: '📅',
          theme: 'from-orange-400 to-red-500'
        }
      ]
    },
    {
      id: 'step-food',
      title: 'ด่านที่ 2: อาหารจัดเลี้ยงแบบโต๊ะจีน & เครื่องดื่มสังสรรค์ 🍲🥤',
      desc: 'ประเมินรสชาติและความอร่อยของเมนูโต๊ะจีน (ขาหมูเชลล์ชวนชิม, ปลานึ่งมะนาว, ไก่ย่างจิ้มแจ่ว, ตุ๋นเยื่อไผ่, ปลาหมึกผัดไข่เค็ม, ยำถั่วพู ฯลฯ) และบริการเครื่องดื่ม',
      emoji: '🍹',
      type: 'questions',
      theme: 'from-emerald-500 to-teal-600',
      questions: [
        {
          id: 'food',
          label: 'ความพึงพอใจต่ออาหารจัดเลี้ยงแบบโต๊ะจีน',
          desc: 'ประเมินรสชาติความอร่อย ความสดใหม่ และคุณภาพของอาหารโต๊ะจีน (ขาหมูเชลล์ชวนชิม, ปลานึ่งมะนาว, ไก่ย่างจิ้มแจ่ว, ยำถั่วพู, ผลไม้สด และเครื่องดื่ม)',
          value: ratingFood,
          onChange: setRatingFood,
          hover: hoverFood,
          setHover: setHoverFood,
          emoji: '🍖',
          theme: 'from-emerald-400 to-teal-500'
        },
        {
          id: 'beverages',
          label: 'ไลน์เครื่องดื่มแก้คอแห้ง ซอฟต์ดริ้งค์ และแอลกอฮอล์ฉ่ำๆ',
          desc: 'น้ำมีฟองเย็นเจี๊ยบสะท้านทรวง ปริมาณจุใจ เติมพลังตลอดปาร์ตี้เกษียณ และความไวในการเสิร์ฟของน้องๆ สตาฟ',
          value: ratingBeverages,
          onChange: setRatingBeverages,
          hover: hoverBeverages,
          setHover: setHoverBeverages,
          emoji: '🥤',
          theme: 'from-fuchsia-400 to-purple-500'
        }
      ]
    },
    {
      id: 'step-activities',
      title: 'ด่านที่ 3: ภาพรวมกิจกรรมเเละบรรยากาศทริปสัมมนา 🎯✨',
      desc: 'ประเมินภาพรวมกิจกรรม ความสนุกสนาน บรรยากาศงานเลี้ยงสังสรรค์ และความประทับใจตลอดทริป',
      emoji: '🎯',
      type: 'questions',
      theme: 'from-purple-500 to-pink-600',
      questions: [
        {
          id: 'activities',
          label: 'ภาพรวมกิจกรรมและการจัดงานสัมมนาสังสรรค์',
          desc: 'ประเมินความเรียบร้อย ความสนุกสนาน จังหวะตารางกิจกรรม และบรรยากาศการมีส่วนร่วมของพนักงานในทริป',
          value: ratingActivities,
          onChange: setRatingActivities,
          hover: hoverActivities,
          setHover: setHoverActivities,
          emoji: '🎯',
          theme: 'from-purple-400 to-pink-500'
        },
        {
          id: 'music',
          label: 'เวทีคาราโอเกะ ดนตรีสด และกิจกรรมสังสรรค์',
          desc: 'ประเมินบรรยากาศงานเลี้ยง เสียงเพลง รายการเพลงคาราโอเกะ แสงสีเสียง และความผ่อนคลายในงานสังสรรค์',
          value: ratingMusic,
          onChange: setRatingMusic,
          hover: hoverMusic,
          setHover: setHoverMusic,
          emoji: '🎸',
          theme: 'from-pink-400 to-rose-500'
        }
      ]
    },
    {
      id: 'step-overall',
      title: 'ด่านที่ 4: เวลาปล่อยใจเปื่อยริมลำธาร & สารความสุขโดยรวม 🌲🧭',
      desc: 'ประเมินชั่วโมงทองคำที่คุณได้นอนเปื่อย สูดอากาศบริสุทธิ์ของเขาใหญ่ และระดับดัชนีความสุขโดยรวมทั้งทริปนี้',
      emoji: '🌲',
      type: 'questions',
      theme: 'from-amber-500 to-orange-600',
      questions: [
        {
          id: 'restTime',
          label: 'เวลาว่างพักผ่อนอิสระ สูดโอโซนริมน้ำตก ฟังเสียงป่าเขา (Free Time)',
          desc: 'มีเวลาแวะแชะภาพคาเฟ่เก๋ๆ นั่งชิลคุยกันริมธาร โดยไม่มีกิจกรรมบังคับที่เบียดแน่นจนหมดแรง',
          value: ratingRestTime,
          onChange: setRatingRestTime,
          hover: hoverRestTime,
          setHover: setHoverRestTime,
          emoji: '🌲',
          theme: 'from-teal-400 to-cyan-500'
        },
        {
          id: 'overall',
          label: 'ระดับความพึงพอใจและความประทับใจภาพรวมทั้งทริป',
          desc: 'ประเมินภาพรวมความพึงพอใจ ความคุ้มค่า และความประทับใจโดยรวมของทริปสัมมนาสันทนาการปีนี้',
          value: ratingOverall,
          onChange: setRatingOverall,
          hover: hoverOverall,
          setHover: setHoverOverall,
          emoji: '🧭',
          theme: 'from-amber-400 to-orange-500'
        }
      ]
    },
    {
      id: 'step-likedMost',
      title: 'ด่านที่ 5: ไฮไลท์และความประทับใจที่คุณชอบที่สุด 🌸✨',
      desc: 'แตะเลือกแท็กความคิดเห็นด่วนหรือพิมพ์แบ่งปันช่วงเวลา ไฮไลท์ และประสบการณ์ที่คุณประทับใจ',
      emoji: '🌸',
      type: 'likedMost',
      theme: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'step-suggestions',
      title: 'ด่านที่ 6: ไอเดียเด็ดและข้อเสนอแนะสำหรับทริปถัดไป 💡🚀',
      desc: 'แตะเลือกแท็กข้อเสนอแนะด่วนหรือพิมพ์เสนอความคิดเห็น ไอเดียที่คุณอยากให้มีในทริปสัมมนาครั้งหน้า',
      emoji: '💡',
      type: 'suggestions',
      theme: 'from-amber-500 to-orange-600'
    },
    {
      id: 'step-shoutout',
      title: 'ด่านที่ 7: ข้อความขอบคุณและส่งกำลังใจ 💌💖',
      desc: 'แตะเลือกแท็กคำขอบคุณด่วนหรือพิมพ์ส่งข้อความกำลังใจดีๆ แด่เพื่อนร่วมเดินทาง รูมเมท สตาฟ และทีมผู้จัด',
      emoji: '💌',
      type: 'shoutout',
      theme: 'from-fuchsia-500 to-rose-600'
    }
  ], [
    ratingOverall, hoverOverall,
    ratingAccommodation, hoverAccommodation,
    ratingFood, hoverFood,
    ratingActivities, hoverActivities,
    ratingSchedule, hoverSchedule,
    ratingRestTime, hoverRestTime,
    ratingBeverages, hoverBeverages,
    ratingMusic, hoverMusic,
    likedMost, suggestions, shoutout
  ]);

  const appendSpark = (text: string, setter: React.Dispatch<React.SetStateAction<string>>, currentVal: string) => {
    playSound('click', soundEnabled);
    if (currentVal.trim() === '') {
      setter(text);
    } else {
      setter(currentVal + '\n' + text);
    }
    toast.success('เพิ่มคำแนะนำตัวอย่างเข้าไปในข้อความแล้วครับ! ✍️💡');
  };

  const renderInteractiveCardDeck = (
    cards: Array<{ id: string; title: string; subtitle: string; description: string; emoji: string }>,
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-3.5 pt-1">
        {cards.map((card) => {
          const selected = value.includes(card.description);
          return (
            <motion.div
              key={card.id}
              whileHover={{ scale: 1.03, y: -3, boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playSound('select', soundEnabled);
                if (selected) {
                  // Safely remove the selected description
                  const cleaned = value
                    .replace(card.description, '')
                    .replace(/\n\n+/g, '\n')
                    .trim();
                  setter(cleaned);
                  toast.success('ถอดไอเดียความเห็นนี้ออกแล้วครับ 🗑️');
                } else {
                  // Add the selected description
                  const appended = value.trim() === '' ? card.description : `${value}\n${card.description}`;
                  setter(appended);
                  toast.success('เลือกตอบไอเดียนี้สำเร็จ! ✨');
                }
              }}
              className={`border-2 p-4 rounded-2xl cursor-pointer transition-all flex flex-col justify-between text-left relative overflow-hidden group select-none min-h-[110px] ${
                selected 
                  ? 'border-indigo-600 bg-indigo-50/90 shadow-sm text-indigo-950 font-black ring-4 ring-indigo-200/60' 
                  : 'border-slate-300 bg-white hover:border-indigo-500 text-slate-900 shadow-3xs'
              }`}
            >
              {/* Subtle background glow when active */}
              {selected && (
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 pointer-events-none" />
              )}
              
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl shadow-4xs group-hover:scale-110 transition-transform">
                  {card.emoji}
                </span>
                {selected ? (
                  <span className="bg-indigo-600 text-white rounded-full p-1.5 shadow-xs animate-pulse">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-6 h-6 border-2 border-slate-300 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-600">
                    +
                  </span>
                )}
              </div>

              <div className="mt-3">
                <h5 className={`text-xs sm:text-sm font-black leading-snug ${selected ? 'text-indigo-950' : 'text-slate-950'}`}>
                  {card.title}
                </h5>
                <p className={`text-[11px] sm:text-xs font-bold mt-1 leading-relaxed ${selected ? 'text-indigo-950' : 'text-slate-800'}`}>
                  {card.subtitle}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  if (userRole === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4 font-sans space-y-6" id="admin-feedback-container">
        
        {/* Admin Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden" id="admin-feedback-header">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-extrabold border border-indigo-500/20 uppercase tracking-widest font-display">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                ระบบประเมินผลสัมมนาสำหรับผู้ดูแลระบบ (Admin Feedback Central)
              </span>
              <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-tight">
                ศูนย์กลางวิเคราะห์ความพึงพอใจและดัชนีความสุขพนักงาน 🏆
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl font-medium">
                ติดตามสถิติดัชนีชี้วัด (Joy Index) ความพึงพอใจทั้ง 8 ด้าน เปรียบเทียบผลลัพธ์ระหว่างแผนก และรวบรวมข้อเสนอแนะเชิงลึกแบบบูรณาการในหน้าเดียวอย่างเป็นระบบและปลอดภัย
              </p>
            </div>
            
            {/* Quick Summary Widgets */}
            <div className="grid grid-cols-3 gap-3.5 shrink-0 w-full md:w-auto">
              <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl text-center shadow-inner min-w-[90px]">
                <p className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-tight">{stats.avgOverall || '0.0'}</p>
                <p className="text-[9px] text-indigo-200 font-bold mt-1">คะแนนเฉลี่ยรวม</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl text-center shadow-inner min-w-[90px]">
                <p className="text-xl sm:text-2xl font-black text-indigo-300 font-mono tracking-tight">{stats.totalSubmitted}</p>
                <p className="text-[9px] text-indigo-200 font-bold mt-1">จำนวนผู้ประเมิน</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl text-center shadow-inner min-w-[90px]">
                <p className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tracking-tight">{stats.percentSubmitted}%</p>
                <p className="text-[9px] text-indigo-200 font-bold mt-1">อัตราการตอบกลับ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-navigation Controls */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" id="admin-sub-tab-nav">
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar scrollbar-hide">
            <button
              type="button"
              onClick={() => {
                setAdminSubTab('dashboard');
                playSound('click', soundEnabled);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                adminSubTab === 'dashboard' 
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              แดชบอร์ดสรุปผลภาพรวม (Survey Dashboard)
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminSubTab('analytics');
                playSound('click', soundEnabled);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                adminSubTab === 'analytics' 
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
              รายงานวิเคราะห์ & ความเห็นรายคน (Individual Reports)
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminSubTab('comments');
                playSound('click', soundEnabled);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                adminSubTab === 'comments' 
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-fuchsia-600" />
              กระดานไอเดียสะสม (Comment Feed)
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminSubTab('controls');
                playSound('click', soundEnabled);
              }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
                adminSubTab === 'controls' 
                  ? 'bg-white text-rose-600 shadow-xs border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-rose-600" />
              ระบบควบคุมความปลอดภัย (System Controls)
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-slate-400 font-extrabold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg uppercase tracking-wider font-mono">
              Live Database Active 🟢
            </span>
          </div>
        </div>

        {/* Content Render Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={adminSubTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {adminSubTab === 'dashboard' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-1" id="admin-survey-dashboard-container">
                <SurveyDashboard feedbacks={feedbacks} employees={employees} />
              </div>
            )}

            {adminSubTab === 'analytics' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-1" id="admin-feedback-analytics-container">
                <FeedbackAnalytics feedbacks={feedbacks} employees={employees} />
              </div>
            )}

            {adminSubTab === 'comments' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* 8-Dimension breakdown index */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      สรุปคะแนนประเมินมิติรวม
                    </h3>
                    <span className="text-[9px] font-black text-slate-400">เต็ม 5.0 ⭐</span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Category 1 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">🧭 1. ภาพรวมการเดินทาง</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgOverall || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(stats.avgOverall / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgOverall, "w-3 h-3")}
                      </div>
                    </div>

                    {/* Category 2 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">🏢 2. ที่พักและการบริการ</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgAccommodation || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stats.avgAccommodation / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgAccommodation, "w-3 h-3")}
                      </div>
                    </div>

                    {/* Category 3 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">🍹 3. อาหารและจัดเลี้ยง</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgFood || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.avgFood / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgFood, "w-3 h-3")}
                      </div>
                    </div>

                    {/* Category 4 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">🎯 4. กิจกรรมนันทนาการ</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgActivities || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(stats.avgActivities / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgActivities, "w-3 h-3")}
                      </div>
                    </div>

                    {/* Category 5 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">📅 5. ตารางกำหนดการ / เวลา</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgSchedule || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(stats.avgSchedule / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgSchedule, "w-3 h-3")}
                      </div>
                    </div>

                    {/* Category 6 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">🏖️ 6. เวลาพักว่าง & ส่วนตัว</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgRestTime || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(stats.avgRestTime / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgRestTime, "w-3 h-3")}
                      </div>
                    </div>

                    {/* Category 7 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">🥤 7. เครื่องดื่มแอลกอฮอล์</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgBeverages || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${(stats.avgBeverages / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgBeverages, "w-3 h-3")}
                      </div>
                    </div>

                    {/* Category 8 */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">🎸 8. ดนตรี & เวทีปาร์ตี้</span>
                        <span className="font-mono font-black text-slate-800">{stats.avgMusic || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(stats.avgMusic / 5) * 100}%` }} />
                        </div>
                        {renderStarDisplay(stats.avgMusic, "w-3 h-3")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment Board feed list */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        กระดานความคิดเห็นและข้อเสนอแนะสะสม ({feedbacks.filter(f => f.likedMost || f.suggestions || f.shoutout).length} ข้อความ)
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-100">
                    {feedbacks.filter(f => f.likedMost || f.suggestions || f.shoutout).length === 0 ? (
                      <div className="text-center py-14 text-slate-400 italic text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        ยังไม่มีข้อความความคิดเห็นจากพนักงาน
                      </div>
                    ) : (
                      feedbacks
                        .filter(f => f.likedMost || f.suggestions || f.shoutout)
                        .sort((a, b) => {
                          const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                          const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                          return timeB - timeA;
                        })
                        .map((feed) => {
                          const displayName = feed.isAnonymous ? 'เพื่อนพนักงานนิรนาม 🤫' : feed.employeeName;
                          const deptLabel = feed.isAnonymous ? 'ซ่อนแผนกไว้' : feed.department;

                          return (
                            <div key={feed.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3.5 transition-all hover:bg-slate-100/50">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                                    feed.isAnonymous ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700'
                                  }`}>
                                    {feed.isAnonymous ? '🤫' : (feed.employeeName ? feed.employeeName[0] : 'U')}
                                  </div>
                                  <div>
                                    <span className="text-xs font-black text-slate-800">{displayName}</span>
                                    <span className="inline-block mx-1.5 text-slate-350">•</span>
                                    <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg">
                                      {deptLabel}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 bg-white border border-slate-200/60 px-2 py-0.5 rounded-lg">
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  <span className="text-[10px] font-mono font-black text-slate-700">{feed.ratingOverall} / 5</span>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs text-slate-700 leading-relaxed font-sans font-semibold">
                                {feed.likedMost && (
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[9px] uppercase tracking-wide">🌸 ชอบมากที่สุด:</span>
                                    <p className="pl-2 border-l-2 border-emerald-400 font-medium font-sans">“{feed.likedMost}”</p>
                                  </div>
                                )}
                                {feed.suggestions && (
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[9px] uppercase tracking-wide">💡 ข้อเสนอแนะทริปถัดไป:</span>
                                    <p className="pl-2 border-l-2 border-amber-400 font-medium font-sans">“{feed.suggestions}”</p>
                                  </div>
                                )}
                                {feed.shoutout && (
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[9px] uppercase tracking-wide">💌 ขอบคุณ & กำลังใจ:</span>
                                    <p className="pl-2 border-l-2 border-fuchsia-400 font-black italic bg-fuchsia-50/20 py-1 rounded-r-lg">“{feed.shoutout}”</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              </div>
            )}

            {adminSubTab === 'controls' && (
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-xs space-y-6 animate-in zoom-in-95">
                <div className="max-w-2xl">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600 animate-pulse" />
                    แผงควบคุมระบบรักษาความปลอดภัยและการควบคุมข้อมูลโหวต
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                    ฟังก์ชันการล้างข้อมูลในระบบฐานข้อมูลคลาวด์ Firestore สำหรับการเริ่มต้นปีงบประมาณหรือเซสชันจัดทริปใหม่ กรุณาใช้ด้วยความระมัดระวังเป็นพิเศษ
                  </p>
                </div>

                <div className="p-6 bg-rose-50 border border-rose-150 rounded-2xl max-w-2xl space-y-4">
                  <h4 className="font-black text-rose-800 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                    ⚠️ คำสั่งทำลายล้างข้อมูลแบบสำรวจความเห็น (Danger Zone)
                  </h4>
                  <p className="text-[11px] text-rose-700 leading-normal font-semibold">
                    เมื่อกดยืนยัน ข้อมูลผลสำรวจความพึงพอใจการจัดทริปทั้ง 8 มิติ ข้อเสนอแนะ และข้อความส่งท้ายขอบคุณของพนักงานทั้งหมดในฐานข้อมูลคลาวด์จะถูกล้างทิ้งทันที และไม่สามารถกู้คืนกลับมาได้
                  </p>

                  {!showDeleteFeedbackConfirm ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteFeedbackConfirm(true);
                        playSound('click', soundEnabled);
                      }}
                      className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-rose-250 cursor-pointer active:scale-95"
                    >
                      ล้างฐานข้อมูลแบบสอบถามพนักงานทั้งหมด 🗑️
                    </button>
                  ) : (
                    <div className="bg-white border border-rose-200 rounded-xl p-4.5 space-y-3 shadow-xs animate-in slide-in-from-top-2 duration-250">
                      <p className="font-black text-rose-700 text-xs">⚠️ ยืนยันคำสั่งล้างข้อมูลความพึงพอใจทั้งหมดใช่หรือไม่?</p>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                        ผลโหวต แดชบอร์ดสรุปผล และบอร์ดข้อความจะถูกรีเซ็ตกลายเป็นค่าว่างทั้งหมดทันที
                      </p>
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeleteFeedbackConfirm(false);
                            playSound('back', soundEnabled);
                          }}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] rounded-lg transition-all cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await wipeAllFeedbacksInFirestore();
                              toast.success('ล้างข้อมูลและรีเซ็ตคะแนนผลโหวตเรียบร้อยแล้วครับ! ✨');
                              setShowDeleteFeedbackConfirm(false);
                            } catch (error) {
                              toast.error('ไม่สามารถล้างข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
                            }
                          }}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer"
                        >
                          ยืนยันล้างข้อมูล
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 font-sans space-y-6" id="employee-feedback-container">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Area */}
        <div className={`space-y-6 ${showForm ? 'lg:col-span-12 max-w-5xl mx-auto w-full' : 'lg:col-span-7'}`}>
          
          {userRole === 'visitor' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-center space-y-2">
              <p className="text-amber-800 font-black text-xs flex items-center justify-center gap-1">
                ⚠️ โหมดผู้เยี่ยมชมทั่วไป
              </p>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                เนื่องจากคุณล็อกอินเป็นผู้เข้าชมทั่วไป คุณจึงไม่สามารถกรอกแบบสอบถามหรือล้างข้อมูลของใครได้ อย่างไรก็ตามคุณสามารถดูบอร์ดแชร์ไอเดีย และสรุปผลคะแนนดัชนีความสุขประจำทริปบนแดชบอร์ดด้านขวาได้ตลอดเวลาเลยครับ! 😊
              </p>
            </div>
          ) : !selectedEmployeeId ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-2">
              <p className="text-slate-500 font-bold text-xs">⚠️ กรุณาเลือกรายชื่อพนักงานของคุณในหน้าหลักก่อนกรอกแบบสอบถาม</p>
            </div>
          ) : (
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm p-3.5 sm:p-8 space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-md shrink-0">
                      📝 TRIP SURVEY FORM
                    </span>
                    {userRole === 'employee' && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuestMode(!questMode);
                          playSound('click', soundEnabled);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black text-fuchsia-800 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                        title="สลับรูปแบบการตอบแบบสอบถาม"
                      >
                        <span>{questMode ? '📋 แบบกรอกหน้าเดียว' : '🎮 แบบทอยเควสต์'}</span>
                      </button>
                    )}
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                      {currentEmployee?.name || 'พนักงาน'} ({currentEmployee?.department || '-'})
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                    แบบประเมินความพึงพอใจ
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {showForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowGuidanceModal(true);
                        playSound('click', soundEnabled);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-1.5 rounded-xl transition-all shadow-3xs cursor-pointer active:scale-95"
                    >
                      <span>📋</span>
                      <span>คำแนะนำการตอบ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowItineraryModal(true);
                      playSound('click', soundEnabled);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3 py-1.5 rounded-xl transition-all shadow-3xs cursor-pointer active:scale-95"
                  >
                    <span>📅</span>
                    <span>ตารางกิจกรรม</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all cursor-pointer border border-slate-200/80"
                    title="เปิด/ปิด เสียงเอฟเฟกต์"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  </button>

                  {existingFeedback && showForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        playSound('back', soundEnabled);
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold underline cursor-pointer"
                    >
                      ย้อนกลับไปหน้าสรุป
                    </button>
                  )}
                </div>
              </div>

              {showForm ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {questMode ? (
                      <div className="space-y-5" id="survey-quest-module">
                        
                        {/* GAMIFIED PROGRESS BAR & ACHIEVEMENT BAR */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 border border-slate-800 shadow-lg text-white mb-4 sm:mb-5 relative overflow-hidden" id="gamified-progress-container">
                          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10 mb-3">
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-extrabold tracking-widest text-indigo-300 uppercase select-none">
                                <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
                                Survey Quest Progression
                              </span>
                              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 font-display select-none">
                                🏆 ด่านประเมินความสุข: <span className="text-amber-400 font-mono text-sm sm:text-base font-black">{currentStep + 1} / 7 หมวด</span>
                              </h4>
                            </div>
                            
                            <div className="flex items-center gap-2 self-start sm:self-center select-none">
                              <div className="text-right">
                                <p className="text-[9.5px] sm:text-[10px] text-slate-300 font-extrabold uppercase">Reward XP Earned</p>
                                <p className="text-xs sm:text-sm font-mono font-black text-amber-300">
                                  {(currentStep + 1) * 100} / 700 XP
                                </p>
                              </div>
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center animate-bounce">
                                <Award className="w-5 h-5 text-amber-400" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Main Progress Bar track */}
                          <div className="relative h-4 w-full bg-slate-950/80 rounded-full p-0.5 border border-slate-800 shadow-inner mb-4 overflow-hidden select-none">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full relative"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round(((currentStep + 1) / 7) * 100)}%` }}
                              transition={{ type: "spring", stiffness: 60, damping: 15 }}
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:15px_15px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] animate-ping" />
                            </motion.div>
                          </div>

                          {/* Section Milestones / Badges */}
                          <div className="grid grid-cols-7 gap-1 pt-1.5 border-t border-white/5 select-none">
                            {[
                              { id: 'stay', label: 'ที่พัก', active: currentStep >= 0, completed: currentStep > 0, icon: '🏨' },
                              { id: 'dining', label: 'อาหาร', active: currentStep >= 1, completed: currentStep > 1, icon: '🍹' },
                              { id: 'schedule', label: 'กิจกรรม', active: currentStep >= 2, completed: currentStep > 2, icon: '🎯' },
                              { id: 'activities', label: 'ภาพรวม', active: currentStep >= 3, completed: currentStep > 3, icon: '🧭' },
                              { id: 'likedMost', label: 'ประทับใจ', active: currentStep >= 4, completed: currentStep > 4, icon: '🌸' },
                              { id: 'suggestions', label: 'เสนอแนะ', active: currentStep >= 5, completed: currentStep > 5, icon: '💡' },
                              { id: 'shoutout', label: 'ขอบคุณ', active: currentStep >= 6, completed: currentStep >= 6, icon: '💌' },
                            ].map((milestone) => {
                              return (
                                <div 
                                  key={milestone.id} 
                                  className="flex flex-col items-center text-center space-y-1"
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs border transition-all ${
                                    milestone.completed 
                                      ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300' 
                                      : milestone.active
                                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/20 scale-105 font-black'
                                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                                  }`}>
                                    {milestone.completed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : milestone.icon}
                                  </div>
                                  <span className={`text-[9.5px] sm:text-xs font-black truncate max-w-full leading-tight uppercase ${
                                    milestone.completed 
                                      ? 'text-emerald-300' 
                                      : milestone.active
                                        ? 'text-indigo-200'
                                        : 'text-slate-400'
                                  }`}>
                                    {milestone.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* SWIPEABLE CARD INTERACTION */}
                        <div className="relative overflow-hidden sm:overflow-visible pb-4 font-sans w-full max-w-full" id="swipeable-quest-card-container">
                          
                          {/* Swipe Navigation Hints */}
                          <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider pb-2 px-1 select-none">
                            <span className="flex items-center gap-1 bg-slate-200/90 text-slate-900 px-2.5 py-1 rounded-lg border border-slate-300 shadow-3xs">👈 ปัดซ้ายไปข้อถัดไป</span>
                            <span className="flex items-center gap-1 bg-slate-200/90 text-slate-900 px-2.5 py-1 rounded-lg border border-slate-300 shadow-3xs">ปัดขวาเพื่อย้อนกลับ 👉</span>
                          </div>

                          <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                              key={currentStep}
                              custom={direction}
                              drag="x"
                              dragConstraints={{ left: 0, right: 0 }}
                              dragElastic={0.65}
                              onDragEnd={(_, info) => {
                                const swipeThreshold = 50;
                                const swipeVelocity = 200;
                                const offset = info.offset.x;
                                const velocity = info.velocity.x;

                                if (offset < -swipeThreshold || velocity < -swipeVelocity) {
                                  // Dragged/flicked to the left -> Swipe-to-dismiss current card to left & go to Next
                                  if (currentStep < 6) {
                                    setDirection(1);
                                    setCurrentStep(prev => prev + 1);
                                    playSound('click', soundEnabled);
                                  } else {
                                    toast.info('นี่คือคำถามข้อสุดท้ายแล้วครับ กดบันทึกคำตอบทั้งหมดได้เลย! ✨');
                                  }
                                } else if (offset > swipeThreshold || velocity > swipeVelocity) {
                                  // Dragged/flicked to the right -> Swipe-to-dismiss current card to right & go to Prev
                                  if (currentStep > 0) {
                                    setDirection(-1);
                                    setCurrentStep(prev => prev - 1);
                                    playSound('back', soundEnabled);
                                  }
                                }
                              }}
                              whileDrag={{ scale: 1.02, rotate: 1 }}
                              variants={{
                                enter: (dir: number) => ({
                                  x: dir > 0 ? 250 : dir < 0 ? -250 : 0,
                                  opacity: 0,
                                  scale: 0.93,
                                  rotate: dir > 0 ? 6 : dir < 0 ? -6 : 0,
                                }),
                                center: {
                                  x: 0,
                                  opacity: 1,
                                  scale: 1,
                                  rotate: 0,
                                },
                                exit: (dir: number) => ({
                                  x: dir < 0 ? 250 : dir > 0 ? -250 : 0,
                                  opacity: 0,
                                  scale: 0.91,
                                  rotate: dir < 0 ? 10 : dir > 0 ? -10 : 0,
                                })
                              }}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                              className="relative z-10 cursor-grab active:cursor-grabbing select-none w-full touch-pan-y"
                            >
                              {/* Content switches based on card type */}
                              {questCards[currentStep].type === 'questions' ? (
                                <div className="bg-white p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-md space-y-5 w-full">
                                  <div className="space-y-2 text-left">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl p-1.5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-4xs select-none shrink-0">
                                        {questCards[currentStep].emoji}
                                      </span>
                                      <h4 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
                                        {questCards[currentStep].title}
                                      </h4>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-bold font-sans">
                                      {questCards[currentStep].desc}
                                    </p>
                                  </div>

                                  <div className="space-y-4 pt-1">
                                    {questCards[currentStep].questions!.map((q) => (
                                      <div key={q.id}>
                                        {renderStarInput(
                                          q.label,
                                          q.value,
                                          q.onChange,
                                          q.hover,
                                          q.setHover,
                                          q.desc,
                                          q.emoji,
                                          q.theme,
                                          true
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : questCards[currentStep].type === 'likedMost' ? (
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-md space-y-4.5">
                                  <div className="space-y-1.5 text-left border-b border-slate-200 pb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl p-1.5 bg-emerald-50 border border-emerald-100 rounded-xl shadow-4xs select-none shrink-0">
                                        🌸
                                      </span>
                                      <h4 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
                                        {questCards[currentStep].title}
                                      </h4>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-bold">
                                      {questCards[currentStep].desc}
                                    </p>
                                  </div>

                                  <div className="space-y-4 text-left">
                                    <div className="space-y-2">
                                      <p className="text-xs sm:text-sm text-slate-950 font-black leading-relaxed flex items-center gap-1.5">
                                        <span>🌸</span> <span>แตะเลือกการ์ดความคิดเห็นด่วน (หรือพิมพ์เพิ่มเติมด้านล่าง):</span>
                                      </p>
                                      {renderInteractiveCardDeck(ideaCardsLikedMost, likedMost, setLikedMost)}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                      <p className="text-xs sm:text-sm text-slate-950 font-black leading-relaxed flex items-center gap-1.5">
                                        <span>✍️</span> <span>พิมพ์ระบายความรู้สึกประทับใจเพิ่มเติม:</span>
                                      </p>
                                      <textarea
                                        rows={3}
                                        value={likedMost}
                                        onChange={(e) => setLikedMost(e.target.value)}
                                        placeholder="พิมพ์เพิ่มเติมความประทับใจของคุณได้ที่นี่..."
                                        maxLength={1000}
                                        className="w-full p-3.5 bg-slate-50/80 focus:bg-white border-2 border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-950 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-500 font-bold leading-relaxed shadow-3xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : questCards[currentStep].type === 'suggestions' ? (
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-md space-y-4.5">
                                  <div className="space-y-1.5 text-left border-b border-slate-200 pb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl p-1.5 bg-amber-50 border border-amber-100 rounded-xl shadow-4xs select-none shrink-0">
                                        💡
                                      </span>
                                      <h4 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
                                        {questCards[currentStep].title}
                                      </h4>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-bold">
                                      {questCards[currentStep].desc}
                                    </p>
                                  </div>

                                  <div className="space-y-4 text-left">
                                    <div className="space-y-2">
                                      <p className="text-xs sm:text-sm text-slate-950 font-black leading-relaxed flex items-center gap-1.5">
                                        <span>💡</span> <span>แตะเลือกการ์ดข้อเสนอแนะสำหรับการจัดทริป:</span>
                                      </p>
                                      {renderInteractiveCardDeck(ideaCardsSuggestions, suggestions, setSuggestions)}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                      <p className="text-xs sm:text-sm text-slate-950 font-black leading-relaxed flex items-center gap-1.5">
                                        <span>✍️</span> <span>พิมพ์คำแนะนำและแนวทางปรับปรุงเพิ่มเติม:</span>
                                      </p>
                                      <textarea
                                        rows={3}
                                        value={suggestions}
                                        onChange={(e) => setSuggestions(e.target.value)}
                                        placeholder="พิมพ์แนะนำเพิ่มเติมเพื่อการจัดทริปที่ดีกว่าเดิมได้ที่นี่..."
                                        maxLength={1000}
                                        className="w-full p-3.5 bg-slate-50/80 focus:bg-white border-2 border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-950 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all placeholder:text-slate-500 font-bold leading-relaxed shadow-3xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-md space-y-4.5">
                                  <div className="space-y-1.5 text-left border-b border-slate-200 pb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl p-1.5 bg-fuchsia-50 border border-fuchsia-100 rounded-xl shadow-4xs select-none shrink-0">
                                        💌
                                      </span>
                                      <h4 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug">
                                        {questCards[currentStep].title}
                                      </h4>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-bold">
                                      {questCards[currentStep].desc}
                                    </p>
                                  </div>

                                  <div className="space-y-4 text-left">
                                    <div className="space-y-2">
                                      <p className="text-xs sm:text-sm text-slate-950 font-black leading-relaxed flex items-center gap-1.5">
                                        <span>💌</span> <span>แตะเลือกการ์ดขอบคุณและกำลังใจแด่เพื่อนพนักงาน:</span>
                                      </p>
                                      {renderInteractiveCardDeck(ideaCardsShoutout, shoutout, setShoutout)}
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                      <p className="text-xs sm:text-sm text-slate-950 font-black leading-relaxed flex items-center gap-1.5">
                                        <span>✍️</span> <span>พิมพ์ข้อความขอบคุณและส่งกำลังใจเพิ่มเติม:</span>
                                      </p>
                                      <textarea
                                        rows={3}
                                        value={shoutout}
                                        onChange={(e) => setShoutout(e.target.value)}
                                        placeholder="พิมพ์ส่งกำลังใจหรือคำขอบคุณเพิ่มเติมตรงนี้ได้เลย..."
                                        maxLength={1000}
                                        className="w-full p-3.5 bg-slate-50/80 focus:bg-white border-2 border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-950 outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-600 transition-all placeholder:text-slate-500 font-bold leading-relaxed shadow-3xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                          
                          {/* Aesthetic stacked cards layer visual feedback */}
                          {currentStep < 6 && (
                            <div className="absolute top-2 left-2 right-2 bottom-0 bg-slate-100/60 rounded-3xl border border-slate-200 -z-10 translate-y-2 scale-[0.98] pointer-events-none" />
                          )}
                          {currentStep < 5 && (
                            <div className="absolute top-4 left-4 right-4 bottom-0 bg-slate-200/40 rounded-3xl border border-slate-200/50 -z-20 translate-y-4 scale-[0.96] pointer-events-none" />
                          )}
                        </div>

                        {/* Wizard Navigation Footer Controls */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 select-none">
                          <button
                            type="button"
                            disabled={currentStep === 0}
                            onClick={() => {
                              setDirection(-1);
                              setCurrentStep(prev => prev - 1);
                              playSound('back', soundEnabled);
                            }}
                            className="px-4 sm:px-5 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-800 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] border border-slate-200/80 shadow-3xs"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            ย้อนกลับ
                          </button>

                          {currentStep < 6 ? (
                            <button
                              key="next-step-button"
                              type="button"
                              onClick={() => {
                                setDirection(1);
                                setCurrentStep(prev => prev + 1);
                                playSound('click', soundEnabled);
                              }}
                              className="px-5 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            >
                              หมวดถัดไป
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          ) : (
                            /* Final step submit action */
                            <button
                              key="submit-step-button"
                              type="submit"
                              disabled={isSubmitting || syncing}
                              className="px-5 sm:px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                            >
                              {isSubmitting ? (
                                <>
                                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  กำลังส่งข้อมูล...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 animate-bounce" />
                                  ส่งคำตอบทั้งหมดเรียบร้อย! ✨
                                </>
                              )}
                            </button>
                          )}
                        </div>

                      </div>
                    ) : (
                      /* CLASSIC FULL SINGLE-PAGE FORM */
                      <div className="space-y-4" id="survey-classic-form">
                        
                        {/* 8 Ratings */}
                        <div className="space-y-4">
                          {renderStarInput(
                            '1. ภาพรวมการเที่ยวทริปครั้งนี้',
                            ratingOverall,
                            setRatingOverall,
                            hoverOverall,
                            setHoverOverall,
                            'ความประทับใจความพึงพอใจโดยรวมทั้งหมดต่อทริปพักผ่อนสันทนาการปี 2569 นี้',
                            '🧭',
                            'from-amber-400 to-orange-500'
                          )}

                          {renderStarInput(
                            '2. ที่พัก การต้อนรับ และความสะดวกสบาย',
                            ratingAccommodation,
                            setRatingAccommodation,
                            hoverAccommodation,
                            setHoverAccommodation,
                            'ระดับความสะอาด สิ่งอำนวยความสะดวกสบายในโรงแรม, และความอบอุ่นใจในการช่วยเหลือของพนักงานรีสอร์ท',
                            '🏢',
                            'from-blue-400 to-indigo-500'
                          )}

                           {renderStarInput(
                            '3. อาหาร เครื่องดื่ม และมื้อจัดเลี้ยงสังสรรค์',
                            ratingFood,
                            setRatingFood,
                            hoverFood,
                            setHoverFood,
                            'รสชาติความอร่อย คุณภาพอาหารโต๊ะจีน อาทิ ขาหมูเชลล์ชวนชิม ปลานึ่งมะนาว ไก่ย่าง และเครื่องดื่ม',
                            '🍹',
                            'from-emerald-400 to-teal-500'
                          )}

                          {renderStarInput(
                            '4. กิจกรรมนันทนาการ ละลายพฤติกรรม และทีมบิวดิ้ง',
                            ratingActivities,
                            setRatingActivities,
                            hoverActivities,
                            setHoverActivities,
                            'ความเพลิดเพลิน ความมีชีวิตชีวาของเกมสันทนาการกระชับสัมพันธ์ และของรางวัลในกิจกรรม',
                            '🎯',
                            'from-purple-400 to-pink-500'
                          )}

                          {renderStarInput(
                            '5. ตารางกำหนดการ ความกระชับและการเดินทาง',
                            ratingSchedule,
                            setRatingSchedule,
                            hoverSchedule,
                            setHoverSchedule,
                            'การบริหารเวลาในการขับรถบัส/พาหนะ ความเหมาะสมของระยะเวลาในจุดจอด ไม่เร่งรัดจนล้าเกินไป',
                            '📅',
                            'from-orange-400 to-red-500'
                          )}

                          {renderStarInput(
                            '6. ปริมาณเวลาว่างพักผ่อน และความเป็นส่วนตัว',
                            ratingRestTime,
                            setRatingRestTime,
                            hoverRestTime,
                            setHoverRestTime,
                            'การมีสเปซอิสระริมลำธารธรรมชาติ/ป่าเขา ให้เดินแชะรูปคุยชิลๆ ผ่อนคลาย โดยไม่มีกิจกรรมบังคับที่เยอะเกินไป',
                            '🌲',
                            'from-teal-400 to-cyan-500'
                          )}

                          {renderStarInput(
                            '7. เครื่องดื่ม ซอฟต์ดริ้งค์ และแอลกอฮอล์ในงานเลี้ยง',
                            ratingBeverages,
                            setRatingBeverages,
                            hoverBeverages,
                            setHoverBeverages,
                            'ปริมาณความเพียงพอของน้ำอัดลม น้ำแข็ง เบียร์ และแอลกอฮอล์ตลอดค่ำคืนงานสังสรรค์หลัก',
                            '🥤',
                            'from-fuchsia-400 to-purple-500'
                          )}

                          {renderStarInput(
                            '8. ดนตรี เวที คาราโอเกะ และความบันเทิงในปาร์ตี้',
                            ratingMusic,
                            setRatingMusic,
                            hoverMusic,
                            setHoverMusic,
                            'ความตระการตาของคุณภาพเสียง วงดนตรีสด ดีเจเปิดเพลง และกิจกรรมสันทนาการบนเวที',
                            '🎸',
                            'from-pink-400 to-rose-500'
                          )}
                        </div>

                        {/* Open Ended Fields for Classic */}
                        <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-200/60 space-y-4">
                          <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            ข้อเสนอแนะและไอเดียเพิ่มเติมสะท้อนกลับ (Classic)
                          </h4>

                          <div className="space-y-2">
                            <label className="block text-sm font-black text-slate-900">สิ่งที่ประทับใจที่สุดในทริปนี้ 🌸</label>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              เลือกตอบด่วนผ่านระบบการ์ดความคิดเห็น หรือพิมพ์ข้อมูลที่ต้องการระบายในช่องข้อความได้ตามสะดวก:
                            </p>
                            {renderInteractiveCardDeck(ideaCardsLikedMost, likedMost, setLikedMost)}
                            <textarea
                              rows={2}
                              value={likedMost}
                              onChange={(e) => setLikedMost(e.target.value)}
                              placeholder="เลือกการ์ดด้านบน หรือพิมพ์ระบายความประทับใจของคุณเพิ่มเติมตรงนี้..."
                              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 font-medium text-slate-900 shadow-3xs"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-black text-slate-900">ข้อเสนอแนะสำหรับการจัดทริปครั้งถัดไป 💡</label>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              การ์ดเสนอแนะที่พนักงานส่วนใหญ่อยากผลักดัน หรือพิมพ์อธิบายข้อกังวลความต้องการ:
                            </p>
                            {renderInteractiveCardDeck(ideaCardsSuggestions, suggestions, setSuggestions)}
                            <textarea
                              rows={2}
                              value={suggestions}
                              onChange={(e) => setSuggestions(e.target.value)}
                              placeholder="เลือกการ์ดความเห็นด้านบน หรือระบุคำเสนอแนะของคุณสำหรับการปรับปรุง..."
                              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 font-medium text-slate-900 shadow-3xs"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-black text-slate-900">ข้อความส่งท้าย / ขอบคุณผู้จัดหรือเพื่อนพนักงาน 💌</label>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              ส่งมอบกำลังใจและ Shoutout เพื่อขอบคุณทีมงานสตาฟ แอดมิน หรือเพื่อนๆ ในการเดินทาง:
                            </p>
                            {renderInteractiveCardDeck(ideaCardsShoutout, shoutout, setShoutout)}
                            <textarea
                              rows={2}
                              value={shoutout}
                              onChange={(e) => setShoutout(e.target.value)}
                              placeholder="เลือกการ์ดขอบคุณด้านบน หรือบันทึกข้อความความรู้สึกดีๆ ด้วยลายลักษณ์อักษร..."
                              className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 font-medium text-slate-900 shadow-3xs"
                            />
                          </div>
                        </div>

                        {/* Classic Submit Row */}
                        <button
                          type="submit"
                          disabled={isSubmitting || syncing}
                          className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              กำลังบันทึกความคิดเห็นทั้งหมดของคุณ...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              ส่งข้อมูลความเห็น & แบบประเมินทั้งหมด
                            </>
                          )}
                        </button>

                      </div>
                    )}

                  </form>
                ) : (
                  /* THANK YOU / SUMMARY PAGE */
                  <div className="text-center py-8 px-4 space-y-6" id="feedback-success-summary">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center shadow-sm select-none animate-bounce">
                        <Award className="w-9 h-9 text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-800">ขอบคุณสำหรับความเห็นของคุณ! 🎉</h4>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          คุณได้บันทึกและรวบรวมแบบประเมินความพึงพอใจทริปเป็นที่เรียบร้อยแล้ว คอนเซ็ปต์เสียงสะท้อนของคุณจะถูกนำไปวิเคราะห์ในแบบสรุปสถิติทันที
                        </p>
                      </div>
                    </div>

                    {/* Summary Ratings Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                      {[
                        { label: 'ภาพรวมทริป', rating: ratingOverall, emoji: '🧭' },
                        { label: 'ที่พักโรงแรม', rating: ratingAccommodation, emoji: '🏢' },
                        { label: 'อาหารเครื่องดื่ม', rating: ratingFood, emoji: '🍹' },
                        { label: 'กิจกรรมสันทนาการ', rating: ratingActivities, emoji: '🎯' },
                        { label: 'ความตรงต่อเวลา', rating: ratingSchedule, emoji: '📅' },
                        { label: 'เวลาว่างพักผ่อน', rating: ratingRestTime, emoji: '🌲' },
                        { label: 'เครื่องดื่มแอลกอฮอล์', rating: ratingBeverages, emoji: '🥤' },
                        { label: 'ดนตรีคาราโอเกะ', rating: ratingMusic, emoji: '🎸' }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-150/60 flex flex-col justify-between">
                          <span className="text-xs select-none mb-1">{item.emoji} {item.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono font-black text-slate-800">{item.rating}</span>
                            <span className="text-[10px] text-amber-500 font-bold">★</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(true);
                          setShowGuidanceModal(true);
                          playSound('click', soundEnabled);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        📝 แก้ไขคำตอบประเมินใหม่
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Comment board list - displayed only on final page / summary */}
          {!showForm && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    กระดานแชร์ไอเดียและความคิดเห็นล่าสุด ({feedbacks.filter(f => f.likedMost || f.suggestions || f.shoutout).length} ความเห็น)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                  Real-time 🟢
                </span>
              </div>

              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-100">
                {feedbacks.filter(f => f.likedMost || f.suggestions || f.shoutout).length === 0 ? (
                  <div className="text-center py-14 text-slate-450 italic text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    ยังไม่มีพนักงานฝากข้อความแชร์ไอเดียไว้ในกระดานนี้ มาร่วมเป็นคนแรกเพื่อจุดประกายกันครับ!
                  </div>
                ) : (
                  feedbacks
                    .filter(f => f.likedMost || f.suggestions || f.shoutout)
                    .sort((a, b) => {
                      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                      return timeB - timeA; // Descending
                    })
                    .map((feed) => {
                      const displayName = feed.isAnonymous ? 'เพื่อนพนักงานนิรนาม 🤫' : feed.employeeName;
                      const deptLabel = feed.isAnonymous ? 'ซ่อนแผนกไว้' : feed.department;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={feed.id}
                          className="bg-slate-50/40 border border-slate-150/80 rounded-2xl p-4.5 space-y-3.5 transition-all hover:bg-slate-50 hover:shadow-4xs"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-3xs ${
                                feed.isAnonymous 
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200/50' 
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}>
                                {feed.isAnonymous ? '🤫' : (feed.employeeName ? feed.employeeName[0] : 'U')}
                              </div>
                              <div>
                                <span className="text-xs font-black text-slate-800">{displayName}</span>
                                <span className="inline-block mx-1.5 text-slate-350">•</span>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-455 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded-lg">
                                  <Building2 className="w-2.5 h-2.5 text-slate-400" />
                                  {deptLabel}
                                </span>
                              </div>
                            </div>
                            
                            {/* Overall score banner */}
                            <div className="flex items-center gap-1 bg-white border border-slate-200/60 px-2 py-0.5 rounded-lg shadow-4xs">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-[10px] font-mono font-black text-slate-700">{feed.ratingOverall} / 5</span>
                            </div>
                          </div>

                          {/* Text responses display */}
                          <div className="space-y-2.5 text-xs font-sans font-semibold">
                            {feed.likedMost && (
                              <div className="leading-relaxed">
                                <span className="font-extrabold text-slate-500 block text-[9px] uppercase tracking-wide">🌸 สิ่งที่ชอบมากที่สุด:</span>
                                <p className="text-slate-700 mt-0.5 pl-2 border-l-2 border-emerald-400 font-medium font-sans">“{feed.likedMost}”</p>
                              </div>
                            )}

                            {feed.suggestions && (
                              <div className="leading-relaxed">
                                <span className="font-extrabold text-slate-500 block text-[9px] uppercase tracking-wide">💡 ข้อเสนอแนะทริปถัดไป:</span>
                                <p className="text-slate-700 mt-0.5 pl-2 border-l-2 border-amber-400 font-medium font-sans">“{feed.suggestions}”</p>
                              </div>
                            )}

                            {feed.shoutout && (
                              <div className="leading-relaxed">
                                <span className="font-extrabold text-slate-500 block text-[9px] uppercase tracking-wide">💌 ขอบคุณ & กำลังใจ:</span>
                                <p className="text-slate-800 mt-0.5 pl-2 border-l-2 border-fuchsia-400 font-black italic bg-fuchsia-50/20 py-1 rounded-r-lg">“{feed.shoutout}”</p>
                              </div>
                            )}
                          </div>

                          {feed.submittedAt && (
                            <div className="text-[9px] text-slate-400 font-mono text-right pt-1 border-t border-slate-100/50">
                              บันทึกเมื่อ {new Date(feed.submittedAt).toLocaleDateString('th-TH')} {new Date(feed.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Visualized Dashboard / Statistics (Only rendered when !showForm) */}
        {!showForm && (
          <div className="lg:col-span-5 space-y-4">
            
            {/* Main Visualized Hero Score card */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-indigo-300 uppercase block">TRIP JOY INDEX</span>
                    <h3 className="text-base font-display font-black text-white mt-1">
                      คะแนนรวมความสุขเฉลี่ย
                    </h3>
                    <p className="text-[10px] text-slate-300 mt-1 font-semibold leading-relaxed">
                      วัดความพึงพอใจครอบคลุมพนักงานผู้ร่วมทริปในระบบคลาวด์
                    </p>
                  </div>
                  
                  <div className="bg-white/10 border border-white/10 p-3.5 rounded-2xl text-center shadow-inner shrink-0 w-full sm:w-auto">
                    <p className="text-3xl font-black text-amber-300 font-mono tracking-tight">{stats.avgOverall || '0.0'}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      {renderStarDisplay(stats.avgOverall, "w-3 h-3")}
                    </div>
                    <p className="text-[8px] text-indigo-200 font-bold mt-1">เต็ม 5.0 ดาว</p>
                  </div>
                </div>

                <div className="pt-4 space-y-2 relative z-10 text-xs">
                  <div className="flex justify-between font-bold text-indigo-200">
                    <span>อัตราการตอบกลับแบบสำรวจ</span>
                    <span>{stats.percentSubmitted}% ({stats.totalSubmitted} จาก พนักงานที่มาจริง)</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950/60 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-700"
                      style={{ width: `${stats.percentSubmitted}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 font-semibold italic text-center sm:text-left">
                    * สถิติอัปเดตแบบ Real-time ทันทีเมื่อมีการเพิ่ม/ลบข้อมูลในชีต
                  </p>
                </div>
              </div>

              {/* Breakdown Bento Box */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    ดัชนีคะแนนประเมินทั้ง 8 มิติ
                  </h3>
                  <span className="text-[9px] font-black text-slate-400">เต็ม 5.0 ⭐</span>
                </div>

                <div className="space-y-3.5">
                  
                  {/* Category 1 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">🧭 1. ภาพรวมการเดินทาง</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgOverall || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${(stats.avgOverall / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgOverall, "w-3 h-3")}
                    </div>
                  </div>

                  {/* Category 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">🏢 2. ที่พักและการบริการ</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgAccommodation || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(stats.avgAccommodation / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgAccommodation, "w-3 h-3")}
                    </div>
                  </div>

                  {/* Category 3 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">🍹 3. อาหารและจัดเลี้ยง</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgFood || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(stats.avgFood / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgFood, "w-3 h-3")}
                    </div>
                  </div>

                  {/* Category 4 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">🎯 4. กิจกรรมนันทนาการ</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgActivities || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(stats.avgActivities / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgActivities, "w-3 h-3")}
                    </div>
                  </div>

                  {/* Category 5 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">📅 5. ตารางกำหนดการ / เวลา</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgSchedule || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${(stats.avgSchedule / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgSchedule, "w-3 h-3")}
                    </div>
                  </div>

                  {/* Category 6 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">🏖️ 6. เวลาพักว่าง & ส่วนตัว</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgRestTime || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${(stats.avgRestTime / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgRestTime, "w-3 h-3")}
                    </div>
                  </div>

                  {/* Category 7 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">🥤 7. เครื่องดื่มแอลกอฮอล์</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgBeverages || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-fuchsia-500 rounded-full"
                          style={{ width: `${(stats.avgBeverages / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgBeverages, "w-3 h-3")}
                    </div>
                  </div>

                  {/* Category 8 */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700 flex items-center gap-1">🎸 8. ดนตรี & เวทีปาร์ตี้</span>
                      <span className="font-mono font-black text-slate-800">{stats.avgMusic || '0.0'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pink-500 rounded-full"
                          style={{ width: `${(stats.avgMusic / 5) * 100}%` }}
                        />
                      </div>
                      {renderStarDisplay(stats.avgMusic, "w-3 h-3")}
                    </div>
                  </div>

                </div>
              </div>

              {/* HR Value FAQ information card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 space-y-3 text-xs">
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600 animate-bounce" />
                  เสียงสะท้อนของคุณมีผลอย่างไร?
                </h4>
                <p className="text-slate-500 leading-relaxed font-semibold text-[11px]">
                  แอดมินและทีมประสานฝ่ายทรัพยากรบุคคล (HR) ได้ประสานเชื่อมโยงฐานข้อมูลแผ่นนี้โดยตรง เข้ากับตัวเลขสเปรดชีตแสดงผลบนบอร์ดผู้บริหาร เพื่อใช้เป็นดัชนีคะแนน (Joy Score) ในการประกอบแผนจัดกิจกรรมทริปประจำปีปีถัดไป การสละเวลาตอบอย่างถี่ถ้วนจึงมีค่ายิ่งต่อผลประโยชน์และวันพักผ่อนที่ประเสริฐที่สุดของพวกเราทุกคนครับ!
                </p>
              </div>

            </div>
          )}

      </div>

      {/* Trip Itinerary Overlay Modal */}
      <AnimatePresence>
        {showItineraryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-100 relative space-y-5"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 relative z-10 sticky top-0 bg-white/95 backdrop-blur-md pt-1 -mt-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-emerald-50 text-indigo-600 flex items-center justify-center font-black text-xl shrink-0 border border-indigo-200/80 shadow-2xs">
                    🗺️
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase block">TRIP ITINERARY SCHEDULE</span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
                      ตารางกิจกรรมทริปประเมิน เขาใหญ่ - คีรีธารทิพย์ รีสอร์ท (29 - 30 ก.ค.) 🌿✨
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowItineraryModal(false);
                    playSound('click', soundEnabled);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold transition-all cursor-pointer shrink-0"
                  title="ปิดตารางกิจกรรม"
                >
                  ✕
                </button>
              </div>

              {/* Timelines for Day 1 and Day 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {/* Day 1 Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                    <span className="text-xs font-black px-2.5 py-1 bg-indigo-600 text-white rounded-lg select-none">DAY 1</span>
                    <span className="text-xs font-black text-indigo-950">วันพุธที่ 29 กรกฎาคม 2569 (วันเที่ยวสุดฟิน) 🌲</span>
                  </div>
                  
                  <div className="relative border-l-2 border-indigo-100/75 pl-4 ml-2.5 space-y-4.5">
                    {[
                      { time: '06.30 น.', icon: '⛩️', title: 'รวมตัว ณ โครงการส่งน้ำฯ มูลล่าง', desc: 'สักการะศาลพระภูมิและสิ่งศักดิ์สิทธิ์ประจำโครงการ เอาฤกษ์เอาชัยก่อนล้อหมุน!' },
                      { time: '07.00 น.', icon: '🚌', title: 'รถบัสออกเดินทางเต็มพิกัด', desc: 'ออกเดินทางมุ่งสู่เขาใหญ่ ห้ามเลทเด็จขาด ใครมาสายโดนปรับเป็นกองกลางปาร์ตี้นะจ๊ะ' },
                      { time: '11.00 น.', icon: '🐷', title: 'มื้อเที่ยง: ลักษณา ขาหมู นางรอง', desc: 'เติมพลังด้วยขาหมูชื่อดังในตำนาน ละลายในปาก หนังนุ่มๆ คอเลสเตอรอลร้องขอชีวิต!' },
                      { time: '13.00 น.', icon: '📸', title: 'แวะเช็กอิน La Tosca Khao Yai', desc: 'แวะถ่ายรูปสวยๆ เก๋ๆ ชิคๆ วิวอิตาลี เตรียมโพสท่าสะท้านสเตตัสโซเชียลกัน 30 นาทีเต็ม' },
                      { time: '15.00 น.', icon: '⛰️', title: 'เดินทางต่อเข้าสู่ที่พัก', desc: 'มุ่งหน้าสู่รีสอร์ทโอบล้อมดงเขาและธรรมชาติบริสุทธิ์' },
                      { time: '16.00 น.', icon: '🏨', title: 'เช็กอิน @ เขาใหญ่ คีรีธารทิพย์ รีสอร์ท', desc: 'พักผ่อนตามอัธยาศัย ชาร์จแบตสัมผัสธรรมชาติ หรือนอนอืดบนเตียงนุ่มดูดวิญญาณ' },
                      { time: '18.00 น.', icon: '🥳', title: 'งานเลี้ยงเกษียณ & ปิดงบประมาณปี 2569', desc: 'งานเลี้ยงสุดอบอุ่น คาราโอเกะจัดเต็ม ปิ้งย่างบุฟเฟต์ แดนซ์สะโพกยับย่นลืมเรื่องงาน!' },
                      { time: '23.00 น.', icon: '💤', title: 'สิ้นสุดกิจกรรม คืนไมค์ไปนอน', desc: 'ราตรีสวัสดิ์ นอนหลับฟังเสียงลำธารน้ำไหลใสๆ คอยฟังเสียงรูมเมทประสานเสียงกรนกล่อมเบาๆ' },
                    ].map((item, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-7.5 top-0.5 w-5.5 h-5.5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs shadow-5xs select-none">
                          {item.icon}
                        </span>
                        <div className="space-y-0.5 text-left">
                          <span className="text-[10px] font-black text-indigo-600 font-mono bg-indigo-50/50 border border-indigo-100 px-1.5 py-0.5 rounded-md">{item.time}</span>
                          <h5 className="text-[11px] font-black text-slate-800 tracking-tight mt-1">{item.title}</h5>
                          <p className="text-[9.5px] text-slate-500 font-semibold leading-relaxed font-sans">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day 2 Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                    <span className="text-xs font-black px-2.5 py-1 bg-emerald-600 text-white rounded-lg select-none">DAY 2</span>
                    <span className="text-xs font-black text-emerald-950">วันพฤหัสบดีที่ 30 กรกฎาคม 2569 (วันกลับประทับใจ) 🏔️</span>
                  </div>
                  
                  <div className="relative border-l-2 border-emerald-100/75 pl-4 ml-2.5 space-y-4.5">
                    {[
                      { time: '07.00 - 10.00 น.', icon: '🥞', title: 'มื้อเช้าแสนอบอุ่น ณ รีสอร์ท', desc: 'ตื่นมารับลมเช้า สูดอากาศบริสุทธิ์ แวะตักบุฟเฟต์เช้าแบบอิ่มจุกๆ' },
                      { time: '10.00 น.', icon: '🔑', title: 'เช็กเอาต์ อำลาคีรีธารทิพย์', desc: 'ตรวจสอบสัมภาระให้เรียบร้อย อย่าลืมลืมรูมเมทหรือของขวัญล้ำค่าไว้ในห้องล่ะ!' },
                      { time: '11.00 น.', icon: '🚌', title: 'ล้อหมุน เดินทางกลับบ้านเฮา', desc: 'โบกมืออำลาหุบเขาเขาใหญ่ ออกเดินทางมุ่งหน้าเดินทางกลับ' },
                      { time: '12.00 น.', icon: '🍛', title: 'มื้อกลางวัน ทานอาหารสุดแซ่บ', desc: 'แวะกินข้าวอาหารรสเลิศระหว่างทาง เติมพลังมื้อบ่ายให้หายง่วง' },
                      { time: '15.00 น.', icon: '🏯', title: 'เที่ยวชม "อุทยานประวัติศาสตร์พนมรุ้ง"', desc: 'ย้อนรอยอารยธรรมโบราณ แชะภาพถ่ายที่ระลึกบันไดหินสิบห้าชั้น อากาศดีได้ออกกำลังกายย่อยข้าว!' },
                      { time: '17.00 น.', icon: '🍽️', title: 'มื้อเย็นสุดฟิน @ 361 THREE SIX ONE', desc: 'แวะร้านอาหารคาเฟ่สุดอลังการมิติใหม่ 361 กินข้าว ถ่ายรูปหมู่โบกมือบ๊ายบายทริปแสนสุข' },
                      { time: '18.30 น.', icon: '🏡', title: 'เดินทางกลับโดยสวัสดิภาพ', desc: 'ถึงจุดหมายโดยปลอดภัยพร้อมเมมโมรี่รูปเต็มกล่อง พลังใจพร้อมทำงาน 300%' },
                    ].map((item, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-7.5 top-0.5 w-5.5 h-5.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs shadow-5xs select-none">
                          {item.icon}
                        </span>
                        <div className="space-y-0.5 text-left">
                          <span className="text-[10px] font-black text-emerald-600 font-mono bg-emerald-50/50 border border-emerald-100 px-1.5 py-0.5 rounded-md">{item.time}</span>
                          <h5 className="text-[11px] font-black text-slate-800 tracking-tight mt-1">{item.title}</h5>
                          <p className="text-[9.5px] text-slate-500 font-semibold leading-relaxed font-sans">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
                <span className="text-[11px] font-semibold text-slate-500">
                  📅 ทริปประจำปีและการสัมมนาปิดงบประมาณปี 2569 ณ คีรีธารทิพย์ รีสอร์ท
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowItineraryModal(false);
                    playSound('click', soundEnabled);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
                >
                  เข้าใจแล้ว / ปิดหน้าต่าง ✨
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Survey Guidance Overlay Modal */}
      <AnimatePresence>
        {showForm && showGuidanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden space-y-5"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xl shrink-0 border border-indigo-200/80 shadow-2xs">
                    📋
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase block">SURVEY GUIDANCE</span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                      คำแนะนำในการตอบแบบสอบถาม
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowGuidanceModal(false);
                    playSound('click', soundEnabled);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold transition-all cursor-pointer shrink-0"
                  title="ปิดคำแนะนำ"
                >
                  ✕
                </button>
              </div>

              {/* Step guidance items */}
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed relative z-10">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
                  <div>
                    <strong className="text-slate-900 font-extrabold block text-xs sm:text-sm">8 มิติประเมินความสุข</strong>
                    <span className="text-slate-600 text-xs">แตะเลือกคะแนนดาว 1-5 ตามระดับความพึงพอใจจริงของคุณในแต่ละหมวด</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">2</span>
                  <div>
                    <strong className="text-slate-900 font-extrabold block text-xs sm:text-sm">การ์ดความคิดเห็นด่วน</strong>
                    <span className="text-slate-600 text-xs">แตะเลือกการ์ดความรู้สึกสำเร็จรูปเพื่อความรวดเร็ว หรือพิมพ์ระบายเพิ่มได้ตามสบาย</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">3</span>
                  <div>
                    <strong className="text-emerald-950 font-black block text-xs sm:text-sm flex items-center gap-1.5">
                      <span>🛡️ ปกป้องความเป็นส่วนตัว 100%</span>
                    </strong>
                    <span className="text-emerald-900 text-xs font-semibold">ช่องติ๊กถูกเป็นค่าว่างโดยอัตโนมัติ เพื่อคุ้มครองไม่ระบุตัวตน (หากต้องการเปิดเผยชื่อจริงต่อเพื่อนๆ สามารถคลิกเปิดสถานะได้)</span>
                  </div>
                </div>
              </div>

              {/* Reassurance Banner */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-950 font-bold flex items-center gap-2.5 relative z-10">
                <span className="text-lg shrink-0">🔒</span>
                <span>ระบบจะรวมคะแนนและแสดงดัชนีคะแนนความสุข (Joy Index) ภาพรวมทันทีเมื่อส่งคำตอบเรียบร้อยแล้ว</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowGuidanceModal(false);
                  playSound('click', soundEnabled);
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-black text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 relative z-10"
              >
                <span>เข้าใจแล้ว เริ่มทำแบบประเมิน ✨</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy & Identity Selection Popup Modal before final Submit */}
      <AnimatePresence>
        {showSubmitConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-100 relative space-y-5 overflow-hidden"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
                    ✨
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase block">FINAL CONFIRMATION</span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      เลือกรูปแบบการแสดงผลชื่อบนบอร์ด
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitConfirmModal(false);
                    playSound('click', soundEnabled);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold transition-all cursor-pointer shrink-0 text-xs"
                  title="ปิด"
                >
                  ✕
                </button>
              </div>

              {/* Employee Info & Rating Badge */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs font-bold text-slate-700 relative z-10">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                    👤
                  </span>
                  <span className="truncate text-xs font-black text-slate-800">
                    {currentEmployee?.name || 'พนักงาน'} ({currentEmployee?.department || '-'})
                  </span>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 border border-amber-200">
                  ⭐ ภาพรวม {ratingOverall}/5
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium relative z-10">
                โปรดเลือกรูปแบบที่คุณต้องการแสดงผลความคิดเห็นประเมินทริปนี้บนกระดานส่วนรวม:
              </p>

              {/* Identity Option Selector Cards */}
              <div className="space-y-2.5 relative z-10">
                {/* Option 1: Anonymous */}
                <div
                  onClick={() => {
                    setIsAnonymous(true);
                    playSound('select', soundEnabled);
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex items-start gap-3 ${
                    isAnonymous
                      ? 'bg-emerald-50/90 border-emerald-500 shadow-3xs ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                    isAnonymous ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    🤫
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span>ส่งแบบไม่ระบุตัวตน (Anonymous)</span>
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isAnonymous ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                      }`}>
                        {isAnonymous && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      ความคิดเห็นของคุณจะแสดงผลเป็น <strong className="text-emerald-800 font-black">"เพื่อนพนักงานนิรนาม 🤫"</strong> โดยซ่อนชื่อและแผนกอย่างปลอดภัย
                    </p>
                  </div>
                </div>

                {/* Option 2: Show Real Name */}
                <div
                  onClick={() => {
                    setIsAnonymous(false);
                    playSound('select', soundEnabled);
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex items-start gap-3 ${
                    !isAnonymous
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-3xs ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                    !isAnonymous ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    👤
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span>แสดงชื่อจริงบนบอร์ด (Show Real Name)</span>
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        !isAnonymous ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                      }`}>
                        {!isAnonymous && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      ความคิดเห็นของคุณจะเปิดเผยชื่อ <strong className="text-indigo-800 font-black">"{currentEmployee?.name || 'พนักงาน'}" ({currentEmployee?.department || '-'})</strong> บนบอร์ด
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2 relative z-10">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitConfirmModal(false);
                    playSound('click', soundEnabled);
                  }}
                  className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  กลับไปแก้ไข
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={executeFinalSubmit}
                  className="flex-1 py-3 px-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังส่งข้อมูล...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      ยืนยันและส่งแบบประเมิน 🎉
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
