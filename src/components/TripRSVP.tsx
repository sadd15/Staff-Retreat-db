import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Employee } from '../types';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Clock, 
  Building2, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle,
  Users,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  UserPlus,
  QrCode,
  Ticket,
  Calendar,
  MapPin,
  Compass,
  RefreshCw
} from 'lucide-react';

interface TripRSVPProps {
  employees: Employee[];
  rsvpClosed: boolean;
  onUpdateRSVP: (employeeId: string, status: 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ') => Promise<void>;
  syncing: boolean;
  onUpdateEmployees: (updatedEmployees: Employee[]) => Promise<void>;
  userRole: 'visitor' | 'employee' | 'admin' | null;
  selectedEmployeeId: string | null;
  selectedDepartment: string | null;
  isReadOnlyEmployee?: boolean;
}

export default function TripRSVP({
  employees,
  rsvpClosed,
  onUpdateRSVP,
  syncing,
  onUpdateEmployees,
  userRole,
  selectedEmployeeId,
  selectedDepartment,
  isReadOnlyEmployee = false,
}: TripRSVPProps) {
  const [tableSearch, setTableSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ทั้งหมด');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ทั้งหมด' | 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ'>('ทั้งหมด');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Employee Modals / Forms state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [empToEdit, setEmpToEdit] = useState<Employee | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<Employee | null>(null);
  const [rsvpCancelConfirm, setRsvpCancelConfirm] = useState<{ employeeId: string; status: 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ'; empName: string } | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'ชาย' | 'หญิง'>('ชาย');
  const [formDept, setFormDept] = useState('');
  const [formId, setFormId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helper to generate the next Employee ID sequentially globally (EMPxxx format)
  const getNextEmpId = () => {
    const empEmployees = employees.filter(e => {
      // Find all IDs that are formatted like EMPxxx or are numbers, or just extract any numeric parts
      return e.id.toUpperCase().startsWith('EMP');
    });
    
    const numericIds = empEmployees
      .map(e => {
        const numStr = e.id.substring(3);
        const num = parseInt(numStr, 10);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    // If there are general numbers in any other IDs, let's also scan them to avoid any duplication
    const allNumericIds = employees
      .map(e => {
        const match = e.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(num => num > 0);

    const maxNum = Math.max(
      numericIds.length > 0 ? Math.max(...numericIds) : 0,
      allNumericIds.length > 0 ? Math.max(...allNumericIds) : 0
    );

    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    return `EMP${String(nextNum).padStart(3, '0')}`;
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDept.trim() || !formId.trim()) return;

    // Check duplicate ID
    const idExists = employees.some(emp => emp.id.toUpperCase() === formId.trim().toUpperCase());
    if (idExists) {
      alert(`รหัสพนักงาน "${formId.trim()}" นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`);
      return;
    }

    setIsSaving(true);
    try {
      const newEmp: Employee = {
        id: formId.trim(),
        name: formName.trim(),
        gender: formGender,
        department: formDept.trim(),
        roomId: '',
        rsvpStatus: 'ยังไม่ระบุ'
      };

      await onUpdateEmployees([...employees, newEmp]);
      setIsAddModalOpen(false);
      setFormName('');
      setFormDept('');
      setFormId('');
      alert('เพิ่มพนักงานคนใหม่เรียบร้อยแล้ว');
    } catch (err: any) {
      alert(`ล้มเหลว: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEmpToEdit(emp);
    setFormName(emp.name);
    setFormGender(emp.gender as 'ชาย' | 'หญิง');
    setFormDept(emp.department);
    setIsEditModalOpen(true);
  };

  const handleOpenAddModalForDept = (deptName: string) => {
    setFormName('');
    setFormGender('ชาย');
    setFormDept(deptName);
    setFormId(getNextEmpId());
    setIsAddModalOpen(true);
  };

  const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empToEdit || !formName.trim() || !formDept.trim()) return;

    setIsSaving(true);
    try {
      const updatedEmployees = employees.map(emp => {
        if (emp.id === empToEdit.id) {
          // If gender changed, clear their room selection to prevent mismatch!
          const roomId = emp.gender !== formGender ? '' : emp.roomId;
          return {
            ...emp,
            name: formName.trim(),
            gender: formGender,
            department: formDept.trim(),
            roomId
          };
        }
        return emp;
      });

      await onUpdateEmployees(updatedEmployees);
      setIsEditModalOpen(false);
      setEmpToEdit(null);
      setFormName('');
      setFormDept('');
      alert('บันทึกการแก้ไขพนักงานเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(`ล้มเหลว: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = (emp: Employee) => {
    setDeleteConfirmEmp(emp);
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!deleteConfirmEmp) return;
    setIsSaving(true);
    try {
      const updatedEmployees = employees.filter(e => e.id !== deleteConfirmEmp.id);
      await onUpdateEmployees(updatedEmployees);
      setDeleteConfirmEmp(null);
      alert('ลบรายชื่อพนักงานสำเร็จเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(`ล้มเหลว: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };



  // Group ALL employees by department for the gorgeous summary table
  const employeesByDepartment = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    employees.forEach(e => {
      const dept = e.department || 'ทั่วไป';
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(e);
    });

    // Sort departments and employees
    return Object.entries(groups).map(([deptName, list]) => {
      // Sort list: 'ไป' first, then 'ยังไม่ระบุ', then 'ไม่ไป'
      const sortedList = [...list].sort((a, b) => {
        const score = (emp: Employee) => {
          if (emp.rsvpStatus === 'ไป') return 1;
          if (!emp.rsvpStatus || emp.rsvpStatus === 'ยังไม่ระบุ') return 2;
          return 3;
        };
        return score(a) - score(b);
      });

      // Calculate stats for this department
      const going = list.filter(e => e.rsvpStatus === 'ไป').length;
      const notGoing = list.filter(e => e.rsvpStatus === 'ไม่ไป').length;
      const pending = list.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length;

      return {
        deptName,
        list: sortedList,
        stats: { going, notGoing, pending, total: list.length }
      };
    }).sort((a, b) => {
      if (selectedDepartment) {
        if (a.deptName === selectedDepartment) return -1;
        if (b.deptName === selectedDepartment) return 1;
      }
      return a.deptName.localeCompare(b.deptName, 'th');
    });
  }, [employees, selectedDepartment]);

  // Filter departments & list based on table search query, selected department filter and status filter
  const filteredEmployeesByDepartment = useMemo(() => {
    let result = employeesByDepartment;
    if (selectedDeptFilter !== 'ทั้งหมด') {
      result = result.filter(dept => dept.deptName === selectedDeptFilter);
    }

    const q = tableSearch.toLowerCase().trim();
    
    return result.map(dept => {
      let filteredList = dept.list;
      if (selectedStatusFilter !== 'ทั้งหมด') {
        filteredList = filteredList.filter(emp => {
          const empStatus = emp.rsvpStatus || 'ยังไม่ระบุ';
          return empStatus === selectedStatusFilter;
        });
      }
      if (q) {
        filteredList = filteredList.filter(emp => 
          emp.name.toLowerCase().includes(q) || 
          emp.id.toLowerCase().includes(q)
        );
      }
      return {
        ...dept,
        list: filteredList
      };
    }).filter(dept => dept.list.length > 0);
  }, [employeesByDepartment, tableSearch, selectedDeptFilter, selectedStatusFilter]);

  const handleTableRSVP = async (employeeId: string, status: 'ไป' | 'ไม่ไป' | 'ยังไม่ระบุ') => {
    if (rsvpClosed) return;
    
    const emp = employees.find(e => e.id === employeeId);
    if (emp && emp.roomId && (status === 'ไม่ไป' || status === 'ยังไม่ระบุ')) {
      setRsvpCancelConfirm({
        employeeId,
        status,
        empName: emp.name
      });
      return;
    }

    setSubmittingId(employeeId);
    try {
      await onUpdateRSVP(employeeId, status);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleConfirmRsvpCancel = async () => {
    if (!rsvpCancelConfirm) return;
    const { employeeId, status } = rsvpCancelConfirm;
    setSubmittingId(employeeId);
    setRsvpCancelConfirm(null);
    try {
      await onUpdateRSVP(employeeId, status);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmittingId(null);
    }
  };

  // Overall RSVP stats
  const overallStats = useMemo(() => {
    const total = employees.length;
    const going = employees.filter(e => e.rsvpStatus === 'ไป').length;
    const notGoing = employees.filter(e => e.rsvpStatus === 'ไม่ไป').length;
    const pending = employees.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length;

    return { total, going, notGoing, pending };
  }, [employees]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-3 font-sans space-y-4" id="rsvp-page-container">
      
      {/* RSVP Welcoming Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3" id="rsvp-welcome-header">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100 uppercase tracking-wider mb-1.5 font-display">
            ทำเนียบรายชื่อพนักงาน (Employee Directory)
          </span>
          <h1 className="text-lg sm:text-xl font-display font-extrabold text-slate-800 leading-tight">
            ระบบเช็คชื่อและจัดการทำเนียบรายชื่อพนักงาน
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            ผู้ดูแลแผนกหรือพนักงานสามารถเพิ่มรายชื่อ ยืนยันการร่วมทริป และเช็คชื่อความประสงค์ร่วมทริปสัมมนาได้จากตารางรายแผนกโดยตรงด้านล่าง
          </p>
        </div>
      </div>

      {isReadOnlyEmployee && (
        <div className="bg-amber-50 border border-amber-200 text-amber-850 text-xs p-3.5 rounded-xl flex items-center gap-2.5 font-medium shadow-3xs" id="readonly-warning-banner">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-amber-800">โหมดดูอย่างเดียว (Read-only Mode)</p>
            <p className="text-[10px] text-amber-750 mt-0.5">เบราว์เซอร์นี้ได้ยืนยันตัวตนในชื่อพนักงานท่านอื่นแล้ว คุณสามารถเข้าชมข้อมูลของคนนี้ได้ แต่ไม่สามารถแก้ไขสถานะ RSVP ของพนักงานคนนี้ได้</p>
          </div>
        </div>
      )}

      {/* RSVP Quick Statistics Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3" id="rsvp-stats-grid">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">บุคลากรทั้งหมด</p>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none mt-1 font-display">{overallStats.total} คน</h3>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">รายชื่อในไฟล์ระบบปิด</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/50">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">ยืนยันไปร่วมทริป</p>
            <h3 className="text-xl font-extrabold text-emerald-600 tracking-tight leading-none mt-1 font-display">{overallStats.going} คน</h3>
            <p className="text-[10px] text-emerald-600 mt-1.5 font-medium">
              สิทธิ์จองห้องพักครบถ้วน
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/50">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">แจ้งสละสิทธิ์ / ไม่ไป</p>
            <h3 className="text-xl font-extrabold text-rose-600 tracking-tight leading-none mt-1 font-display">{overallStats.notGoing} คน</h3>
            <p className="text-[10px] text-rose-500 mt-1.5 font-medium">สละสิทธิ์การจองห้องพัก</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-all">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/50">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">
              {rsvpClosed ? 'สละสิทธิ์อัตโนมัติ' : 'ยังไม่ยืนยัน'}
            </p>
            <h3 className={`text-xl font-extrabold tracking-tight leading-none mt-1 font-display ${rsvpClosed ? 'text-slate-500 line-through' : 'text-amber-600'}`}>
              {overallStats.pending} คน
            </h3>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
              {rsvpClosed ? 'หมดเวลากรอกข้อมูล' : 'รอแจ้งความประสงค์'}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        
        {/* Attendance lists grouped by Department */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col" id="rsvp-summary-table-panel">
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-600 text-[10px] font-bold border border-teal-100 uppercase tracking-wider mb-1.5 font-display">
              ทำเนียบรายชื่อพนักงานแบ่งตามฝ่าย (Direct Entry Sheet)
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-display font-bold text-slate-800 leading-tight">
                  บันทึกสถานะพนักงานแยกแผนก
                </h2>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                  {rsvpClosed 
                    ? 'ตารางประมวลผลการลงทะเบียน แยกตามแผนก (ปิดการแก้ไขแล้ว)' 
                    : 'ธุรการฝ่ายสามารถคลิก "ไป" / "ไม่ไป" / "เคลียร์" ในแถวของพนักงานเพื่ออัปเดตข้อมูลได้โดยตรง'
                  }
                </p>
              </div>
              
              {!rsvpClosed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 self-start sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  ตารางเปิดบันทึกข้อมูลสด
                </span>
              )}
            </div>
          </div>

          {/* Department Filter Tab Bar */}
          <div className="mb-4 overflow-x-auto pb-1.5 scrollbar-hide" id="dept-filter-tab-bar">
            <div className="flex flex-nowrap gap-2">
              {/* 'ทั้งหมด' Tab */}
              <button
                onClick={() => setSelectedDeptFilter('ทั้งหมด')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  selectedDeptFilter === 'ทั้งหมด'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ทั้งหมด</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-all ${
                  selectedDeptFilter === 'ทั้งหมด' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {employees.length}
                </span>
              </button>

              {/* Department Tabs */}
              {employeesByDepartment.map(dept => {
                const isSelected = selectedDeptFilter === dept.deptName;
                return (
                  <button
                    key={dept.deptName}
                    onClick={() => setSelectedDeptFilter(dept.deptName)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                    <span>{dept.deptName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <span>ไป {dept.stats.going}</span>
                      <span className="opacity-40">/</span>
                      <span>{dept.stats.total}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RSVP Status Filter Buttons */}
          <div className="flex flex-nowrap items-center gap-2 mb-3 p-2 bg-slate-50/50 rounded-xl border border-slate-150 overflow-x-auto scrollbar-hide" id="status-filter-buttons-container">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 font-display shrink-0">กรองตามสถานะ:</span>
            <button
              onClick={() => setSelectedStatusFilter('ทั้งหมด')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                selectedStatusFilter === 'ทั้งหมด'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              ทั้งหมด ({employees.length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter('ไป')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 shrink-0 ${
                selectedStatusFilter === 'ไป'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-3xs'
                  : 'bg-white text-emerald-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              ไป ({employees.filter(e => e.rsvpStatus === 'ไป').length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter('ไม่ไป')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 shrink-0 ${
                selectedStatusFilter === 'ไม่ไป'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-3xs'
                  : 'bg-white text-rose-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 animate-in fade-in" />
              ไม่ไป ({employees.filter(e => e.rsvpStatus === 'ไม่ไป').length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter('ยังไม่ระบุ')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1 shrink-0 ${
                selectedStatusFilter === 'ยังไม่ระบุ'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-3xs'
                  : 'bg-white text-amber-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              ยังไม่ระบุ ({employees.filter(e => !e.rsvpStatus || e.rsvpStatus === 'ยังไม่ระบุ').length})
            </button>
          </div>

          {/* Table Search Filter Bar */}
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือรหัสพนักงานในตาราง..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700"
            />
          </div>

          <div className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
            {filteredEmployeesByDepartment.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา
              </div>
            ) : (
              filteredEmployeesByDepartment.map(({ deptName, list, stats }) => {
                const isOwnDept = userRole === 'employee' && selectedDepartment === deptName;
                const hasDeptPermission = !isReadOnlyEmployee && (userRole === 'admin' || isOwnDept);

                return (
                  <div key={deptName} className={`border rounded-2xl overflow-hidden shadow-xs transition-all ${
                    isOwnDept 
                      ? 'border-indigo-400 ring-4 ring-indigo-500/10' 
                      : 'border-slate-200'
                  }`}>
                    {/* Department Header & Stats */}
                    <div className={`${isOwnDept ? 'bg-indigo-50/40' : 'bg-slate-50'} px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-4 h-4 ${isOwnDept ? 'text-indigo-600' : 'text-slate-500'}`} />
                          <h3 className={`text-xs font-bold font-display ${isOwnDept ? 'text-indigo-900 font-black' : 'text-slate-800'}`}>{deptName}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full font-display ${isOwnDept ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                            {stats.total} คน
                          </span>
                          {isOwnDept && (
                            <span className="text-[9px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-md font-display flex items-center gap-1 shadow-3xs animate-pulse">
                              ฝ่ายของคุณ
                            </span>
                          )}
                        </div>
                        
                        {!rsvpClosed && hasDeptPermission && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddModalForDept(deptName)}
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-700 transition-colors cursor-pointer shadow-3xs"
                          >
                            <Plus className="w-3 h-3" />
                            เพิ่มพนักงานในฝ่ายนี้
                          </button>
                        )}
                      </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        ไป {stats.going}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1 text-rose-500 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        ไม่ไป {stats.notGoing}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className={`flex items-center gap-1 font-bold ${rsvpClosed ? 'text-slate-400 line-through' : 'text-amber-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${rsvpClosed ? 'bg-slate-400' : 'bg-amber-500'}`}></span>
                        {rsvpClosed ? `สละสิทธิ์อัตโนมัติ ${stats.pending}` : `รอยืนยัน ${stats.pending}`}
                      </span>
                    </div>
                  </div>

                  {/* Department Employees Table / Card View for Mobile */}
                  <div className="overflow-x-auto">
                    {/* Desktop Table View */}
                    <table className="hidden md:table w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/50 text-[10px] text-slate-400 border-b border-slate-100 font-bold font-display uppercase tracking-wider">
                          <th className="px-4 py-2.5 text-center w-16">ลำดับ</th>
                          <th className="px-4 py-2.5">ชื่อ - นามสกุล</th>
                          <th className="px-4 py-2.5">ฝ่าย</th>
                          <th className="px-4 py-2.5">เพศ</th>
                          <th className="px-4 py-2.5 text-center">สถานะเข้าร่วม / คลิกแก้ไข</th>
                          {(!rsvpClosed || userRole === 'admin') && <th className="px-4 py-2.5 text-center">จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {list.map((emp, index) => {
                          const status = emp.rsvpStatus || 'ยังไม่ระบุ';
                          const isSubmitting = submittingId === emp.id;
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-4 py-2 text-center font-bold text-slate-400 text-[11px]">{index + 1}</td>
                              <td className="px-4 py-2">
                                <div className="font-bold text-slate-700">{emp.name}</div>
                                {emp.roomId && (
                                  <div className="text-[9px] text-indigo-600 font-semibold mt-0.5 bg-indigo-50/50 px-1.5 py-0.2 rounded-md inline-block">
                                    จองเข้ากลุ่มเรียบร้อยแล้ว
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-slate-500 text-[11px] font-medium">{emp.department}</td>
                              <td className="px-4 py-2 text-slate-500 text-[11px] font-medium">{emp.gender}</td>
                              <td className="px-4 py-2 text-center">
                                {rsvpClosed || isReadOnlyEmployee || !(userRole === 'admin' || (userRole === 'employee' && selectedDepartment === emp.department)) ? (
                                  <div className="flex justify-center">
                                    {status === 'ไป' ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md font-bold border border-emerald-100 shadow-3xs">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        เข้าร่วม
                                      </span>
                                    ) : status === 'ไม่ไป' ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-md font-bold border border-rose-100 shadow-3xs">
                                        <XCircle className="w-3 h-3 text-rose-500" />
                                        ไม่ไป
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-400 px-2.5 py-0.5 rounded-md font-bold border border-slate-200">
                                        <AlertCircle className="w-3 h-3 text-slate-300" />
                                        {rsvpClosed ? 'สละสิทธิ์' : 'ยังไม่ระบุ'}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 shadow-3xs relative">
                                      {isSubmitting && (
                                        <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
                                          <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleTableRSVP(emp.id, 'ไป')}
                                        disabled={syncing || isSubmitting}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                          status === 'ไป'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-slate-500 hover:text-emerald-600 hover:bg-white/60'
                                        }`}
                                        title="ยืนยันเข้าร่วมทริป"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>ไป</span>
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleTableRSVP(emp.id, 'ไม่ไป')}
                                        disabled={syncing || isSubmitting}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                          status === 'ไม่ไป'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'text-slate-500 hover:text-rose-600 hover:bg-white/60'
                                        }`}
                                        title="ปฏิเสธการเข้าร่วม"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>ไม่ไป</span>
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleTableRSVP(emp.id, 'ยังไม่ระบุ')}
                                        disabled={syncing || isSubmitting}
                                        className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                                          status === 'ยังไม่ระบุ'
                                            ? 'bg-slate-400 text-white shadow-xs'
                                            : 'text-slate-400 hover:text-indigo-600 hover:bg-white/60'
                                        }`}
                                        title="เคลียร์กลับเป็น ยังไม่ระบุ"
                                      >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        <span>ล้าง</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>
                              {(!rsvpClosed || userRole === 'admin') && (
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  {(userRole === 'admin' || (!isReadOnlyEmployee && !rsvpClosed && userRole === 'employee' && selectedDepartment === emp.department)) ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(emp)}
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="แก้ไขข้อมูลพนักงาน"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteEmployee(emp)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="ลบรายชื่อพนักงาน"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 italic">ไม่มีสิทธิ์แก้ไข</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {(!rsvpClosed || userRole === 'admin') && hasDeptPermission && (
                          <tr className="bg-slate-50/20 hover:bg-indigo-50/10 transition-colors">
                            <td colSpan={6} className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenAddModalForDept(deptName)}
                                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-indigo-50 transition-all cursor-pointer font-display"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                เพิ่มรายชื่อพนักงานใหม่ใน {deptName}
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-100 bg-white">
                      {list.map((emp) => {
                        const status = emp.rsvpStatus || 'ยังไม่ระบุ';
                        const isSubmitting = submittingId === emp.id;
                        const canEdit = !isReadOnlyEmployee && (userRole === 'admin' || (userRole === 'employee' && selectedDepartment === emp.department));
                        return (
                          <div key={emp.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{emp.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>{emp.gender}</span>
                                  <span>•</span>
                                  <span>{emp.department}</span>
                                </div>
                                {emp.roomId && (
                                  <div className="text-[9px] text-indigo-600 font-bold mt-1 bg-indigo-50 px-2 py-0.5 rounded-md inline-block border border-indigo-100">
                                    จองที่พักแล้ว
                                  </div>
                                )}
                              </div>
                              {(!rsvpClosed || userRole === 'admin') && (userRole === 'admin' || (!isReadOnlyEmployee && !rsvpClosed && userRole === 'employee' && selectedDepartment === emp.department)) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditModal(emp)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(emp)}
                                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะ:</span>
                              {rsvpClosed || !canEdit ? (
                                <div className="flex">
                                  {status === 'ไป' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-100">
                                      <CheckCircle2 className="w-3 h-3" /> เข้าร่วม
                                    </span>
                                  ) : status === 'ไม่ไป' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-bold border border-rose-100">
                                      <XCircle className="w-3 h-3" /> ไม่ไป
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-400 px-3 py-1 rounded-full font-bold border border-slate-200">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {rsvpClosed ? 'สละสิทธิ์' : 'ยังไม่ระบุ'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 relative w-full max-w-[240px]">
                                  {isSubmitting && (
                                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
                                      <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleTableRSVP(emp.id, 'ไป')}
                                    disabled={syncing || isSubmitting}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                                      status === 'ไป' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                                    }`}
                                  >
                                    ไป
                                  </button>
                                  <button
                                    onClick={() => handleTableRSVP(emp.id, 'ไม่ไป')}
                                    disabled={syncing || isSubmitting}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                                      status === 'ไม่ไป' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'
                                    }`}
                                  >
                                    ไม่ไป
                                  </button>
                                  <button
                                    onClick={() => handleTableRSVP(emp.id, 'ยังไม่ระบุ')}
                                    disabled={syncing || isSubmitting}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                                      status === 'ยังไม่ระบุ' ? 'bg-slate-400 text-white shadow-sm' : 'text-slate-400'
                                    }`}
                                  >
                                    ล้าง
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(!rsvpClosed || userRole === 'admin') && (
                      <div className="p-4 bg-slate-50/50">
                          <button
                            onClick={() => handleOpenAddModalForDept(deptName)}
                            className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-indigo-600 text-xs font-black hover:bg-white transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            เพิ่มรายชื่อในแผนกนี้
                          </button>
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

      {/* Add Employee Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-slate-800 text-sm">เพิ่มรายชื่อพนักงานใหม่</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">รหัสพนักงาน (กรอกเองหรือใช้รหัสแนะนำ)</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น EMP074 หรือ ข้าราชการ-10"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายขยัน ยิ่งชีพ"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">เพศ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormGender('ชาย')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${formGender === 'ชาย' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    ชาย
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormGender('หญิง')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${formGender === 'หญิง' ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    หญิง
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">ฝ่าย / แผนก</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น การตลาด, ไอที, บัญชี, หรือ ฝ่ายบุคคล"
                  value={formDept}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setFormDept(newDept);
                    // Keep the recommended EMPxxx sequential ID
                    setFormId(getNextEmpId());
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                  list="departments-list"
                />
                <datalist id="departments-list">
                  <option value="ผู้บริหาร" />
                  <option value="ไอที" />
                  <option value="บัญชี" />
                  <option value="การตลาด" />
                  <option value="ฝ่ายบุคคล" />
                  <option value="จัดซื้อ" />
                </datalist>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกพนักงานใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal Overlay */}
      {isEditModalOpen && empToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-slate-800 text-sm">แก้ไขข้อมูลพนักงาน</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">รหัสพนักงาน</label>
                <input
                  type="text"
                  disabled
                  value={empToEdit.id}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">เพศ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormGender('ชาย')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${formGender === 'ชาย' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    ชาย
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormGender('หญิง')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${formGender === 'หญิง' ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    หญิง
                  </button>
                </div>
                {empToEdit.roomId && empToEdit.gender !== formGender && (
                  <p className="text-[9px] text-amber-600 mt-1.5 bg-amber-50 p-2 rounded-lg leading-relaxed">
                    ⚠️ การเปลี่ยนเพศจะทำการ <b>ยกเลิกการเข้ากลุ่มที่เลือกไว้</b> โดยอัตโนมัติ เพื่อป้องกันปัญหานอนต่างเพศ
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider font-display">ฝ่าย / แผนก</label>
                <input
                  type="text"
                  required
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-700"
                  list="departments-list"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-black text-slate-800 text-sm">ยืนยันการลบรายชื่อพนักงาน</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                คุณต้องการลบคุณ <span className="font-bold text-rose-600">{deleteConfirmEmp.name}</span> ออกจากระบบถาวรใช่หรือไม่?
              </p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] text-slate-400 font-mono text-left space-y-1">
                <div>รหัสพนักงาน: <span className="font-bold text-slate-600">{deleteConfirmEmp.id}</span></div>
                <div>ฝ่าย: <span className="font-bold text-slate-600">{deleteConfirmEmp.department}</span></div>
                {deleteConfirmEmp.roomId && <div className="text-amber-600 font-bold">⚠️ หากลบไปแล้ว ตำแหน่งการจองห้องพัก ({deleteConfirmEmp.roomId}) จะหลุดออกทันที</div>}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmEmp(null)}
                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmDeleteEmployee}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'กำลังลบ...' : 'ยืนยันลบ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom RSVP Cancel Confirmation Modal */}
      {rsvpCancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-black text-slate-800 text-sm">การเปลี่ยนสถานะจะล้างการจอง</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                คุณ <span className="font-bold text-slate-700">{rsvpCancelConfirm.empName}</span> ได้ทำการเข้ากลุ่มจองห้องพักไว้แล้ว
              </p>
              <p className="text-xs text-amber-600 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                ⚠️ การเปลี่ยนสถานะเป็น "{rsvpCancelConfirm.status === 'ไม่ไป' ? 'ไม่ไป' : 'ยังไม่ระบุ'}" จะทำการยกเลิกสิทธิ์และลบรายชื่อออกจากกลุ่มห้องพักโดยอัตโนมัติ!
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRsvpCancelConfirm(null)}
                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmRsvpCancel}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold hover:shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ดำเนินการต่อ</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
