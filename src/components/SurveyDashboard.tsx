import React, { useMemo, useState } from 'react';
import { TripFeedback, Employee } from '../types';
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
  Area,
  LineChart,
  Line
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
  Flame,
  Lightbulb,
  CheckCircle2,
  Users,
  Target,
  ArrowUpRight,
  TrendingDown,
  Search,
  UserCheck,
  UserX,
  Copy,
  Check,
  Shield,
  User,
  AlertCircle,
  X
} from 'lucide-react';
import { motion } from 'motion/react';

interface SurveyDashboardProps {
  feedbacks: TripFeedback[];
  employees: Employee[];
}

export default function SurveyDashboard({ feedbacks = [], employees = [] }: SurveyDashboardProps) {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [activeSpotlightTab, setActiveSpotlightTab] = useState<'all' | 'beverage' | 'music' | 'correlation'>('all');

  // State for Employee Survey Completion Tracker
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DONE' | 'PENDING'>('ALL');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  const [copiedUnsubmitted, setCopiedUnsubmitted] = useState<boolean>(false);

  // Available departments from employees & feedbacks for filter dropdown
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => { if (e.department) depts.add(e.department); });
    feedbacks.forEach(f => { if (f.department) depts.add(f.department); });
    return ['ALL', ...Array.from(depts)];
  }, [employees, feedbacks]);

  // Map employee list with survey completion status
  const employeeSurveyList = useMemo(() => {
    return employees.map(emp => {
      const feedback = feedbacks.find(f => f.employeeId === emp.id);
      let submittedDateObj: Date | null = null;
      if (feedback?.submittedAt) {
        if (typeof feedback.submittedAt === 'string') {
          submittedDateObj = new Date(feedback.submittedAt);
        } else if (typeof feedback.submittedAt?.toDate === 'function') {
          submittedDateObj = feedback.submittedAt.toDate();
        } else {
          submittedDateObj = new Date(feedback.submittedAt);
        }
      }

      return {
        ...emp,
        hasSubmitted: !!feedback,
        feedbackData: feedback || null,
        submittedAt: submittedDateObj,
        isAnonymous: feedback ? feedback.isAnonymous : undefined,
      };
    });
  }, [employees, feedbacks]);

  const totalEmployeesCount = employeeSurveyList.length;
  const submittedCount = useMemo(() => employeeSurveyList.filter(e => e.hasSubmitted).length, [employeeSurveyList]);
  const pendingCount = totalEmployeesCount - submittedCount;
  const completionPercentage = totalEmployeesCount > 0 ? Math.round((submittedCount / totalEmployeesCount) * 100) : 0;

  // Filter employee survey list for table
  const filteredEmployeeSurveyList = useMemo(() => {
    return employeeSurveyList.filter(item => {
      if (selectedDeptFilter !== 'ALL' && item.department !== selectedDeptFilter) {
        return false;
      }
      if (statusFilter === 'DONE' && !item.hasSubmitted) return false;
      if (statusFilter === 'PENDING' && item.hasSubmitted) return false;
      if (employeeSearchQuery.trim()) {
        const q = employeeSearchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchDept = (item.department || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDept) return false;
      }
      return true;
    });
  }, [employeeSurveyList, selectedDeptFilter, statusFilter, employeeSearchQuery]);

  const handleCopyUnsubmittedList = () => {
    const pendingEmployees = employeeSurveyList.filter(e => !e.hasSubmitted);
    if (pendingEmployees.length === 0) return;

    const textLines = [
      `📢 รายชื่อพนักงานที่ยังไม่ได้ทำแบบสอบถามประเมินทริป (${pendingEmployees.length} ท่าน):`,
      ...pendingEmployees.map((e, idx) => `${idx + 1}. ${e.name} (${e.department || '-'}) [ID: ${e.id}]`),
      `\nกรุณาเข้าทำแบบสอบถามได้เลยครับ ✨`
    ].join('\n');

    navigator.clipboard.writeText(textLines);
    setCopiedUnsubmitted(true);
    setTimeout(() => setCopiedUnsubmitted(false), 3000);
  };

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    if (selectedDeptFilter === 'ALL') return feedbacks;
    return feedbacks.filter(f => f.department === selectedDeptFilter);
  }, [feedbacks, selectedDeptFilter]);

  // Calculate stats
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
        promoterPercent: 0,
        detractorPercent: 0,
        nps: 0
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
      if (rate === 5) promoters++;
      else if (rate <= 3) detractors++;
    });

    const promoterPercent = Math.round((promoters / total) * 100);
    const detractorPercent = Math.round((detractors / total) * 100);

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
      promoterPercent,
      detractorPercent,
      nps: promoterPercent - detractorPercent
    };
  }, [filteredFeedbacks]);

  // 1. Core Categories Scores
  const categoryChartData = useMemo(() => {
    return [
      { name: 'ภาพรวมทริป', score: stats.avgOverall, color: '#4f46e5', icon: Sparkles },
      { name: 'บริการเครื่องดื่ม', score: stats.avgBeverages, color: '#d946ef', icon: Beer },
      { name: 'ดนตรี & ปาร์ตี้', score: stats.avgMusic, color: '#ec4899', icon: Music },
      { name: 'อาหาร/สังสรรค์', score: stats.avgFood, color: '#10b981', icon: Coffee },
      { name: 'ที่พัก/ห้องนอน', score: stats.avgAccommodation, color: '#3b82f6', icon: Home },
      { name: 'กิจกรรมทริป', score: stats.avgActivities, color: '#f59e0b', icon: Activity },
      { name: 'กำหนดการ/เวลา', score: stats.avgSchedule, color: '#f97316', icon: Calendar },
      { name: 'เวลาพักผ่อนอิสระ', score: stats.avgRestTime, color: '#14b8a6', icon: Clock },
    ];
  }, [stats]);

  // 2. Beverage vs Music Rating Distribution Details
  const beverageMusicDistribution = useMemo(() => {
    const bDist = [0, 0, 0, 0, 0]; // 1-5 stars
    const mDist = [0, 0, 0, 0, 0];

    filteredFeedbacks.forEach(f => {
      const bRate = f.ratingBeverages || 5;
      const mRate = f.ratingMusic || 5;
      if (bRate >= 1 && bRate <= 5) bDist[bRate - 1]++;
      if (mRate >= 1 && mRate <= 5) mDist[mRate - 1]++;
    });

    return [
      { rating: '5 ดาว (ดีเยี่ยมที่สุด)', Beverages: bDist[4], Music: mDist[4] },
      { rating: '4 ดาว (ดีมาก)', Beverages: bDist[3], Music: mDist[3] },
      { rating: '3 ดาว (ปานกลาง)', Beverages: bDist[2], Music: mDist[2] },
      { rating: '2 ดาว (ควรปรับปรุง)', Beverages: bDist[1], Music: mDist[1] },
      { rating: '1 ดาว (ต้องปรับปรุงด่วน)', Beverages: bDist[0], Music: mDist[0] },
    ];
  }, [filteredFeedbacks]);

  // 3. Overall Rating Pie chart
  const overallPieData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    filteredFeedbacks.forEach(f => {
      const r = f.ratingOverall || 0;
      if (r >= 1 && r <= 5) counts[r - 1]++;
    });

    return [
      { name: '5 ดาว (ดีเยี่ยม)', value: counts[4], color: '#10b981' },
      { name: '4 ดาว (ดี)', value: counts[3], color: '#6366f1' },
      { name: '3 ดาว (พอใช้)', value: counts[2], color: '#f59e0b' },
      { name: '2 ดาว (ไม่พอใจ)', value: counts[1], color: '#f97316' },
      { name: '1 ดาว (ปรับปรุงด่วน)', value: counts[0], color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [filteredFeedbacks]);

  // 4. Department Comparison for Beverages & Music
  const deptComparisonData = useMemo(() => {
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
      'ภาพรวมทริป': Number((data.sumOverall / data.count).toFixed(2)),
      'บริการเครื่องดื่ม': Number((data.sumBeverages / data.count).toFixed(2)),
      'ดนตรี & แสงสี': Number((data.sumMusic / data.count).toFixed(2)),
      count: data.count
    })).sort((a, b) => b['ภาพรวมทริป'] - a['ภาพรวมทริป']);
  }, [feedbacks]);

  // 5. Correlation Trend Chart data
  const correlationData = useMemo(() => {
    // Sort feedbacks by overall rating to show correlation trends
    const sorted = [...filteredFeedbacks].sort((a,b) => a.ratingOverall - b.ratingOverall);
    return sorted.map((f, index) => ({
      index: index + 1,
      'ความพึงพอใจภาพรวม': f.ratingOverall,
      'สวัสดิการเครื่องดื่ม': f.ratingBeverages || 5,
      'ดนตรี & แสงสีปาร์ตี้': f.ratingMusic || 5,
      name: f.isAnonymous ? 'นิรนาม' : (f.employeeName || 'ไม่ระบุ')
    }));
  }, [filteredFeedbacks]);

  // 6. Natural Language Mining for Drinks/Music Comments
  const keywordHighlights = useMemo(() => {
    const drinkMentions: { text: string; name: string; dept: string; rating: number }[] = [];
    const musicMentions: { text: string; name: string; dept: string; rating: number }[] = [];

    const drinkTerms = ['เบียร์', 'เหล้า', 'ไวน์', 'ค็อกเทล', 'โซดา', 'น้ำอัดลม', 'ดริ้ง', 'เครื่องดื่ม', 'ชา', 'กาแฟ', 'แอลกอฮอล์', 'โค้ก'];
    const musicTerms = ['เพลง', 'ดนตรี', 'นักร้อง', 'วงดนตรี', 'คาราโอเกะ', 'ปาร์ตี้', 'เวที', 'แสงสี', 'เสียง', 'เต้น', 'คอนเสิร์ต', 'ไมค์'];

    filteredFeedbacks.forEach(f => {
      const name = f.isAnonymous ? 'พนักงานนิรนาม' : (f.employeeName || 'ไม่ระบุชื่อ');
      const dept = f.department || 'ไม่ระบุฝ่าย';
      
      const allTexts = [f.likedMost || '', f.suggestions || '', f.shoutout || ''];
      
      allTexts.forEach(text => {
        if (!text.trim()) return;
        
        const hasDrink = drinkTerms.some(term => text.includes(term));
        const hasMusic = musicTerms.some(term => text.includes(term));
        
        if (hasDrink && drinkMentions.length < 4 && !drinkMentions.some(m => m.text === text)) {
          drinkMentions.push({ text: text.trim(), name, dept, rating: f.ratingBeverages || 5 });
        }
        if (hasMusic && musicMentions.length < 4 && !musicMentions.some(m => m.text === text)) {
          musicMentions.push({ text: text.trim(), name, dept, rating: f.ratingMusic || 5 });
        }
      });
    });

    // Frequency counters
    const drinkFreqs = [
      { name: 'เบียร์ & แอลกอฮอล์', count: 0, color: 'bg-amber-50 text-amber-700 border-amber-200' },
      { name: 'น้ำอัดลม & ม็อกเทล', count: 0, color: 'bg-teal-50 text-teal-700 border-teal-200' },
      { name: 'กาแฟ & คาเฟอีน', count: 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    ];

    const musicFreqs = [
      { name: 'ตู้คาราโอเกะ & ร้องเพลง', count: 0, color: 'bg-pink-50 text-pink-700 border-pink-200' },
      { name: 'วงดนตรีสด & คอนเสิร์ต', count: 0, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      { name: 'แสงสีเสียง & เต้นปาร์ตี้', count: 0, color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' }
    ];

    filteredFeedbacks.forEach(f => {
      const fullText = `${f.likedMost || ''} ${f.suggestions || ''} ${f.shoutout || ''}`;
      
      // drinks
      if (['เบียร์', 'เหล้า', 'ไวน์', 'แอลกอฮอล์'].some(t => fullText.includes(t))) drinkFreqs[0].count++;
      if (['น้ำอัดลม', 'ม็อกเทล', 'โซดา', 'โค้ก', 'น้ำหวาน'].some(t => fullText.includes(t))) drinkFreqs[1].count++;
      if (['กาแฟ', 'ชา', 'โกโก้'].some(t => fullText.includes(t))) drinkFreqs[2].count++;

      // music
      if (['คาราโอเกะ', 'ร้องเพลง', 'ไมค์'].some(t => fullText.includes(t))) musicFreqs[0].count++;
      if (['วงดนตรี', 'นักร้อง', 'ดนตรีสด', 'เล่นสด'].some(t => fullText.includes(t))) musicFreqs[1].count++;
      if (['แสงสี', 'ปาร์ตี้', 'เต้น', 'เสียงดนตรี', 'ดีเจ'].some(t => fullText.includes(t))) musicFreqs[2].count++;
    });

    return {
      drinkMentions,
      musicMentions,
      drinkFreqs: drinkFreqs.filter(f => f.count > 0).sort((a,b) => b.count - a.count),
      musicFreqs: musicFreqs.filter(f => f.count > 0).sort((a,b) => b.count - a.count)
    };
  }, [filteredFeedbacks]);

  // Automated Insights and Findings Engine
  const executiveInsights = useMemo(() => {
    const list: { type: 'success' | 'warn' | 'idea'; title: string; desc: string }[] = [];
    if (stats.total === 0) return list;

    // Finding highest and lowest ratings
    const scores = [
      { key: 'ความพึงพอใจโดยรวม', val: stats.avgOverall },
      { key: 'สวัสดิการเครื่องดื่ม', val: stats.avgBeverages },
      { key: 'ดนตรีและแสงสี', val: stats.avgMusic },
      { key: 'ที่พักและห้องนอน', val: stats.avgAccommodation },
      { key: 'อาหารและเครื่องดื่มจัดเลี้ยง', val: stats.avgFood },
      { key: 'กิจกรรมทริป', val: stats.avgActivities },
      { key: 'กำหนดการและเวลา', val: stats.avgSchedule },
      { key: 'เวลาพักผ่อนอิสระ', val: stats.avgRestTime }
    ].sort((a, b) => b.val - a.val);

    const highest = scores[0];
    const lowest = scores[scores.length - 1];

    list.push({
      type: 'success',
      title: `จุดเด่นอันดับหนึ่งของทริป: ${highest.key}`,
      desc: `พนักงานโหวตให้คะแนนเฉลี่ยสูงสุดถึง ${highest.val} / 5.0 คะแนน ถือเป็นหัวใจสำคัญที่ทำให้ทริปครั้งนี้ประสบความสำเร็จ`
    });

    if (lowest.val < 4.0) {
      list.push({
        type: 'warn',
        title: `จุดที่ควรปรับปรุงอย่างด่วนในทริปหน้า: ${lowest.key}`,
        desc: `ได้รับคะแนนเฉลี่ยต่ำสุดเพียง ${lowest.val} / 5.0 ควรวางแผนจัดสรรใหม่ หรือสอบถามข้อมูลเพิ่มเติมจากข้อเสนอแนะ`
      });
    } else {
      list.push({
        type: 'idea',
        title: `จุดที่สามารถต่อยอดได้: ${lowest.key}`,
        desc: `แม้จะได้คะแนนน้อยที่สุดในกลุ่ม (${lowest.val} / 5.0) แต่ยังถือว่าอยู่ในเกณฑ์ดี สามารถยกระดับความสุขได้เพิ่มเติม`
      });
    }

    // Drinks & Music specific analysis
    if (stats.avgBeverages >= 4.5) {
      list.push({
        type: 'success',
        title: `สวัสดิการเครื่องดื่มจัดเต็ม โดนใจพนักงานอย่างยิ่ง! 🎉`,
        desc: `คะแนนด้านบริการเครื่องดื่มอยู่ที่ ${stats.avgBeverages} / 5.0 สอดคล้องกับความชื่นชมเรื่องไลน์เครื่องดื่มที่พนักงานกล่าวถึงอย่างหนาหู`
      });
    } else if (stats.avgBeverages < 3.8) {
      list.push({
        type: 'warn',
        title: `ปริมาณหรือความหลากหลายของเครื่องดื่มยังไม่เพียงพอ`,
        desc: `คะแนนเครื่องดื่มเฉลี่ยค่อนข้างน้อย (${stats.avgBeverages}) พนักงานบางส่วนสะท้อนว่าเครื่องดื่มหมดไวหรือแอลกอฮอล์ไม่ทั่วถึง`
      });
    }

    if (stats.avgMusic >= 4.5) {
      list.push({
        type: 'success',
        title: `บรรยากาศแสงสีดนตรีปาร์ตี้ สนุกสนานครึกครื้นยอดเยี่ยม 🎸`,
        desc: `พนักงานประทับใจระบบเสียง วงดนตรีสด หรือตู้คาราโอเกะเป็นอย่างมาก คะแนนความมันส์เฉลี่ยทะลุ ${stats.avgMusic} คะแนน`
      });
    }

    return list;
  }, [stats]);

  if (feedbacks.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-3xs max-w-4xl mx-auto my-6">
        <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <TrendingUp className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 font-display">สถิติแดชบอร์ดสรุปผลแบบประเมินยังว่างเปล่า</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed font-semibold">
          เนื่องจากยังไม่มีข้อมูลแบบสอบถามจากพนักงานในฐานข้อมูล Firestore แอดมินสามารถรอให้พนักงานเข้ามาประเมินผล หรือซิงค์ข้อมูลจริงได้ทันทีครับ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Widget */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-extrabold border border-indigo-100 uppercase tracking-wider mb-1.5 font-display">
            สถิติมุมกว้างแบบเห็นภาพ (Executive Data Visualization)
          </span>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            แดชบอร์ดสรุปผลแบบสอบถามพนักงาน (Survey Dashboard)
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-semibold">
            แสดงผลกราฟิกอัจฉริยะสรุปคะแนนประเมิน ปาร์ตี้ สวัสดิการดนตรีและเครื่องดื่มของชาวคณะสัมมนา
          </p>
        </div>

        {/* Filter Selection dropdown */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <ListFilter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-extrabold">กรองตามฝ่ายงาน:</span>
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

      {/* KPI Top Scorecards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ผู้ร่วมส่งเสียง</span>
            <div className="p-1 rounded bg-indigo-50 text-indigo-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800 tracking-tight font-display">{stats.total}</span>
            <span className="text-xs text-slate-400 font-bold">ท่าน</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-bold">
            ข้อมูลอัปเดตแบบเรียลไทม์จากระบบคลาวด์
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความพึงพอใจทริป</span>
            <div className="p-1 rounded bg-indigo-50 text-indigo-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-600 tracking-tight font-display">{stats.avgOverall}</span>
            <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Smile
                key={i}
                className={`w-3 h-3 ${
                  i < Math.round(stats.avgOverall) ? 'text-indigo-600 fill-indigo-500/30' : 'text-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เรตสวัสดิการเครื่องดื่ม</span>
            <div className="p-1 rounded bg-fuchsia-50 text-fuchsia-600">
              <Beer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-fuchsia-600 tracking-tight font-display">{stats.avgBeverages}</span>
            <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
          </div>
          <p className="text-[9px] text-fuchsia-500 mt-1.5 font-bold">
            ความเพียงพอและหลากหลายของเครื่องดื่ม
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เรตดนตรีและปาร์ตี้</span>
            <div className="p-1 rounded bg-pink-50 text-pink-600">
              <Music className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-pink-600 tracking-tight font-display">{stats.avgMusic}</span>
            <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
          </div>
          <p className="text-[9px] text-pink-500 mt-1.5 font-bold">
            ระบบเวที แสงสี และความครึกครื้นรอบดึก
          </p>
        </div>
      </div>

      {/* SECTION: Employee Survey Completion Status Tracker */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4" id="employee-survey-completion-tracker">
        {/* Header & Progress Stats bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold shrink-0">
                <UserCheck className="w-5 h-5 text-indigo-600" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>ตารางตรวจสอบสถานะการทำแบบสอบถามรายพนักงาน</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                    Survey Completion Tracker
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  ตรวจสอบรายชื่อพนักงานทั้งหมด ({totalEmployeesCount} ท่าน) เพื่อดูว่าใครส่งแบบประเมินแล้วบ้าง และติดตามผู้ที่ยังไม่ได้ทำแบบสอบถาม
                </p>
              </div>
            </div>
          </div>

          {/* Completion Progress Bar Badge & Copy Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ทำแบบสอบถามแล้ว</p>
                <p className="text-xs font-black text-slate-800 font-mono">
                  <span className="text-emerald-600">{submittedCount}</span> / {totalEmployeesCount} ท่าน ({completionPercentage}%)
                </p>
              </div>
              <div className="w-16 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }} 
                />
              </div>
            </div>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleCopyUnsubmittedList}
                className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs active:scale-95"
                title="คัดลอกรายชื่อพนักงานที่ยังไม่ได้ทำแบบสอบถาม"
              >
                {copiedUnsubmitted ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คัดลอกรายชื่อแล้ว! ✨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-700" />
                    <span>คัดลอกรายชื่อคนยังไม่ตอบ ({pendingCount})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-3xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>ทั้งหมด</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-700 font-bold">
                {totalEmployeesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('DONE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'DONE'
                  ? 'bg-emerald-600 text-white shadow-3xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>✅ ตอบแล้ว</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                statusFilter === 'DONE' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {submittedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-3xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span>⏳ ยังไม่ตอบ</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                statusFilter === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {pendingCount}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส หรือแผนก..."
              value={employeeSearchQuery}
              onChange={(e) => setEmployeeSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {employeeSearchQuery && (
              <button
                type="button"
                onClick={() => setEmployeeSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Employees Completion Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-3xs max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">รายชื่อพนักงาน</th>
                <th className="py-2.5 px-3.5">ฝ่าย / แผนก</th>
                <th className="py-2.5 px-3.5 text-center">ร่วมทริป (RSVP)</th>
                <th className="py-2.5 px-3.5 text-center">สถานะทำแบบสอบถาม</th>
                <th className="py-2.5 px-3.5 text-center">โหมดแสดงชื่อ</th>
                <th className="py-2.5 px-3.5 text-right">เวลาทำรายการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs font-medium text-slate-700">
              {filteredEmployeeSurveyList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-bold">
                    ไม่พบข้อมูลพนักงานที่ตรงตามเงื่อนไขค้นหา
                  </td>
                </tr>
              ) : (
                filteredEmployeeSurveyList.map(emp => (
                  <tr 
                    key={emp.id} 
                    className={`hover:bg-indigo-50/30 transition-colors ${
                      !emp.hasSubmitted ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          emp.hasSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {emp.id.replace('EMP', '')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs leading-tight">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{emp.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {emp.department || '-'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      {emp.rsvpStatus === 'ไป' ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px]">
                          🚌 เข้าร่วม
                        </span>
                      ) : emp.rsvpStatus === 'ไม่ไป' ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px]">
                          ❌ ไม่ร่วม
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px]">
                          ยังไม่ระบุ
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      {emp.hasSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ตอบแล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[11px] border border-amber-300 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>ยังไม่ตอบ</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      {emp.hasSubmitted ? (
                        emp.isAnonymous ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span>🤫</span> นิรนาม
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px] inline-flex items-center gap-1">
                            <span>👤</span> แสดงชื่อ
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300 font-mono text-[10px]">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-mono text-[10px] text-slate-500">
                      {emp.submittedAt ? (
                        emp.submittedAt.toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="text-amber-700 font-black bg-amber-100/80 px-2 py-0.5 rounded text-[10px]">
                          รอดำเนินการ
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Charts Bento Grid - Executive View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Main Chart: Categories Performance */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs lg:col-span-8 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              ระดับคะแนนเฉลี่ยจำแนกตามรายหัวข้อการประเมิน (Core Rating Metrics)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              เปรียบเทียบระดับคะแนนความพึงพอใจเฉลี่ย 8 มิติหลัก เพื่อระบุจุดปังและจุดปรับปรุงของการจัดสัมมนาครั้งนี้
            </p>
          </div>
          
          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                barSize={24}
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
                          <p className="mt-1 font-bold text-indigo-600">คะแนนประเมินเฉลี่ย: {data.score} / 5.0</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Distribution Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs lg:col-span-4 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
              <PieChartIcon className="w-4 h-4 text-teal-500" />
              การกระจายคำตอบความพึงพอใจทริปภาพรวม
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              ระดับความสุขที่พนักงานประเมินในภาพรวมสัมมนา
            </p>
          </div>

          <div className="relative h-44 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overallPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {overallPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 text-[10px] font-sans font-bold text-slate-700">
                          {data.name}: <span className="text-indigo-600">{data.value} ท่าน</span>
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
              <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">คะแนนเฉลี่ย</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {overallPieData.map((entry, index) => (
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

      </div>

      {/* Sub-tab interactive spotlight section for Beverages and Music */}
      <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-3xl" id="beverages-music-spotlight-dashboard">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600 animate-pulse" />
              จุดเจาะลึกพิเศษ: สวัสดิการเครื่องดื่ม และดนตรี/คาราโอเกะ (Drinks & Entertainment Spotlight)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-none">
              วิเคราะห์ความต้องการเชิงสถิติและความคิดเห็นเชิงลึกที่เกี่ยวข้องกับความสำราญ
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-3xs self-start sm:self-auto">
            <button
              onClick={() => setActiveSpotlightTab('all')}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                activeSpotlightTab === 'all' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setActiveSpotlightTab('beverage')}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                activeSpotlightTab === 'beverage' ? 'bg-fuchsia-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Beer className="w-3 h-3" />
              เครื่องดื่ม 🍹
            </button>
            <button
              onClick={() => setActiveSpotlightTab('music')}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                activeSpotlightTab === 'music' ? 'bg-pink-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Music className="w-3 h-3" />
              ดนตรีเวที 🎸
            </button>
            <button
              onClick={() => setActiveSpotlightTab('correlation')}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                activeSpotlightTab === 'correlation' ? 'bg-indigo-950 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Activity className="w-3 h-3" />
              วิเคราะห์ความสัมพันธ์ 📈
            </button>
          </div>
        </div>

        {/* Tab contents with motion animations */}
        <div className="mt-5">
          {activeSpotlightTab === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Beverage breakdown distribution */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/85 shadow-3xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-fuchsia-50 text-fuchsia-600">
                      <Beer className="w-4 h-4" />
                    </span>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">สัดส่วนผู้ให้คะแนนสวัสดิการเครื่องดื่ม</h4>
                  </div>
                  <span className="text-xs font-black text-fuchsia-650 font-mono bg-fuchsia-50/50 px-2 py-0.5 rounded border border-fuchsia-100">
                    เฉลี่ย {stats.avgBeverages} / 5.0
                  </span>
                </div>

                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={beverageMusicDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="rating" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="Beverages" name="จำนวนคนโหวตเครื่องดื่ม" fill="#d946ef" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Box 2: Music breakdown distribution */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200/85 shadow-3xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-pink-50 text-pink-600">
                      <Music className="w-4 h-4" />
                    </span>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">สัดส่วนผู้ให้คะแนนดนตรี แสงสีปาร์ตี้</h4>
                  </div>
                  <span className="text-xs font-black text-pink-650 font-mono bg-pink-50/50 px-2 py-0.5 rounded border border-pink-100">
                    เฉลี่ย {stats.avgMusic} / 5.0
                  </span>
                </div>

                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={beverageMusicDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="rating" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="Music" name="จำนวนคนโหวตดนตรี" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeSpotlightTab === 'beverage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stats */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">ดัชนีชื่นชอบเครื่องดื่ม</span>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-fuchsia-600 font-display">{stats.avgBeverages}</span>
                    <span className="text-xs text-slate-400 font-bold">/ 5.0 คะแนน</span>
                  </div>
                  <div className="text-[9px] text-fuchsia-650 bg-fuchsia-50/40 p-2 rounded-xl mt-3 font-semibold">
                    ⭐ 4-5 ดาว: <span className="font-extrabold text-fuchsia-700">{Math.round((filteredFeedbacks.filter(f => (f.ratingBeverages || 5) >= 4).length / (stats.total || 1)) * 100)}%</span> ของผู้โหวตพึงพอใจสูงมาก
                  </div>
                </div>

                {/* Tag Mining cloud */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs col-span-2 space-y-3">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    แท็กความต้องการหลักที่พนักงานกล่าวถึง (Beverage Keyword Tags Extracted)
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {keywordHighlights.drinkFreqs.length === 0 ? (
                      <p className="text-[11px] text-slate-450 italic font-medium">ยังไม่พบคีย์เวิร์ดเด่นในแบบสำรวจกลุ่มนี้</p>
                    ) : (
                      keywordHighlights.drinkFreqs.map((k, idx) => (
                        <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold rounded-full border border-dashed ${k.color} shadow-4xs hover:scale-105 transition-transform`}>
                          ☕ {k.name} <span className="font-mono text-[10px] px-1 bg-white rounded-full font-black border border-slate-200/50 shadow-3xs">{k.count} ครั้ง</span>
                        </span>
                      ))
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 leading-none pt-2 font-medium">
                    *ระบบสแกนอัตโนมัติจากความคิดเห็นแบบเปิดเกี่ยวกับความประทับใจและข้อเสนอแนะเพิ่มเติม
                  </p>
                </div>
              </div>

              {/* Quotes */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                <h4 className="text-[11px] font-black text-fuchsia-950 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-fuchsia-500" />
                  เสียงสะท้อนคำชมและข้อเสนอแนะเกี่ยวกับสวัสดิการเครื่องดื่ม (Beverage Feedback Highlights)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {keywordHighlights.drinkMentions.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-slate-400 italic font-medium col-span-2">
                      ยังไม่พบความคิดเห็นที่เป็นลายลักษณ์อักษรระบุถึงเรื่องเครื่องดื่มโดยเฉพาะ
                    </div>
                  ) : (
                    keywordHighlights.drinkMentions.map((quote, idx) => (
                      <div key={idx} className="bg-fuchsia-50/20 border border-fuchsia-100/50 p-3 rounded-xl flex flex-col justify-between space-y-1">
                        <p className="text-[11px] text-slate-700 leading-normal font-medium">“{quote.text}”</p>
                        <div className="flex justify-between items-center pt-2 text-[9px] font-bold">
                          <span className="text-fuchsia-700">— คุณ {quote.name} ({quote.dept})</span>
                          <span className="text-amber-500 font-mono">★ {quote.rating}/5</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSpotlightTab === 'music' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stats */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider">ดัชนีชื่นชอบปาร์ตี้/ดนตรี</span>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-pink-600 font-display">{stats.avgMusic}</span>
                    <span className="text-xs text-slate-400 font-bold">/ 5.0 คะแนน</span>
                  </div>
                  <div className="text-[9px] text-pink-650 bg-pink-50/40 p-2 rounded-xl mt-3 font-semibold">
                    ⭐ 4-5 ดาว: <span className="font-extrabold text-pink-700">{Math.round((filteredFeedbacks.filter(f => (f.ratingMusic || 5) >= 4).length / (stats.total || 1)) * 100)}%</span> ของผู้โหวตสนุกสนานเป็นอันมาก
                  </div>
                </div>

                {/* Tag Mining cloud */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs col-span-2 space-y-3">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    แท็กความต้องการปาร์ตี้ดนตรีที่พนักงานกล่าวถึง (Music Keyword Tags Extracted)
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {keywordHighlights.musicFreqs.length === 0 ? (
                      <p className="text-[11px] text-slate-450 italic font-medium">ยังไม่พบคีย์เวิร์ดเด่นในแบบสำรวจกลุ่มนี้</p>
                    ) : (
                      keywordHighlights.musicFreqs.map((k, idx) => (
                        <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold rounded-full border border-dashed ${k.color} shadow-4xs hover:scale-105 transition-transform`}>
                          🎤 {k.name} <span className="font-mono text-[10px] px-1 bg-white rounded-full font-black border border-slate-200/50 shadow-3xs">{k.count} ครั้ง</span>
                        </span>
                      ))
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 leading-none pt-2 font-medium">
                    *ระบบระบุอัตโนมัติจากเวที คาราโอเกะ วงดนตรีสด แสงสีเสียง และสันทนาการรอบคืนสังสรรค์
                  </p>
                </div>
              </div>

              {/* Quotes */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
                <h4 className="text-[11px] font-black text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-pink-500" />
                  เสียงสะท้อนคำชมและข้อเสนอแนะเกี่ยวกับสันทนาการ ดนตรี คอนเสิร์ต (Music Feedback Highlights)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {keywordHighlights.musicMentions.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-slate-400 italic font-medium col-span-2">
                      ยังไม่พบความคิดเห็นที่เป็นลายลักษณ์อักษรระบุถึงดนตรีปาร์ตี้โดยเฉพาะ
                    </div>
                  ) : (
                    keywordHighlights.musicMentions.map((quote, idx) => (
                      <div key={idx} className="bg-pink-50/20 border border-pink-100/50 p-3 rounded-xl flex flex-col justify-between space-y-1">
                        <p className="text-[11px] text-slate-700 leading-normal font-medium">“{quote.text}”</p>
                        <div className="flex justify-between items-center pt-2 text-[9px] font-bold">
                          <span className="text-pink-700">— คุณ {quote.name} ({quote.dept})</span>
                          <span className="text-amber-500 font-mono">★ {quote.rating}/5</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSpotlightTab === 'correlation' && (
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div>
                <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  กราฟเปรียบเทียบระดับความพึงพอใจแบบลายตัวบุคคล (Satisfaction Correlation Curve)
                </h4>
                <p className="text-[10px] text-slate-450 mt-1 font-semibold">
                  แสดงจุดดิ่ง/จุดพุ่งของคะแนนเครื่องดื่ม และ แสงสีเสียง เทียบกับระดับความประทับใจโดยรวมของพนักงานแต่ละคนเรียงลำดับ
                </p>
              </div>

              <div className="h-64 mt-4 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={correlationData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="index" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 text-[10px] font-sans font-bold space-y-1">
                              <p className="text-slate-700">พนักงานผู้ส่งคำตอบ: {data.name}</p>
                              <p className="text-indigo-600">✨ ความพึงพอใจรวม: {data['ความพึงพอใจภาพรวม']} / 5</p>
                              <p className="text-fuchsia-600">🍹 เครื่องดื่มจัดเต็ม: {data['สวัสดิการเครื่องดื่ม']} / 5</p>
                              <p className="text-pink-600">🎸 ดนตรี แสงสี: {data['ดนตรี & แสงสีปาร์ตี้']} / 5</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '9px', fontWeight: 700 }} />
                    <Area type="monotone" dataKey="ความพึงพอใจภาพรวม" name="✨ ภาพรวมทริป" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOverall)" />
                    <Line type="monotone" dataKey="สวัสดิการเครื่องดื่ม" name="🍹 สวัสดิการเครื่องดื่ม" stroke="#d946ef" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="ดนตรี & แสงสีปาร์ตี้" name="🎸 ดนตรี & แสงสีเวที" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Department Breakdown Matrix */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs">
        <div>
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide font-display flex items-center gap-1.5">
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
            ตารางเปรียบเทียบคะแนนประเมินรายแผนก/ฝ่ายงาน (Departmental Breakdown Matrix)
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
            แสดงสถิติและคะแนนเฉลี่ยละเอียดของพนักงานแต่ละแผนก เพื่อวิเคราะห์ความแตกต่างของรสนิยมและความพอใจกลุ่มย่อย
          </p>
        </div>

        <div className="mt-4 border border-slate-150 rounded-2xl overflow-hidden shadow-4xs overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
              <tr className="text-[9px] text-slate-500 font-extrabold font-display uppercase tracking-wider">
                <th className="px-4 py-2.5">ฝ่ายงาน (Department)</th>
                <th className="px-4 py-2.5 text-center">จำนวนผู้ตอบ</th>
                <th className="px-4 py-2.5 text-center bg-indigo-50/40 text-indigo-800 font-black">ความพอใจโดยรวม</th>
                <th className="px-4 py-2.5 text-center text-fuchsia-800 font-black">สวัสดิการเครื่องดื่ม</th>
                <th className="px-4 py-2.5 text-center text-pink-850 font-black">ดนตรี แสงสี ปาร์ตี้</th>
                <th className="px-4 py-2.5 text-center">สัดส่วนสระน้ำ/ที่พัก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {deptComparisonData.map((item, index) => {
                // Calculate rough accommodation or food score for reference
                const feedbacksForDept = feedbacks.filter(f => (f.department || 'ไม่ระบุฝ่าย') === item.department);
                const avgAcc = feedbacksForDept.length > 0 ? Number((feedbacksForDept.reduce((acc, f) => acc + (f.ratingAccommodation || 0), 0) / feedbacksForDept.length).toFixed(2)) : 5.0;

                return (
                  <tr key={index} className="text-[11px] hover:bg-indigo-50/20 transition-colors font-medium text-slate-600">
                    <td className="px-4 py-2 font-black text-slate-800">
                      {item.department}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-400 font-bold font-mono">
                      {item.count} ท่าน
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-black text-indigo-650 bg-indigo-50/20">
                      {item['ภาพรวมทริป']} / 5.0
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-black text-fuchsia-600">
                      {item['บริการเครื่องดื่ม']} / 5.0
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-black text-pink-600">
                      {item['ดนตรี & แสงสี']} / 5.0
                    </td>
                    <td className="px-4 py-2 text-center font-mono font-bold text-slate-500">
                      {avgAcc} / 5.0
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Findings Box */}
      <div className="bg-indigo-950 text-indigo-100 p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-300 shrink-0" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">บทวิเคราะห์สถิติมุมมองผู้บริหาร (Executive Insights & Discoveries)</h4>
            <p className="text-[9px] text-indigo-300 font-bold leading-none mt-1">ประมวลผลข้อสังเกตและแนวทางปรับปรุงในการสัมมนาครั้งหน้าโดยอัตโนมัติ</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {executiveInsights.length === 0 ? (
            <div className="col-span-2 text-center text-xs text-indigo-300 py-4 font-bold">
              อยู่ระหว่างการวิเคราะห์สแกนจุดแข็ง... กรุณารอสถิติจำนวนผู้ทำแบบประเมินมากกว่านี้
            </div>
          ) : (
            executiveInsights.map((insight, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex gap-3 items-start">
                <span className="text-lg">
                  {insight.type === 'success' ? '🎯' : insight.type === 'warn' ? '⚠️' : '💡'}
                </span>
                <div>
                  <h5 className="text-[11px] font-black text-white leading-tight">{insight.title}</h5>
                  <p className="text-[10px] text-indigo-200 mt-1.5 leading-relaxed font-semibold">{insight.desc}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
