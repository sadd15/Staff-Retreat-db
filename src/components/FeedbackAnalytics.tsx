import React, { useMemo, useState } from 'react';
import { TripFeedback, Employee } from '../types';
import { wipeAllFeedbacksInFirestore, deleteFeedbackInFirestore } from '../lib/firebaseService';
import { toast } from './Toast';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from 'recharts';
import {
  Smile,
  Frown,
  Meh,
  MessageSquare,
  Award,
  Sparkles,
  Beer,
  Music,
  Calendar,
  Coffee,
  Heart,
  ThumbsUp,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart2,
  ListFilter,
  Activity,
  Home,
  Clock,
  ShieldAlert,
  Copy,
  Download,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Shield,
  RefreshCw,
  Search,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Robust clipboard copy with fallback for restricted sandbox frames
const copyToClipboard = (text: string): boolean => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("navigator.clipboard failed, trying fallback", e);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed", err);
    return false;
  }
};

interface FeedbackAnalyticsProps {
  feedbacks: TripFeedback[];
  employees: Employee[];
}

export default function FeedbackAnalytics({ feedbacks = [], employees = [] }: FeedbackAnalyticsProps) {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // States for individual feedback responses
  const [feedbackToDelete, setFeedbackToDelete] = useState<TripFeedback | null>(null);
  const [searchResponseQuery, setSearchResponseQuery] = useState<string>('');

  // Copy structured textual feedback to clipboard
  const handleCopySummary = () => {
    try {
      let text = `=== รายงานสรุปผลประเมินสัมมนา (Trip Evaluation Report) ===\n`;
      text += `ฝ่ายงานที่เลือก: ${selectedDeptFilter === 'ALL' ? 'ทุกฝ่าย/แผนก' : selectedDeptFilter}\n`;
      text += `จำนวนผู้ตอบแบบประเมินทั้งหมดในกลุ่มนี้: ${stats.total} คน\n`;
      text += `คะแนนความพึงพอใจเฉลี่ยแยกตามมิติ:\n`;
      text += `- ภาพรวมความพึงพอใจ: ${stats.avgOverall} / 5.0\n`;
      text += `- ที่พักและห้องนอน: ${stats.avgAccommodation} / 5.0\n`;
      text += `- อาหารและเครื่องดื่มสังสรรค์: ${stats.avgFood} / 5.0\n`;
      text += `- กิจกรรมทริปสัมมนา: ${stats.avgActivities} / 5.0\n`;
      text += `- กำหนดการและเวลา: ${stats.avgSchedule} / 5.0\n`;
      text += `- เวลาพักผ่อนส่วนตัว: ${stats.avgRestTime} / 5.0\n`;
      text += `- การจัดบริการเครื่องดื่ม: ${stats.avgBeverages} / 5.0\n`;
      text += `- บรรยากาศดนตรีและแสงสีปาร์ตี้: ${stats.avgMusic} / 5.0\n\n`;

      text += `=== สิ่งที่พนักงานประทับใจที่สุด (Liked Most) ===\n`;
      if (qualitativeFeedback.liked.length === 0) {
        text += `(ยังไม่มีข้อมูล)\n`;
      } else {
        qualitativeFeedback.liked.forEach((item, idx) => {
          text += `${idx + 1}. "${item.text}" — คุณ ${item.name} (${item.dept})\n`;
        });
      }
      text += `\n`;

      text += `=== ข้อเสนอแนะเพื่อการปรับปรุง (Constructive Suggestions) ===\n`;
      if (qualitativeFeedback.suggest.length === 0) {
        text += `(ยังไม่มีข้อมูล)\n`;
      } else {
        qualitativeFeedback.suggest.forEach((item, idx) => {
          text += `${idx + 1}. "${item.text}" — คุณ ${item.name} (${item.dept})\n`;
        });
      }
      text += `\n`;

      text += `=== คำชื่นชมเพื่อนร่วมงาน (Shoutouts & Kudos) ===\n`;
      if (qualitativeFeedback.shouts.length === 0) {
        text += `(ยังไม่มีข้อมูล)\n`;
      } else {
        qualitativeFeedback.shouts.forEach((item, idx) => {
          text += `${idx + 1}. "${item.text}" — คุณ ${item.name} (${item.dept})\n`;
        });
      }

      const success = copyToClipboard(text);
      if (success) {
        toast.success('คัดลอกข้อมูลสรุปไปยังคลิปบอร์ดเรียบร้อยแล้วครับ! 📋✨');
      } else {
        toast.error('ไม่สามารถคัดลอกข้อมูลสรุปได้');
      }
    } catch (err: any) {
      toast.error(`ไม่สามารถคัดลอกข้อมูลได้: ${err.message}`);
    }
  };

  // Copy individual feedback to clipboard
  const handleCopySingleFeedback = (f: TripFeedback) => {
    try {
      const name = f.isAnonymous ? 'พนักงานนิรนาม' : (f.employeeName || 'ไม่ระบุชื่อ');
      const dept = f.department || 'ไม่ระบุฝ่าย';
      let text = `=== แบบประเมินของ คุณ ${name} (${dept}) ===\n`;
      text += `ภาพรวมความพึงพอใจ: ${f.ratingOverall || 0} / 5\n`;
      text += `ที่พักและห้องนอน: ${f.ratingAccommodation || 0} / 5\n`;
      text += `อาหารและสังสรรค์: ${f.ratingFood || 0} / 5\n`;
      text += `กิจกรรมทริปสัมมนา: ${f.ratingActivities || 0} / 5\n`;
      text += `กำหนดการและเวลา: ${f.ratingSchedule || 5} / 5\n`;
      text += `เวลาพักผ่อนส่วนตัว: ${f.ratingRestTime || 5} / 5\n`;
      text += `บริการเครื่องดื่ม: ${f.ratingBeverages || 5} / 5\n`;
      text += `ดนตรี & ความบันเทิง: ${f.ratingMusic || 5} / 5\n`;
      if (f.likedMost) text += `สิ่งที่ประทับใจที่สุด: "${f.likedMost}"\n`;
      if (f.suggestions) text += `ข้อเสนอแนะเพื่อปรับปรุง: "${f.suggestions}"\n`;
      if (f.shoutout) text += `ชื่นชมเพื่อนร่วมงาน: "${f.shoutout}"\n`;

      const success = copyToClipboard(text);
      if (success) {
        toast.success(`คัดลอกแบบประเมินของ คุณ ${name} เรียบร้อยแล้ว! 📋✨`);
      } else {
        toast.error('ไม่สามารถคัดลอกข้อมูลได้');
      }
    } catch (err: any) {
      toast.error(`เกิดข้อผิดพลาดในการคัดลอก: ${err.message}`);
    }
  };

  // Download individual feedback as text file
  const handleDownloadSingleFeedback = (f: TripFeedback) => {
    try {
      const name = f.isAnonymous ? 'Anonymous' : (f.employeeName || 'Unnamed');
      const dept = f.department || 'No_Dept';
      let text = `=== Trip Evaluation Feedback ===\n`;
      text += `Employee: ${f.isAnonymous ? 'Anonymous' : (f.employeeName || 'Not specified')}\n`;
      text += `Department: ${f.department || 'Not specified'}\n`;
      text += `Submitted At: ${f.submittedAt ? new Date(f.submittedAt).toLocaleString('th-TH') : 'Not specified'}\n\n`;
      text += `Ratings (Out of 5):\n`;
      text += `- Overall: ${f.ratingOverall || 0}\n`;
      text += `- Accommodation: ${f.ratingAccommodation || 0}\n`;
      text += `- Food: ${f.ratingFood || 0}\n`;
      text += `- Activities: ${f.ratingActivities || 0}\n`;
      text += `- Schedule & Time: ${f.ratingSchedule || 5}\n`;
      text += `- Private Rest Time: ${f.ratingRestTime || 5}\n`;
      text += `- Beverages: ${f.ratingBeverages || 5}\n`;
      text += `- Music & Entertainment: ${f.ratingMusic || 5}\n\n`;
      text += `Written Feedback:\n`;
      text += `Liked Most: ${f.likedMost || '-'}\n`;
      text += `Suggestions: ${f.suggestions || '-'}\n`;
      text += `Shoutout to Colleagues: ${f.shoutout || '-'}\n`;

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Feedback_${name}_${dept}_${f.employeeId}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ดาวน์โหลดไฟล์ประเมินรายบุคคลเรียบร้อยแล้วครับ! 📄✨');
    } catch (err: any) {
      toast.error(`เกิดข้อผิดพลาดในการดาวน์โหลด: ${err.message}`);
    }
  };

  // Perform Firestore delete operation for single feedback
  const handleDeleteSingleFeedback = async () => {
    if (!feedbackToDelete) return;
    const empId = feedbackToDelete.employeeId;
    setFeedbackToDelete(null);
    setIsDeleting(true);
    const toastId = toast.loading('กำลังลบข้อมูลแบบประเมินรายบุคคลออกจากระบบ...');
    try {
      await deleteFeedbackInFirestore(empId);
      toast.dismiss(toastId);
      toast.success('ลบแบบสอบถามและความคิดเห็นพนักงานรายบุคคลเรียบร้อยแล้วครับ! 🗑️✨');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`ไม่สามารถลบข้อมูลแบบประเมินได้: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Download raw feedback survey data as CSV (optimized for Excel with UTF-8 BOM)
  const handleDownloadCSV = () => {
    try {
      const headers = [
        'ชื่อพนักงาน/ผู้ประเมิน',
        'ฝ่าย/แผนก',
        'ภาพรวมทริป',
        'ที่พัก/ห้องพัก',
        'อาหาร/สังสรรค์',
        'กิจกรรมทริป',
        'กำหนดการ/เวลา',
        'เวลาพักผ่อนอิสระ',
        'บริการเครื่องดื่ม',
        'ดนตรี/ปาร์ตี้',
        'สิ่งที่ประทับใจที่สุด',
        'ข้อเสนอแนะเพื่อปรับปรุง',
        'คำชื่นชมเพื่อนร่วมงาน',
        'ประเภทแบบสำรวจ',
        'เวลาที่บันทึก'
      ];

      const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

      filteredFeedbacks.forEach(f => {
        const row = [
          f.isAnonymous ? 'พนักงานนิรนาม' : (f.employeeName || 'ไม่ระบุ'),
          f.department || 'ไม่ระบุ',
          f.ratingOverall || 0,
          f.ratingAccommodation || 0,
          f.ratingFood || 0,
          f.ratingActivities || 0,
          f.ratingSchedule || 5,
          f.ratingRestTime || 5,
          f.ratingBeverages || 5,
          f.ratingMusic || 5,
          f.likedMost ? f.likedMost.trim() : '',
          f.suggestions ? f.suggestions.trim() : '',
          f.shoutout ? f.shoutout.trim() : '',
          f.isAnonymous ? 'นิรนาม (Anonymous)' : 'เปิดเผยชื่อ',
          f.createdAt ? new Date(f.createdAt).toLocaleString('th-TH') : ''
        ];
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      });

      // Thai CSV encoding needs BOM (\uFEFF) so Excel parses it as UTF-8 correctly
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Trip_Evaluation_Report_${selectedDeptFilter === 'ALL' ? 'All_Depts' : selectedDeptFilter}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ดาวน์โหลดไฟล์รายงาน CSV เรียบร้อยแล้วครับ! 📊✨');
    } catch (err: any) {
      toast.error(`เกิดข้อผิดพลาดในการดาวน์โหลด: ${err.message}`);
    }
  };

  // Perform Firestore wipe operation for feedbacks
  const handleWipeFeedbacks = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    const toastId = toast.loading('กำลังลบข้อมูลแบบสำรวจความพึงพอใจทั้งหมดออกจากระบบ...');
    try {
      await wipeAllFeedbacksInFirestore();
      toast.dismiss(toastId);
      toast.success('ล้างข้อมูลแบบสอบถามและความคิดเห็นพนักงานทั้งหมดเรียบร้อยแล้วครับ! 🗑️✨');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`ไม่สามารถลบข้อมูลแบบสอบถามได้: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Available departments from feedbacks for filter dropdown
  const departments = useMemo(() => {
    const depts = new Set<string>();
    feedbacks.forEach(f => {
      if (f.department) depts.add(f.department);
    });
    return ['ALL', ...Array.from(depts)];
  }, [feedbacks]);

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    if (selectedDeptFilter === 'ALL') return feedbacks;
    return feedbacks.filter(f => f.department === selectedDeptFilter);
  }, [feedbacks, selectedDeptFilter]);

  // Filtered feedbacks for individual table search
  const searchedFeedbacks = useMemo(() => {
    return filteredFeedbacks.filter(f => {
      const name = f.isAnonymous ? 'พนักงานนิรนาม' : (f.employeeName || '');
      const dept = f.department || '';
      const liked = f.likedMost || '';
      const suggest = f.suggestions || '';
      const shout = f.shoutout || '';
      const query = searchResponseQuery.trim().toLowerCase();
      
      if (!query) return true;
      return name.toLowerCase().includes(query) ||
             dept.toLowerCase().includes(query) ||
             liked.toLowerCase().includes(query) ||
             suggest.toLowerCase().includes(query) ||
             shout.toLowerCase().includes(query);
    });
  }, [filteredFeedbacks, searchResponseQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredFeedbacks.length;
    if (total === 0) {
      return {
        total,
        avgOverall: 0,
        avgAccommodation: 0,
        avgFood: 0,
        avgActivities: 0,
        avgSchedule: 0,
        avgRestTime: 0,
        avgBeverages: 0,
        avgMusic: 0,
        npsScore: 0,
        promotersCount: 0,
        passivesCount: 0,
        detractorsCount: 0
      };
    }

    let sumOverall = 0;
    let sumAccommodation = 0;
    let sumFood = 0;
    let sumActivities = 0;
    let sumSchedule = 0;
    let sumRestTime = 0;
    let sumBeverages = 0;
    let sumMusic = 0;

    let promoters = 0;  // 5 stars
    let passives = 0;   // 4 stars
    let detractors = 0; // 1-3 stars

    filteredFeedbacks.forEach(f => {
      sumOverall += f.ratingOverall || 0;
      sumAccommodation += f.ratingAccommodation || 0;
      sumFood += f.ratingFood || 0;
      sumActivities += f.ratingActivities || 0;
      sumSchedule += f.ratingSchedule || 5;
      sumRestTime += f.ratingRestTime || 5;
      sumBeverages += f.ratingBeverages || 5;
      sumMusic += f.ratingMusic || 5;

      const rate = f.ratingOverall || 0;
      if (rate === 5) {
        promoters++;
      } else if (rate === 4) {
        passives++;
      } else {
        detractors++;
      }
    });

    const nps = Math.round(((promoters - detractors) / total) * 100);

    return {
      total,
      avgOverall: Number((sumOverall / total).toFixed(2)),
      avgAccommodation: Number((sumAccommodation / total).toFixed(2)),
      avgFood: Number((sumFood / total).toFixed(2)),
      avgActivities: Number((sumActivities / total).toFixed(2)),
      avgSchedule: Number((sumSchedule / total).toFixed(2)),
      avgRestTime: Number((sumRestTime / total).toFixed(2)),
      avgBeverages: Number((sumBeverages / total).toFixed(2)),
      avgMusic: Number((sumMusic / total).toFixed(2)),
      npsScore: nps,
      promotersCount: promoters,
      passivesCount: passives,
      detractorsCount: detractors
    };
  }, [filteredFeedbacks]);

  // Data for Category Average Bar Chart
  const categoryChartData = useMemo(() => {
    return [
      { name: 'ภาพรวมทริป', score: stats.avgOverall, color: '#6366f1', icon: Sparkles },
      { name: 'ที่พัก/ห้องนอน', score: stats.avgAccommodation, color: '#3b82f6', icon: Home },
      { name: 'อาหาร/สังสรรค์', score: stats.avgFood, color: '#10b981', icon: Coffee },
      { name: 'กิจกรรมทริป', score: stats.avgActivities, color: '#f59e0b', icon: Activity },
      { name: 'กำหนดการ/เวลา', score: stats.avgSchedule, color: '#f97316', icon: Calendar },
      { name: 'เวลาพักผ่อนอิสระ', score: stats.avgRestTime, color: '#14b8a6', icon: Clock },
      { name: 'เครื่องดื่มจัดเต็ม', score: stats.avgBeverages, color: '#d946ef', icon: Beer },
      { name: 'ดนตรี/ความบันเทิง', score: stats.avgMusic, color: '#ec4899', icon: Music },
    ];
  }, [stats]);

  // Data for Beverages & Music detailed distribution chart
  const distributionChartData = useMemo(() => {
    const beveragesDist = [0, 0, 0, 0, 0]; // 1 to 5 stars
    const musicDist = [0, 0, 0, 0, 0];

    filteredFeedbacks.forEach(f => {
      const bRate = f.ratingBeverages || 5;
      const mRate = f.ratingMusic || 5;
      if (bRate >= 1 && bRate <= 5) beveragesDist[bRate - 1]++;
      if (mRate >= 1 && mRate <= 5) musicDist[mRate - 1]++;
    });

    return [
      { stars: '5 ดาว (ดีเยี่ยม)', Beverages: beveragesDist[4], Music: musicDist[4] },
      { stars: '4 ดาว (ดีมาก)', Beverages: beveragesDist[3], Music: musicDist[3] },
      { stars: '3 ดาว (ปานกลาง)', Beverages: beveragesDist[2], Music: musicDist[2] },
      { stars: '2 ดาว (ควรปรับปรุง)', Beverages: beveragesDist[1], Music: musicDist[1] },
      { stars: '1 ดาว (ต้องปรับปรุงด่วน)', Beverages: beveragesDist[0], Music: musicDist[0] },
    ];
  }, [filteredFeedbacks]);

  // Data for Department Breakdown comparison
  const departmentChartData = useMemo(() => {
    const deptMap: { [key: string]: { count: number; sumOverall: number; sumBeverages: number; sumMusic: number } } = {};
    
    feedbacks.forEach(f => {
      const dept = f.department || 'ไม่ระบุฝ่าย';
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, sumOverall: 0, sumBeverages: 0, sumMusic: 0 };
      }
      deptMap[dept].count++;
      deptMap[dept].sumOverall += f.ratingOverall || 0;
      deptMap[dept].sumBeverages += f.ratingBeverages || 5;
      deptMap[dept].sumMusic += f.ratingMusic || 5;
    });

    return Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      'ความพึงพอใจโดยรวม': Number((data.sumOverall / data.count).toFixed(2)),
      'บริการเครื่องดื่ม': Number((data.sumBeverages / data.count).toFixed(2)),
      'ดนตรี & ปาร์ตี้': Number((data.sumMusic / data.count).toFixed(2)),
      count: data.count
    })).sort((a, b) => b['ความพึงพอใจโดยรวม'] - a['ความพึงพอใจโดยรวม']);
  }, [feedbacks]);

  // Data for Overall Rating Distribution (Pie Chart)
  const pieChartData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0=1 star, 4=5 stars
    filteredFeedbacks.forEach(f => {
      const r = f.ratingOverall || 0;
      if (r >= 1 && r <= 5) counts[r - 1]++;
    });

    return [
      { name: '5 ดาว (ดีเยี่ยมที่สุด)', value: counts[4], color: '#10b981' },
      { name: '4 ดาว (พอใจมาก)', value: counts[3], color: '#6366f1' },
      { name: '3 ดาว (ปานกลาง)', value: counts[2], color: '#f59e0b' },
      { name: '2 ดาว (เฉยๆ/ไม่ประทับใจ)', value: counts[1], color: '#f97316' },
      { name: '1 ดาว (ไม่ผ่าน)', value: counts[0], color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [filteredFeedbacks]);

  // Extract text feedback items
  const qualitativeFeedback = useMemo(() => {
    const liked: { text: string; name: string; dept: string }[] = [];
    const suggest: { text: string; name: string; dept: string }[] = [];
    const shouts: { text: string; name: string; dept: string }[] = [];

    filteredFeedbacks.forEach(f => {
      const name = f.isAnonymous ? 'พนักงานนิรนาม' : (f.employeeName || 'ไม่ระบุชื่อ');
      const dept = f.department || 'ไม่ระบุฝ่าย';
      if (f.likedMost && f.likedMost.trim()) {
        liked.push({ text: f.likedMost, name, dept });
      }
      if (f.suggestions && f.suggestions.trim()) {
        suggest.push({ text: f.suggestions, name, dept });
      }
      if (f.shoutout && f.shoutout.trim()) {
        shouts.push({ text: f.shoutout, name, dept });
      }
    });

    return { liked, suggest, shouts };
  }, [filteredFeedbacks]);

  if (feedbacks.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-3xs max-w-4xl mx-auto my-6">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Smile className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 font-display">ยังไม่มีข้อมูลแบบประเมินความพึงพอใจ</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          เมื่อพนักงานลงทะเบียนและทำแบบสำรวจความเห็นเรียบร้อยแล้ว กราฟสถิติสรุปผลและการกระจายคะแนนจะเปิดแสดงในส่วนนี้โดยอัตโนมัติ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Filters and Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            รายงานสรุปผลประเมินสัมมนา (Trip Evaluation Reports)
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">
            อัปเดตแบบเรียลไทม์จากฐานข้อมูล Firestore • สรุปผลจากแบบสำรวจพนักงาน
          </p>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <ListFilter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-extrabold">กรองตามฝ่าย:</span>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-100 font-black text-slate-700 outline-none cursor-pointer"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'ALL' ? 'แสดงทุกแผนก/ฝ่าย' : `${dept}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admin Actions Toolbar (Copy, Download CSV, and Clear database feedbacks) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 border border-indigo-100/60 p-4 rounded-3xl" id="admin-feedback-actions-toolbar">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
          <div>
            <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider leading-none">เครื่องมือแอดมิน (Admin Feedback Tools)</h4>
            <p className="text-[9px] text-indigo-500 font-bold mt-1 leading-none">สำรองผลการประเมิน หรือทำการล้างสถิติผลตอบรับเพื่อเริ่มใหม่</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Summary */}
          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 hover:text-indigo-800 border border-indigo-200 rounded-xl text-[10px] font-extrabold transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="คัดลอกรายงานสรุปผลประเมินพนักงานเป็นรูปแบบข้อความ"
          >
            <Copy className="w-3 h-3 text-indigo-500" />
            คัดลอกสรุป 📋
          </button>

          {/* Download CSV */}
          <button
            onClick={handleDownloadCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ดาวน์โหลดไฟล์ข้อมูลดิบแบบละเอียดสำหรับ Google Sheets / Excel"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-100" />
            ดาวน์โหลด Excel (CSV) 📊
          </button>

          {/* Wipe Feedbacks */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer active:scale-95 sm:ml-2"
            title="ลบผลการประเมินและแบบสำรวจของพนักงานทุกคนออกจากฐานข้อมูลอย่างถาวร"
          >
            <Trash2 className="w-3 h-3 text-rose-100" />
            ล้างแบบประเมินทั้งหมด 🗑️
          </button>
        </div>
      </div>

      {/* Key Metric Scorecards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ผู้ตอบประเมิน</span>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800 tracking-tight font-display">{stats.total}</span>
            <span className="text-xs text-slate-400 font-semibold">คน</span>
          </div>
          <p className="text-[9px] text-indigo-500 mt-1.5 font-bold">
            คิดเป็น {Math.round((stats.total / (employees.filter(e => e.rsvpStatus === 'ไป').length || 1)) * 100)}% ของผู้ร่วมทริป
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความพึงพอใจเฉลี่ย</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-600 tracking-tight font-display">{stats.avgOverall}</span>
            <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Smile
                key={i}
                className={`w-3 h-3 ${
                  i < Math.round(stats.avgOverall) ? 'text-indigo-600 fill-indigo-600' : 'text-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">อาหาร & เครื่องดื่ม</span>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-teal-600 tracking-tight font-display">
              {Number(((stats.avgFood + stats.avgBeverages) / 2).toFixed(2))}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-semibold">
            เครื่องดื่ม: <span className="font-bold text-slate-700">{stats.avgBeverages}</span> • อาหาร: <span className="font-bold text-slate-700">{stats.avgFood}</span>
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ดนตรี & สันทนาการ</span>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-fuchsia-600 tracking-tight font-display">{stats.avgMusic}</span>
            <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-semibold">
            บรรยากาศเวที แสงสี และความครึกครื้น
          </p>
        </div>
      </div>

      {/* Main Charts Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Chart Card 1: Category Averages (Bar Chart) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs lg:col-span-8 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              สรุปคะแนนเฉลี่ยจำแนกตามรายหัวข้อ (Core Category Scores)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              เปรียบเทียบระดับคะแนนเฉลี่ย (เต็ม 5 ดาว) ในหัวข้อที่พัก อาหาร กิจกรรม เวลาพักผ่อน เครื่องดื่ม และดนตรีปาร์ตี้
            </p>
          </div>
          
          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 5]} 
                  tickCount={6}
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-[11px] font-sans">
                          <p className="font-extrabold text-slate-700">{data.name}</p>
                          <p className="mt-1 font-bold text-indigo-600">คะแนนเฉลี่ย: {data.score} / 5.0</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Card 2: Overall Breakdown (Pie Chart) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs lg:col-span-4 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
              <PieChartIcon className="w-4 h-4 text-emerald-500" />
              การกระจายคะแนนภาพรวม (Overall Distribution)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              ระดับความพึงพอใจในทริปนี้โดยรวมในรูปสัดส่วนวงกลม
            </p>
          </div>

          <div className="relative h-44 my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 text-[10px] font-sans font-bold text-slate-700">
                          {data.name}: <span className="text-indigo-600">{data.value} คน</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-800 font-display leading-none">{stats.avgOverall}</span>
              <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">เต็ม 5 ดาว</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {pieChartData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span>{entry.name}</span>
                </div>
                <span className="font-mono text-slate-700">{entry.value} คน ({Math.round((entry.value / stats.total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Card 3: Beverages & Music rating distribution (Stacked Column / Comparison Chart) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs lg:col-span-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
              <Beer className="w-4 h-4 text-fuchsia-500" />
              ดนตรี VS เครื่องดื่ม (Party & Beverages Comparison)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              จำนวนคนโหวตให้คะแนนในแต่ละระดับดาว (1 - 5 ดาว) เปรียบเทียบระหว่างสวัสดิการเครื่องดื่ม และดนตรี/คาราโอเกะ
            </p>
          </div>

          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distributionChartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="stars" 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-[11px] font-sans space-y-1">
                          <p className="font-extrabold text-slate-700">{payload[0].payload.stars}</p>
                          <p className="text-fuchsia-600 font-bold">🍹 สวัสดิการเครื่องดื่ม: {payload[0].value} คน</p>
                          <p className="text-pink-600 font-bold">🎸 ดนตรี & ปาร์ตี้: {payload[1].value} คน</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', fontWeight: 700, fontFamily: 'sans-serif' }}
                />
                <Bar dataKey="Beverages" name="🍹 สวัสดิการเครื่องดื่ม" fill="#d946ef" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Music" name="🎸 ดนตรี & ปาร์ตี้" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Card 4: Radar comparison across categories for the department filter */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs lg:col-span-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-500" />
              ใยแมงมุมสมดุลทริป (Trip Balance Radar)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              วิเคราะห์สมดุลทั้ง 8 มิติของงานสัมมนา เพื่อหาจุดแข็งและจุดควรพัฒนาร่วมกัน
            </p>
          </div>

          <div className="h-64 mt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryChartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 8 }} />
                <Radar 
                  name="คะแนนเฉลี่ย" 
                  dataKey="score" 
                  stroke="#4f46e5" 
                  fill="#4f46e5" 
                  fillOpacity={0.15} 
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Chart Card 5: Compare satisfaction by Department */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs">
        <div>
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
            <ThumbsUp className="w-4 h-4 text-indigo-500" />
            การประเมินแยกตามแผนกฝ่าย (Feedback Breakdown by Department)
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
            ตารางและกราฟเปรียบเทียบคะแนนเฉลี่ยตามฝ่าย เพื่อวิเคราะห์ความแตกต่างของความพึงพอใจในพนักงานแต่ละกลุ่ม
          </p>
        </div>

        <div className="h-64 mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentChartData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="department" 
                tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 5]} 
                tickCount={6}
                tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-[11px] font-sans space-y-1">
                        <p className="font-extrabold text-slate-700">{data.department} ({data.count} คนตอบ)</p>
                        <p className="text-indigo-600 font-bold">✨ ภาพรวม: {data['ความพึงพอใจโดยรวม']} / 5.0</p>
                        <p className="text-fuchsia-600 font-bold">🍹 เครื่องดื่ม: {data['บริการเครื่องดื่ม']} / 5.0</p>
                        <p className="text-pink-600 font-bold">🎸 ดนตรี & คอนเสิร์ต: {data['ดนตรี & ปาร์ตี้']} / 5.0</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                height={32}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', fontWeight: 700, fontFamily: 'sans-serif' }}
              />
              <Bar dataKey="ความพึงพอใจโดยรวม" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="บริการเครื่องดื่ม" fill="#d946ef" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ดนตรี & ปาร์ตี้" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Qualitative Open-Ended Feedback Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Section 1: Liked Most */}
        <div className="bg-emerald-50/30 border border-emerald-100 rounded-3xl p-5 flex flex-col h-[350px]">
          <div className="pb-3 border-b border-emerald-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Heart className="w-4 h-4 fill-emerald-600 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-900 font-display uppercase tracking-wide">สิ่งที่ประทับใจที่สุด 💖</h4>
              <p className="text-[9px] text-emerald-600 font-bold font-sans">Liked Most By Staff</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-emerald-200">
            {qualitativeFeedback.liked.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center mt-12 font-semibold">ยังไม่มีข้อความส่งเข้ามา</p>
            ) : (
              qualitativeFeedback.liked.map((item, idx) => (
                <div key={idx} className="bg-white/80 p-3 rounded-2xl border border-emerald-100/50 space-y-1 shadow-3xs">
                  <p className="text-[11px] text-slate-700 leading-normal font-medium">“ {item.text} ”</p>
                  <p className="text-[9px] text-emerald-700 font-bold text-right">
                    — คุณ {item.name} ({item.dept})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Suggestions */}
        <div className="bg-amber-50/20 border border-amber-200/60 rounded-3xl p-5 flex flex-col h-[350px]">
          <div className="pb-3 border-b border-amber-200/60 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-950 font-display uppercase tracking-wide">ข้อเสนอแนะเพื่อปรับปรุง 📝</h4>
              <p className="text-[9px] text-amber-600 font-bold font-sans">Constructive Suggestions</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-amber-200">
            {qualitativeFeedback.suggest.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center mt-12 font-semibold">ยังไม่มีข้อความส่งเข้ามา</p>
            ) : (
              qualitativeFeedback.suggest.map((item, idx) => (
                <div key={idx} className="bg-white/80 p-3 rounded-2xl border border-amber-200/40 space-y-1 shadow-3xs">
                  <p className="text-[11px] text-slate-700 leading-normal font-medium">“ {item.text} ”</p>
                  <p className="text-[9px] text-amber-800 font-bold text-right">
                    — คุณ {item.name} ({item.dept})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 3: Shoutouts */}
        <div className="bg-fuchsia-50/30 border border-fuchsia-100 rounded-3xl p-5 flex flex-col h-[350px]">
          <div className="pb-3 border-b border-fuchsia-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4 text-fuchsia-600" />
            </div>
            <div>
              <h4 className="text-xs font-black text-fuchsia-900 font-display uppercase tracking-wide">ชื่นชมเพื่อนร่วมงาน 🏆</h4>
              <p className="text-[9px] text-fuchsia-600 font-bold font-sans">Shoutouts & Kudos</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-fuchsia-200">
            {qualitativeFeedback.shouts.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center mt-12 font-semibold">ยังไม่มีข้อความส่งเข้ามา</p>
            ) : (
              qualitativeFeedback.shouts.map((item, idx) => (
                <div key={idx} className="bg-white/80 p-3 rounded-2xl border border-fuchsia-100/50 space-y-1 shadow-3xs">
                  <p className="text-[11px] text-slate-700 leading-normal font-medium">“ {item.text} ”</p>
                  <p className="text-[9px] text-fuchsia-700 font-bold text-right">
                    — คุณ {item.name} ({item.dept})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* SECTION: Individual Feedback Responses & Specific Operations */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-4" id="individual-responses-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-500" />
              ข้อมูลแบบประเมินรายบุคคล ({searchedFeedbacks.length} รายการ)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              แสดงรายละเอียดการตอบแบบประเมินของแต่ละคน สามารถคัดลอก ดาวน์โหลด หรือลบข้อมูลเฉพาะคนได้ที่นี่
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchResponseQuery}
              onChange={(e) => setSearchResponseQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, แผนก หรือข้อความความเห็น..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
            />
            {searchResponseQuery && (
              <button
                onClick={() => setSearchResponseQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {searchedFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            ไม่พบข้อมูลแบบประเมินที่ตรงกับคำค้นหาของคุณ
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
            {searchedFeedbacks.map((f) => {
              const name = f.isAnonymous ? 'พนักงานนิรนาม' : (f.employeeName || 'ไม่ระบุชื่อ');
              const dept = f.department || 'ไม่ระบุฝ่าย';
              return (
                <div key={f.employeeId} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 space-y-3 relative hover:bg-slate-50 transition-all group">
                  {/* Action controls */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleCopySingleFeedback(f)}
                      className="p-1.5 bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-lg border border-slate-200/50 hover:border-indigo-100 shadow-3xs transition-all cursor-pointer"
                      title="คัดลอกแบบประเมินนี้"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownloadSingleFeedback(f)}
                      className="p-1.5 bg-white hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg border border-slate-200/50 hover:border-emerald-100 shadow-3xs transition-all cursor-pointer"
                      title="ดาวน์โหลดเป็นไฟล์ข้อความ"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setFeedbackToDelete(f)}
                      className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-lg border border-slate-200/50 hover:border-rose-100 shadow-3xs transition-all cursor-pointer"
                      title="ลบแบบประเมินนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Profile info */}
                  <div className="flex items-start gap-2.5 pr-24">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-xs">
                      {f.isAnonymous ? '👤' : (f.employeeName ? f.employeeName.charAt(0) : 'U')}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-tight">
                        คุณ {name}
                        {f.isAnonymous && <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-[8px] text-slate-500 rounded font-bold">นิรนาม</span>}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">ฝ่าย: {dept}</p>
                    </div>
                  </div>

                  {/* Ratings summary */}
                  <div className="bg-white p-3 rounded-xl border border-slate-100 grid grid-cols-4 gap-2 text-center shadow-3xs">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">ภาพรวม</p>
                      <p className="text-xs font-black text-indigo-600 mt-0.5">{f.ratingOverall || 0} ⭐</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">ที่พัก</p>
                      <p className="text-xs font-black text-blue-600 mt-0.5">{f.ratingAccommodation || 0} ⭐</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">อาหาร</p>
                      <p className="text-xs font-black text-emerald-600 mt-0.5">{f.ratingFood || 0} ⭐</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">กิจกรรม</p>
                      <p className="text-xs font-black text-amber-600 mt-0.5">{f.ratingActivities || 0} ⭐</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">เวลาจัด</p>
                      <p className="text-xs font-black text-orange-600 mt-0.5">{f.ratingSchedule || 5} ⭐</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">พักผ่อน</p>
                      <p className="text-xs font-black text-teal-600 mt-0.5">{f.ratingRestTime || 5} ⭐</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">เครื่องดื่ม</p>
                      <p className="text-xs font-black text-fuchsia-600 mt-0.5">{f.ratingBeverages || 5} ⭐</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">ดนตรี</p>
                      <p className="text-xs font-black text-pink-600 mt-0.5">{f.ratingMusic || 5} ⭐</p>
                    </div>
                  </div>

                  {/* Written feedbacks */}
                  <div className="space-y-1.5 text-[10px] font-sans leading-relaxed">
                    {f.likedMost && (
                      <p className="text-slate-600">
                        <strong className="text-emerald-700 font-bold">💖 ประทับใจ:</strong> “{f.likedMost}”
                      </p>
                    )}
                    {f.suggestions && (
                      <p className="text-slate-600">
                        <strong className="text-amber-700 font-bold">📝 เสนอแนะ:</strong> “{f.suggestions}”
                      </p>
                    )}
                    {f.shoutout && (
                      <p className="text-slate-600">
                        <strong className="text-fuchsia-700 font-bold">🏆 ชื่นชม:</strong> “{f.shoutout}”
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deleting Single Feedback */}
      <AnimatePresence>
        {feedbackToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFeedbackToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] border border-rose-100 shadow-2xl max-w-sm w-full p-6 space-y-6 relative z-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-60" />

              <div className="text-center space-y-3 relative">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600 shadow-inner">
                  <AlertTriangle className="w-8 h-8 text-rose-600 animate-bounce" />
                </div>
                <h3 className="text-lg font-display font-black text-slate-800 leading-tight">
                  ยืนยันลบแบบประเมินรายคน?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed px-2 font-medium">
                  คุณแน่ใจหรือไม่ว่าต้องการลบแบบประเมินของ คุณ <span className="font-bold text-rose-600">{feedbackToDelete.isAnonymous ? 'พนักงานนิรนาม' : feedbackToDelete.employeeName}</span> อย่างถาวร?
                  <br />
                  <span className="text-[10px] text-rose-400 font-bold block mt-2">⚠️ การดำเนินการนี้จะลบข้อมูลออกจากฐานข้อมูล Firestore ของแผนงานนี้</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFeedbackToDelete(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSingleFeedback}
                  className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ใช่, ยืนยันลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Wiping Feedbacks */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[32px] border border-rose-100 shadow-2xl max-w-sm w-full p-6 space-y-6 relative z-10 overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-60" />

              <div className="text-center space-y-3 relative">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600 shadow-inner">
                  <AlertTriangle className="w-8 h-8 text-rose-600 animate-bounce" />
                </div>
                <h3 className="text-lg font-display font-black text-slate-800 leading-tight">
                  ยืนยันลบแบบประเมินทั้งหมด?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed px-2 font-medium">
                  คุณแน่ใจหรือไม่ว่าต้องการ <span className="font-bold text-rose-600">ลบคำตอบแบบสำรวจ ข้อคิดเห็น และสถิติดาวของพนักงานทุกคน</span> ออกจากระบบฐานข้อมูล Firestore อย่างถาวร?
                  <br />
                  <span className="text-[10px] text-rose-400 font-bold block mt-2">⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับหรือกู้ข้อมูลได้!</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleWipeFeedbacks}
                  className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ใช่, ยืนยันการลบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Overlay while deleting */}
      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-[210]">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs">
            <RefreshCw className="w-8 h-8 animate-spin text-rose-600" />
            <div>
              <h4 className="text-sm font-black text-slate-800">กำลังลบข้อมูลประเมินทั้งหมด...</h4>
              <p className="text-[11px] text-slate-400 mt-1">โปรดรอสักครู่ ระบบกำลังสื่อสารกับฐานข้อมูลระบบคลาวด์เพื่อทำการกวาดล้างข้อมูลดิบแบบสำรวจ</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
