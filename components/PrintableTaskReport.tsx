import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SchoolTask, TaskSubmission, Profile, UserRole } from '../types';
import { isStaffTargetedByTask } from '../lib/taskHelpers';
import { printElementViaIsolatedFrame } from '../lib/printReportHelper';
import { 
  Printer, X, CheckCircle2, Clock, AlertCircle, Search, Filter, 
  CheckSquare, Square, Eye, EyeOff, LayoutGrid, FileText, Check, 
  ExternalLink, Sparkles, ChevronDown, Award
} from 'lucide-react';

interface Props {
  task: SchoolTask;
  allTasks?: SchoolTask[];
  staffList?: Profile[];
  items?: Array<{ teacher: Profile; submission?: TaskSubmission }>;
  submissions?: TaskSubmission[];
  stats?: {
    total: number;
    submittedCount: number;
    approvedCount: number;
    pendingCount: number;
    percent: number;
  };
  filterTitle?: string;
  principalProfile?: Profile;
  principalName?: string;
  onClose: () => void;
}

// Customizable columns configuration
interface ColumnConfig {
  id: string;
  label: string;
  enabled: boolean;
  minWidth?: string;
}

export const PrintableTaskReport: React.FC<Props> = ({
  task: initialTask,
  allTasks = [],
  staffList = [],
  items: directItems,
  submissions = [],
  filterTitle: propFilterTitle,
  principalProfile,
  principalName: propPrincipalName,
  onClose,
}) => {
  // Current active task in report
  const [currentTask, setCurrentTask] = useState<SchoolTask>(initialTask);
  const [reportMode, setReportMode] = useState<'single' | 'matrix'>('single');

  // Search & Filters inside Print Center
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'missing'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Multi-selection of teachers (which teachers are selected to print)
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Record<string, boolean>>({});

  // Customizable columns
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'seq', label: 'م', enabled: true },
    { id: 'name', label: 'اسم المعلم / المكلف', enabled: true },
    { id: 'subject', label: 'التخصص / المادة', enabled: true },
    { id: 'role', label: 'الوظيفة التعليمية', enabled: true },
    { id: 'status', label: 'حالة التسليم (✓ / ✗)', enabled: true },
    { id: 'date', label: 'تاريخ ووقت التسليم', enabled: true },
    { id: 'notes', label: 'رابط الشاهد / الملاحظات', enabled: true },
    { id: 'approval', label: 'توجيه واعتماد الإدارة', enabled: false },
    { id: 'signature', label: 'توقيع المعلم / الاستلام', enabled: true },
  ]);

  // Fallback to cached staff if staffList is empty
  const activeStaffList = useMemo<Profile[]>(() => {
    if (staffList && staffList.length > 0) return staffList;
    try {
      const cached = localStorage.getItem('local_school_staff_1448');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, [staffList]);

  // Tasks list (ensure initialTask is included)
  const availableTasks = useMemo<SchoolTask[]>(() => {
    if (allTasks && allTasks.length > 0) return allTasks;
    return [initialTask];
  }, [allTasks, initialTask]);

  // Filter tasks based on task search query
  const filteredTasksList = useMemo(() => {
    if (!taskSearchQuery.trim()) return availableTasks;
    const q = taskSearchQuery.toLowerCase();
    return availableTasks.filter(t => t.title.toLowerCase().includes(q) || (t.target_role && t.target_role.toLowerCase().includes(q)));
  }, [availableTasks, taskSearchQuery]);

  // Target staff for currentTask
  const taskTargetStaff = useMemo(() => {
    return activeStaffList.filter(s => isStaffTargetedByTask(s, currentTask));
  }, [activeStaffList, currentTask]);

  // Available subjects for filtering
  const availableSubjects = useMemo(() => {
    const list = taskTargetStaff.map(s => s.subject?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [taskTargetStaff]);

  // Target staff after applying filters (status, subject, role, search)
  const filteredStaffList = useMemo(() => {
    return taskTargetStaff.filter(teacher => {
      const sub = submissions.find(s => s.task_id === currentTask.id && s.teacher_id === teacher.id);
      const hasSubmitted = !!(sub?.drive_link && sub?.status !== 'pending');

      // Status filter
      if (submissionFilter === 'submitted' && !hasSubmitted) return false;
      if (submissionFilter === 'missing' && hasSubmitted) return false;

      // Subject filter
      if (selectedSubject !== 'all' && teacher.subject !== selectedSubject) return false;

      // Role filter
      if (selectedRole !== 'all' && teacher.role !== selectedRole) return false;

      // Teacher search query
      if (teacherSearchQuery.trim()) {
        const q = teacherSearchQuery.toLowerCase();
        const matchName = teacher.full_name?.toLowerCase().includes(q);
        const matchMobile = teacher.mobile?.includes(q);
        const matchSubj = teacher.subject?.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchSubj) return false;
      }

      return true;
    });
  }, [taskTargetStaff, submissions, currentTask, submissionFilter, selectedSubject, selectedRole, teacherSearchQuery]);

  // Initialize selectedTeacherIds when filteredStaffList changes
  const isAllSelected = useMemo(() => {
    if (filteredStaffList.length === 0) return false;
    return filteredStaffList.every(t => selectedTeacherIds[t.id] !== false);
  }, [filteredStaffList, selectedTeacherIds]);

  const selectedCount = useMemo(() => {
    return filteredStaffList.filter(t => selectedTeacherIds[t.id] !== false).length;
  }, [filteredStaffList, selectedTeacherIds]);

  // Staff items to actually render in the printable report
  const printItems = useMemo(() => {
    return filteredStaffList
      .filter(t => selectedTeacherIds[t.id] !== false)
      .map(teacher => {
        const sub = submissions.find(s => s.task_id === currentTask.id && s.teacher_id === teacher.id);
        return { teacher, submission: sub };
      });
  }, [filteredStaffList, selectedTeacherIds, submissions, currentTask]);

  // Stats for the active printable selection
  const activeStats = useMemo(() => {
    const total = printItems.length;
    const submittedCount = printItems.filter(i => i.submission?.drive_link && i.submission?.status !== 'pending').length;
    const approvedCount = printItems.filter(i => i.submission?.status === 'approved').length;
    const pendingCount = total - submittedCount;
    const percent = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
    return { total, submittedCount, approvedCount, pendingCount, percent };
  }, [printItems]);

  // Quick multi-selection actions
  const handleSelectAll = () => {
    const newSel: Record<string, boolean> = {};
    filteredStaffList.forEach(t => { newSel[t.id] = true; });
    setSelectedTeacherIds(newSel);
  };

  const handleDeselectAll = () => {
    const newSel: Record<string, boolean> = {};
    filteredStaffList.forEach(t => { newSel[t.id] = false; });
    setSelectedTeacherIds(newSel);
  };

  const handleSelectSubmittedOnly = () => {
    const newSel: Record<string, boolean> = {};
    filteredStaffList.forEach(t => {
      const sub = submissions.find(s => s.task_id === currentTask.id && s.teacher_id === t.id);
      newSel[t.id] = !!(sub?.drive_link && sub?.status !== 'pending');
    });
    setSelectedTeacherIds(newSel);
  };

  const handleSelectMissingOnly = () => {
    const newSel: Record<string, boolean> = {};
    filteredStaffList.forEach(t => {
      const sub = submissions.find(s => s.task_id === currentTask.id && s.teacher_id === t.id);
      newSel[t.id] = !(sub?.drive_link && sub?.status !== 'pending');
    });
    setSelectedTeacherIds(newSel);
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds(prev => ({
      ...prev,
      [teacherId]: prev[teacherId] === false ? true : false
    }));
  };

  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, enabled: !c.enabled } : c));
  };

  const effectivePrincipalName = principalProfile?.full_name || propPrincipalName || 'أ. فهد بن عبدالله الشهري';

  const currentDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Printing execution
  const [isPrinting, setIsPrinting] = useState(false);

  const handleExecutePrint = async () => {
    setIsPrinting(true);
    const title = reportMode === 'matrix' 
      ? 'المصفوفة الإشرافية الشاملة لتسليمات المهام' 
      : `كشف تسليمات - ${currentTask.title}`;
    
    await printElementViaIsolatedFrame('printable-report-canvas', title);
    setIsPrinting(false);
  };

  return createPortal(
    <div 
      id="printable-modal-container"
      className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[99999] flex flex-col font-cairo text-right print:static print:bg-white print:p-0 print:overflow-visible print:block printable-modal-overlay" 
      dir="rtl"
    >
      {/* ======================================================== */}
      {/* Control & Customization Toolbar (Hidden on Print) */}
      {/* ======================================================== */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 shadow-lg print:hidden no-print z-50">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Top Bar: Title & Main Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f4c4c] to-emerald-600 flex items-center justify-center text-white shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                  مركز الطباعة والفرز الذكي للمهام والشواهد (A4)
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    معاينة حية ومباشرة
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  تحكّم كامل في اختيار المهمة، فرز المعلمين، تخصيص الأعمدة، وطباعة كشف الحصر أو المصفوفة الشاملة.
                </p>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleExecutePrint}
                disabled={isPrinting || printItems.length === 0}
                className="bg-[#0f4c4c] hover:bg-[#134e4a] text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? 'جاري إعداد الطباعة...' : `طباعة الكشف الآن (${printItems.length} معلم)`}
              </button>

              <button
                onClick={onClose}
                className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200"
                title="إغلاق المعاينة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher & Task Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            {/* Report Mode Tabs */}
            <div className="lg:col-span-4 flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setReportMode('single')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition ${
                  reportMode === 'single'
                    ? 'bg-white text-[#0f4c4c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                كشف حصر المهمة المحددة
              </button>
              <button
                onClick={() => setReportMode('matrix')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition ${
                  reportMode === 'matrix'
                    ? 'bg-white text-[#0f4c4c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                المصفوفة الشاملة لكافة المهام
              </button>
            </div>

            {/* Task Search & Picker (Visible in Single Mode) */}
            {reportMode === 'single' && (
              <div className="lg:col-span-8 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث عن مهمة محددة..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-hidden font-bold"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                  {filteredTasksList.slice(0, 4).map((t) => {
                    const isSelected = t.id === currentTask.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setCurrentTask(t)}
                        className={`text-[11px] font-black px-3 py-1.5 rounded-xl border whitespace-nowrap transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f4c4c] text-white border-[#0f4c4c] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {t.title}
                      </button>
                    );
                  })}
                  {filteredTasksList.length > 4 && (
                    <select
                      value={currentTask.id}
                      onChange={(e) => {
                        const found = availableTasks.find(t => t.id === e.target.value);
                        if (found) setCurrentTask(found);
                      }}
                      className="text-[11px] font-bold py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden"
                    >
                      {filteredTasksList.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtering & Selection Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
            {/* Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> الفرز حسب:
              </span>

              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setSubmissionFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                    submissionFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل ({taskTargetStaff.length})
                </button>
                <button
                  onClick={() => setSubmissionFilter('submitted')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                    submissionFilter === 'submitted' ? 'bg-emerald-700 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" /> أرسلوا فقط
                </button>
                <button
                  onClick={() => setSubmissionFilter('missing')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
                    submissionFilter === 'missing' ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <X className="w-3 h-3 stroke-[3]" /> لم يرسلوا فقط
                </button>
              </div>

              {/* Subject Filter */}
              {availableSubjects.length > 0 && (
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 py-1 px-2.5 rounded-xl font-bold text-[11px] focus:outline-hidden"
                >
                  <option value="all">كافة التخصصات ({availableSubjects.length})</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              )}

              {/* Teacher Search */}
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
                <input
                  type="text"
                  placeholder="ابحث باسم المعلم..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  className="w-full pl-2 pr-7 py-1 text-[11px] bg-white border border-slate-200 rounded-xl font-bold focus:outline-hidden"
                />
              </div>
            </div>

            {/* Multi-Selection Controls */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">
                المحدد للطباعة: <strong className="text-emerald-800 font-black">{selectedCount}</strong> من {filteredStaffList.length}
              </span>
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition"
              >
                تحديد الكل
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          {/* Columns Customization Toggles (in Single mode) */}
          {reportMode === 'single' && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                أعمدة الكشف:
              </span>
              {columns.map(col => (
                <button
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    col.enabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-400 border-slate-200 line-through'
                  }`}
                >
                  {col.enabled ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3" />}
                  {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* The Printable Page Canvas (A4 Styled Document) */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center print:overflow-visible print:p-0 print:block">
        <div 
          id="printable-report-canvas"
          className="printable-area bg-white w-full max-w-5xl min-h-[297mm] p-8 md:p-12 rounded-3xl shadow-2xl print:shadow-none print:rounded-none print:w-full print:max-w-none print:min-h-0 print:p-2 text-slate-900 border print:border-none border-slate-200 my-auto print:my-0"
        >
          {/* Official Ministry Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-6">
            <div className="text-right space-y-1 text-xs md:text-sm font-black text-slate-800">
              <p>المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-emerald-800 font-black">ثانوية الأمير عبدالمجيد الأولى</p>
              <p className="text-[11px] text-slate-500 font-bold">العام الدراسي: 1448هـ</p>
            </div>

            <div className="text-center space-y-1.5 flex flex-col items-center">
              <img 
                src="/moe_logo.png" 
                onError={(e) => { e.currentTarget.src = "https://up6.cc/2026/01/176840436497671.png"; }}
                className="h-14 md:h-16 object-contain mx-auto drop-shadow-xs" 
                alt="شعار وزارة التعليم" 
              />
              <h1 className="text-base md:text-lg font-black text-slate-900">
                {reportMode === 'matrix' 
                  ? 'المصفوفة الإشرافية الشاملة لحصر وتسليمات المهام والشواهد' 
                  : 'كشف حصر ومتابعة تسليمات المهمة المدرسية'}
              </h1>
              <p className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-0.5 rounded-full inline-block border border-slate-200">
                {reportMode === 'matrix'
                  ? `مصفوفة كافة المهام الفصلية (${availableTasks.length} مهمة)`
                  : `${currentTask.title} — ${propFilterTitle || 'كافة المستهدفين'}`}
              </p>
            </div>

            <div className="text-left space-y-1 text-xs font-bold text-slate-600">
              <p>تاريخ الطباعة: <span className="font-mono text-slate-900">{currentDate}</span></p>
              {reportMode === 'single' && (
                <>
                  <p>آخر موعد: <span className="font-mono text-slate-900">{currentTask.due_date || 'غير محدد'}</span></p>
                  <p>المستهدفون: <span className="text-emerald-800 font-black">{currentTask.target_role || 'كافة منسوبي المدرسة'}</span></p>
                </>
              )}
              <p className="text-[10px] text-slate-400">نظام إتقان 2.0 لإدارة الأداء الوظيفي</p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MODE 1: SINGLE TASK DETAILED REPORT */}
          {/* ======================================================== */}
          {reportMode === 'single' && (
            <>
              {/* Task Details & Statistics Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">المهمة / المتطلب الفصلي:</span>
                  <h2 className="text-base md:text-lg font-black text-slate-900">{currentTask.title}</h2>
                  {currentTask.description && (
                    <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">{currentTask.description}</p>
                  )}
                </div>

                {/* Quick Stats Grid */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-center min-w-[70px]">
                    <span className="text-[10px] text-slate-500 block font-bold">المستهدفون</span>
                    <span className="text-sm font-black text-slate-800">{activeStats.total}</span>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-emerald-200 text-center min-w-[70px]">
                    <span className="text-[10px] text-emerald-600 block font-bold">أرسلوا (✓)</span>
                    <span className="text-sm font-black text-emerald-700">{activeStats.submittedCount}</span>
                  </div>
                  <div className="bg-white px-3 py-2 rounded-xl border border-rose-200 text-center min-w-[70px]">
                    <span className="text-[10px] text-rose-600 block font-bold">لم يرسلوا (✗)</span>
                    <span className="text-sm font-black text-rose-700">{activeStats.pendingCount}</span>
                  </div>
                  <div className="bg-[#0f4c4c] text-white px-3.5 py-2 rounded-xl text-center min-w-[75px]">
                    <span className="text-[10px] text-emerald-200 block font-bold">نسبة الإنجاز</span>
                    <span className="text-sm font-black">{activeStats.percent}%</span>
                  </div>
                </div>
              </div>

              {/* Records Table with Active Custom Columns */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-right border-collapse text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                      {/* Selection Checkbox (Screen Only) */}
                      <th className="py-2.5 px-2 w-8 text-center border-l border-slate-300 print:hidden no-print">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAll();
                            else handleDeselectAll();
                          }}
                          className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                      </th>

                      {columns.find(c => c.id === 'seq')?.enabled && (
                        <th className="py-2.5 px-3 w-10 text-center border-l border-slate-300">م</th>
                      )}
                      {columns.find(c => c.id === 'name')?.enabled && (
                        <th className="py-2.5 px-3 border-l border-slate-300">اسم المعلم / المكلف</th>
                      )}
                      {columns.find(c => c.id === 'subject')?.enabled && (
                        <th className="py-2.5 px-3 border-l border-slate-300">التخصص / المادة</th>
                      )}
                      {columns.find(c => c.id === 'role')?.enabled && (
                        <th className="py-2.5 px-3 border-l border-slate-300">الصفة التعليمية</th>
                      )}
                      {columns.find(c => c.id === 'status')?.enabled && (
                        <th className="py-2.5 px-3 text-center border-l border-slate-300">حالة التسليم</th>
                      )}
                      {columns.find(c => c.id === 'date')?.enabled && (
                        <th className="py-2.5 px-3 text-center border-l border-slate-300">تاريخ التسليم</th>
                      )}
                      {columns.find(c => c.id === 'notes')?.enabled && (
                        <th className="py-2.5 px-3 border-l border-slate-300">رابط الشاهد وملاحظات المعلم</th>
                      )}
                      {columns.find(c => c.id === 'approval')?.enabled && (
                        <th className="py-2.5 px-3 border-l border-slate-300">اعتماد وتوجيه الإدارة</th>
                      )}
                      {columns.find(c => c.id === 'signature')?.enabled && (
                        <th className="py-2.5 px-3 text-center w-28 border-slate-300">التوقيع / الاستلام</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {printItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                          لا توجد سجلات مطابقة للفرز والتحديد الحالي. يرجى اختيار معلمين من شريط الأدوات أعلاه.
                        </td>
                      </tr>
                    ) : (
                      printItems.map((item, idx) => {
                        const isSubmitted = !!(item.submission?.drive_link && item.submission?.status !== 'pending');
                        const isApproved = item.submission?.status === 'approved';

                        return (
                          <tr key={item.teacher.id} className="hover:bg-slate-50/50">
                            {/* Screen checkbox */}
                            <td className="py-2 px-2 text-center border-l border-slate-200 print:hidden no-print">
                              <input
                                type="checkbox"
                                checked={selectedTeacherIds[item.teacher.id] !== false}
                                onChange={() => toggleTeacherSelection(item.teacher.id)}
                                className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            {/* Seq */}
                            {columns.find(c => c.id === 'seq')?.enabled && (
                              <td className="py-2 px-3 text-center border-l border-slate-200 font-mono text-slate-500">
                                {idx + 1}
                              </td>
                            )}

                            {/* Teacher Name */}
                            {columns.find(c => c.id === 'name')?.enabled && (
                              <td className="py-2 px-3 border-l border-slate-200 font-black text-slate-900">
                                {item.teacher.full_name}
                              </td>
                            )}

                            {/* Subject */}
                            {columns.find(c => c.id === 'subject')?.enabled && (
                              <td className="py-2 px-3 border-l border-slate-200 text-slate-700">
                                {item.teacher.subject || 'عام'}
                              </td>
                            )}

                            {/* Role */}
                            {columns.find(c => c.id === 'role')?.enabled && (
                              <td className="py-2 px-3 border-l border-slate-200 text-slate-600 text-[11px]">
                                {item.teacher.role || 'معلم'}
                              </td>
                            )}

                            {/* Status: Explicit ✓ / ✗ */}
                            {columns.find(c => c.id === 'status')?.enabled && (
                              <td className="py-2 px-3 text-center border-l border-slate-200 whitespace-nowrap">
                                {isSubmitted ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                                    {isApproved ? 'معتمد' : 'تم الإرسال'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-300">
                                    <X className="w-3.5 h-3.5 stroke-[3] text-rose-600" />
                                    لم يتم الإرسال
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Submission Date */}
                            {columns.find(c => c.id === 'date')?.enabled && (
                              <td className="py-2 px-3 text-center border-l border-slate-200 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                {item.submission?.submitted_at
                                  ? new Date(item.submission.submitted_at).toLocaleDateString('ar-SA')
                                  : '—'}
                              </td>
                            )}

                            {/* Notes / Drive Link */}
                            {columns.find(c => c.id === 'notes')?.enabled && (
                              <td className="py-2 px-3 border-l border-slate-200 text-[11px] text-slate-600 max-w-[200px] truncate">
                                {item.submission?.teacher_notes || (item.submission?.drive_link ? 'تم إرفاق رابط الشاهد' : '—')}
                              </td>
                            )}

                            {/* Approval Feedback */}
                            {columns.find(c => c.id === 'approval')?.enabled && (
                              <td className="py-2 px-3 border-l border-slate-200 text-[11px] text-slate-700">
                                {item.submission?.principal_feedback || (isApproved ? 'معتمد ومقبول' : '—')}
                              </td>
                            )}

                            {/* Signature Line */}
                            {columns.find(c => c.id === 'signature')?.enabled && (
                              <td className="py-2 px-3 text-center border-slate-200">
                                <div className="h-6 border-b border-dotted border-slate-300 w-full" />
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* MODE 2: ALL TASKS CUMULATIVE MATRIX (المصفوفة الشاملة) */}
          {/* ======================================================== */}
          {reportMode === 'matrix' && (
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-right border-collapse text-[11px] border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                    <th className="py-2 px-2 text-center w-8 border-l border-slate-300">م</th>
                    <th className="py-2 px-3 border-l border-slate-300 min-w-[140px]">اسم المعلم</th>
                    <th className="py-2 px-2 border-l border-slate-300 text-center">التخصص</th>
                    {/* Columns for each task */}
                    {availableTasks.map((t, tIdx) => (
                      <th key={t.id} className="py-2 px-2 text-center border-l border-slate-300 max-w-[110px]" title={t.title}>
                        <div className="truncate font-black">م{tIdx + 1}: {t.title.slice(0, 16)}</div>
                      </th>
                    ))}
                    <th className="py-2 px-2 text-center border-l border-slate-300 bg-emerald-50 text-emerald-950 font-black">
                      المنجز
                    </th>
                    <th className="py-2 px-2 text-center bg-slate-200 text-slate-900 font-black">
                      النسبة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-bold">
                  {filteredStaffList
                    .filter(t => selectedTeacherIds[t.id] !== false)
                    .map((teacher, idx) => {
                      let teacherSubmittedTasks = 0;
                      let teacherTotalTasks = 0;

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2 text-center border-l border-slate-200 font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 border-l border-slate-200 font-black text-slate-900">
                            {teacher.full_name}
                          </td>
                          <td className="py-1.5 px-2 border-l border-slate-200 text-center text-slate-600">
                            {teacher.subject || 'عام'}
                          </td>

                          {/* Each Task Cell with ✓ or ✗ */}
                          {availableTasks.map((t) => {
                            const isTargeted = isStaffTargetedByTask(teacher, t);
                            if (isTargeted) teacherTotalTasks++;

                            const sub = submissions.find(s => s.task_id === t.id && s.teacher_id === teacher.id);
                            const isSubmitted = !!(sub?.drive_link && sub?.status !== 'pending');
                            if (isTargeted && isSubmitted) teacherSubmittedTasks++;

                            if (!isTargeted) {
                              return (
                                <td key={t.id} className="py-1.5 px-2 text-center border-l border-slate-200 text-slate-300 bg-slate-50/50">
                                  —
                                </td>
                              );
                            }

                            return (
                              <td key={t.id} className="py-1.5 px-2 text-center border-l border-slate-200">
                                {isSubmitted ? (
                                  <span className="inline-block text-emerald-700 font-black text-xs">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-block text-rose-600 font-black text-xs">
                                    ✗
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Summary numbers */}
                          <td className="py-1.5 px-2 text-center border-l border-slate-200 font-mono font-black text-emerald-800 bg-emerald-50/50">
                            {teacherSubmittedTasks} / {teacherTotalTasks}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-black text-slate-800">
                            {teacherTotalTasks > 0 ? Math.round((teacherSubmittedTasks / teacherTotalTasks) * 100) : 0}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Official Footer and Signatures */}
          <div className="pt-6 border-t-2 border-slate-800 flex justify-end">
            <div className="text-center min-w-[240px] space-y-3">
              <p className="text-xs font-black text-slate-900">يعتمد مدير المدرسة</p>
              <p className="text-sm font-black text-[#0f4c4c]">{effectivePrincipalName}</p>
              <div className="pt-6">
                <div className="border-b border-dotted border-slate-400 w-44 mx-auto" />
                <p className="text-[10px] text-slate-400 font-bold mt-1">التوقيع والاعتماد الرسمي</p>
              </div>
            </div>
          </div>

          {/* System Watermark */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold">
            <span>نظام إتقان 2.0 لإدارة الأداء الوظيفي والإشراف المدرسي — ثانوية الأمير عبدالمجيد الأولى</span>
            <span>وثيقة معتمدة ومطابقة للنماذج الوزارية 1448هـ</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
