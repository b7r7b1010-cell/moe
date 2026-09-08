import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, SchoolTask, TaskSubmission, UserRole } from '../types';
import { INITIAL_SCHOOL_TASKS } from '../lib/schoolTasksData';
import { 
  isStaffTargetedByTask, 
  TARGET_ROLE_OPTIONS, 
  generateSafeUUID, 
  withTimeout 
} from '../lib/taskHelpers';
import { PrintableTaskReport } from './PrintableTaskReport';
import { 
  ClipboardList, Plus, Calendar, Clock, CheckCircle2, 
  AlertCircle, ExternalLink, MessageSquare, Send, Trash2, 
  Users, Check, X, RefreshCw, Copy, ChevronDown, ChevronUp,
  FolderCheck, Sparkles, Filter, Smartphone, CheckCheck, Printer, Search
} from 'lucide-react';

interface TaskSubmissionsManagerProps {
  staff: Profile[];
  principalProfile: Profile;
}

export const TaskSubmissionsManager: React.FC<TaskSubmissionsManagerProps> = ({ staff, principalProfile }) => {
  const [tasks, setTasks] = useState<SchoolTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [copiedReminder, setCopiedReminder] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTargetRole, setNewTargetRole] = useState<string>('الكل');
  const [savingTask, setSavingTask] = useState(false);

  // Feedback input state per submission
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});

  // Quick suggestions for tasks in Saudi schools
  const QUICK_TEMPLATES = [
    { title: 'توزيع المنهج والخطة الفصلية للعام 1448هـ', desc: 'يرجى إرفاق خطة توزيع المنهج المعتمدة والخطط الأسبوعية.' },
    { title: 'نتائج وتحليل الاختبار التشخيصي للطلاب', desc: 'رفع تقرير رصد وتحليل نتائج الاختبار التشخيصي وتحديد الفاقد التعليمي.' },
    { title: 'خطة معالجة الفاقد التعليمي والطلاب المتعثرين', desc: 'إرفاق الخطة العلاجية والأنشطة الإثرائية المنفذة.' },
    { title: 'نماذج أسئلة الاختبارات وسلالم التصحيح', desc: 'يرجى إرفاق نماذج الأسئلة ونماذج الإجابة المعتمدة ومصفوفة الاختبار.' },
    { title: 'تقرير إنجاز المنهج الدراسي بنهاية الفصل', desc: 'إرفاق تقرير إنهاء مفردات المقرر ونسب إنجاز المعايير.' }
  ];

  useEffect(() => {
    fetchData();

    // Listen for realtime updates on tasks and submissions
    const tasksChannel = supabase
      .channel('tasks_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      let loadedTasks = (!tasksError && tasksData) ? tasksData : [];

      if (loadedTasks.length === 0) {
        const localTasks = localStorage.getItem('local_school_tasks_1448');
        if (localTasks) {
          try {
            loadedTasks = JSON.parse(localTasks);
          } catch (e) {}
        }
      }

      if (loadedTasks.length === 0) {
        loadedTasks = INITIAL_SCHOOL_TASKS;
        localStorage.setItem('local_school_tasks_1448', JSON.stringify(INITIAL_SCHOOL_TASKS));
        try {
          await supabase.from('tasks').upsert(INITIAL_SCHOOL_TASKS);
        } catch (e) {}
      }

      setTasks(loadedTasks);
      if (loadedTasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(loadedTasks[0].id);
      }

      // 2. Fetch submissions
      const { data: subsData, error: subsError } = await supabase
        .from('task_submissions')
        .select('*');

      if (!subsError && subsData) {
        setSubmissions(subsData);
      } else {
        const localSubs = localStorage.getItem('local_school_submissions_1448');
        if (localSubs) {
          setSubmissions(JSON.parse(localSubs));
        }
      }
    } catch (e) {
      console.warn('Tasks data fetch fallback:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('الرجاء كتابة عنوان المهمة.');
      return;
    }

    setSavingTask(true);
    const safeTaskId = generateSafeUUID();
    const newTask: SchoolTask = {
      id: safeTaskId,
      title: newTitle.trim(),
      description: newDescription.trim(),
      due_date: newDueDate || undefined,
      academic_year: '1448هـ',
      is_active: true,
      target_role: newTargetRole,
      created_at: new Date().toISOString()
    };

    // 1. Optimistic Local State Update (0ms)
    const updated = [newTask, ...tasks];
    setTasks(updated);
    localStorage.setItem('local_school_tasks_1448', JSON.stringify(updated));

    // 2. Background push to Supabase with timeout
    withTimeout(supabase.from('tasks').insert([newTask]), 2500).catch(() => {});

    // Also send in-app school notification for targeted staff
    try {
      withTimeout(
        supabase.from('notifications').insert([{
          id: `notif_task_${safeTaskId}`,
          title: `مهمة جديدة: ${newTask.title}`,
          message: newTask.description || `تم إدراج متطلب جديد بالمنصة (${newTask.title}) يرجى رفع الشاهد المطلوب.`,
          type: 'urgent',
          sender_name: principalProfile.full_name || 'مدير المدرسة',
          created_at: new Date().toISOString()
        }]),
        2000
      ).catch(() => {});
    } catch (ne) {}

    setSelectedTaskId(newTask.id);
    setShowAddModal(false);
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setNewTargetRole('الكل');
    setSavingTask(false);
    alert('✅ تم نشر المهمة وإشعار المعلمين بها بنجاح!');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة وجميع التسليمات المرتبطة بها؟')) return;

    try {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      setTasks(updatedTasks);
      localStorage.setItem('local_school_tasks_1448', JSON.stringify(updatedTasks));

      const updatedSubs = submissions.filter(s => s.task_id !== taskId);
      setSubmissions(updatedSubs);
      localStorage.setItem('local_school_submissions_1448', JSON.stringify(updatedSubs));

      if (selectedTaskId === taskId) {
        setSelectedTaskId(updatedTasks.length > 0 ? updatedTasks[0].id : null);
      }

      await withTimeout(supabase.from('tasks').delete().eq('id', taskId), 2500);
      await withTimeout(supabase.from('task_submissions').delete().eq('task_id', taskId), 2500);
    } catch (e: any) {
      console.warn('Delete task sync note:', e);
    }
  };

  const handleToggleTaskStatus = async (task: SchoolTask) => {
    const updated = !task.is_active;
    const updatedTasks = tasks.map(t => (t.id === task.id ? { ...t, is_active: updated } : t));
    setTasks(updatedTasks);
    localStorage.setItem('local_school_tasks_1448', JSON.stringify(updatedTasks));

    try {
      await withTimeout(supabase.from('tasks').update({ is_active: updated }).eq('id', task.id), 2500);
    } catch (e) {
      console.warn('Toggle status offline update preserved in localStorage');
    }
  };

  const handleUpdateSubmissionStatus = async (
    submissionId: string | null,
    taskId: string,
    teacherId: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    setActionLoadingId(teacherId);
    const feedback = feedbackInputs[teacherId] || '';
    const existingSub = submissions.find(s => s.task_id === taskId && s.teacher_id === teacherId);
    const targetId = submissionId || existingSub?.id || generateSafeUUID();
    const driveLink = existingSub?.drive_link || '';

    try {
      let savedData: TaskSubmission | null = null;

      // إذا كان السجل موجوداً في قاعدة البيانات نقوم بتحديث الحالة والملاحظات مباشرة
      if (submissionId || existingSub?.id) {
        const idToUpdate = submissionId || existingSub?.id;
        const { data, error } = await supabase
          .from('task_submissions')
          .update({
            status: newStatus,
            principal_feedback: feedback,
            updated_at: new Date().toISOString()
          })
          .eq('id', idToUpdate)
          .select()
          .maybeSingle();

        if (!error && data) {
          savedData = data;
        } else if (error) {
          console.warn('Direct update fallback to upsert:', error.message);
        }
      }

      // إذا لم يتوفر بعد أو حدثت حاجة لإنشائه
      if (!savedData) {
        const payload: any = {
          id: targetId,
          task_id: taskId,
          teacher_id: teacherId,
          drive_link: driveLink,
          status: newStatus,
          principal_feedback: feedback,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('task_submissions')
          .upsert(payload)
          .select()
          .maybeSingle();

        if (!error && data) {
          savedData = data;
        }
      }

      // تحديث الحالة في الواجهة فوراً
      const finalSub: TaskSubmission = savedData || {
        id: targetId,
        task_id: taskId,
        teacher_id: teacherId,
        drive_link: driveLink,
        status: newStatus,
        principal_feedback: feedback,
        submitted_at: existingSub?.submitted_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setSubmissions(prev => {
        const idx = prev.findIndex(s => s.task_id === taskId && s.teacher_id === teacherId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = finalSub;
          return copy;
        }
        return [...prev, finalSub];
      });

      // حفظ نسخة احتياطية في التخزين المحلي
      try {
        const existingAll = JSON.parse(localStorage.getItem('local_school_submissions_1448') || '[]');
        const filteredAll = existingAll.filter((s: TaskSubmission) => !(s.task_id === taskId && s.teacher_id === teacherId));
        localStorage.setItem('local_school_submissions_1448', JSON.stringify([...filteredAll, finalSub]));
      } catch (e) {}

      alert(newStatus === 'approved' ? '✅ تم اعتماد الشاهد وحفظه في السجلات بنجاح!' : '⚠️ تم تسجيل طلب التعديل وتوجيه الملاحظة للمعلم.');
    } catch (e: any) {
      alert('خطأ أثناء التحديث: ' + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Target staff for the selected task (comprehensively covers all 3 teacher roles)
  const targetStaff = staff.filter(s => isStaffTargetedByTask(s, selectedTask));

  // Extract list of subjects present in target staff for the filter dropdown
  const availableSubjects = Array.from(
    new Set(targetStaff.map(s => s.subject?.trim()).filter(Boolean))
  ) as string[];

  // Calculate task statistics
  const getTaskStats = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const assignedStaff = staff.filter(s => isStaffTargetedByTask(s, task));

    const taskSubs = submissions.filter(s => s.task_id === taskId);
    const submittedCount = taskSubs.filter(s => s.drive_link && s.status !== 'pending').length;
    const approvedCount = taskSubs.filter(s => s.status === 'approved').length;
    const pendingCount = Math.max(0, assignedStaff.length - submittedCount);
    const percent = assignedStaff.length > 0 ? Math.round((submittedCount / assignedStaff.length) * 100) : 0;

    return { total: assignedStaff.length, submittedCount, approvedCount, pendingCount, percent };
  };

  const currentStats = selectedTask ? getTaskStats(selectedTask.id) : { total: 0, submittedCount: 0, approvedCount: 0, pendingCount: 0, percent: 0 };

  // Filtered staff for submission table with multi-factor sorting & search
  const getFilteredStaffForTask = () => {
    if (!selectedTask) return [];

    return targetStaff.filter(teacher => {
      const sub = submissions.find(s => s.task_id === selectedTask.id && s.teacher_id === teacher.id);
      const isSubmitted = !!sub?.drive_link;
      const status = sub?.status || 'pending';

      // 1. Status Filter
      if (statusFilter === 'submitted' && (!isSubmitted || status === 'approved')) return false;
      if (statusFilter === 'approved' && status !== 'approved') return false;
      if (statusFilter === 'rejected' && status !== 'rejected') return false;
      if (statusFilter === 'pending' && (isSubmitted && status !== 'pending')) return false;

      // 2. Role Filter
      if (roleFilter !== 'all' && teacher.role !== roleFilter) return false;

      // 3. Subject Filter
      if (subjectFilter !== 'all' && teacher.subject !== subjectFilter) return false;

      // 4. Search Query (Name, Subject, or Mobile)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = teacher.full_name?.toLowerCase().includes(q);
        const subjectMatch = teacher.subject?.toLowerCase().includes(q);
        const mobileMatch = teacher.mobile?.includes(q);
        if (!nameMatch && !subjectMatch && !mobileMatch) return false;
      }

      return true;
    });
  };

  // Human-readable title for the print sheet depending on active filter
  const getPrintFilterTitle = () => {
    const parts: string[] = [];
    if (statusFilter === 'pending') parts.push('حصر المتأخرين عن تسليم الشاهد');
    else if (statusFilter === 'approved') parts.push('كشف التسليمات المعتمدة رسمياً');
    else if (statusFilter === 'submitted') parts.push('كشف التسليمات قيد المراجعة');
    else if (statusFilter === 'rejected') parts.push('كشف التسليمات المطلوب تعديلها');
    else parts.push('كشف المتابعة الشامل للتسليمات');

    if (roleFilter !== 'all') parts.push(`فئة: ${roleFilter}`);
    if (subjectFilter !== 'all') parts.push(`تخصص: ${subjectFilter}`);
    if (searchQuery.trim()) parts.push(`بحث: "${searchQuery.trim()}"`);

    return parts.join(' — ');
  };

  const copyLateReminderWhatsApp = () => {
    if (!selectedTask) return;
    try {
      const lateTeachers = (targetStaff || []).filter(teacher => {
        const sub = (submissions || []).find(s => s.task_id === selectedTask.id && s.teacher_id === teacher.id);
        return !sub?.drive_link || sub.status === 'pending';
      });

      const deadlineText = selectedTask.due_date ? `والمحدد بتاريخ: ${selectedTask.due_date}` : '';
      const namesList = lateTeachers.length > 0
        ? lateTeachers.map((t, i) => `${i + 1}. أ. ${t.full_name} (${t.subject || t.role})`).join('\n')
        : 'الجميع قام بالتسليم بارك الله فيكم ✨';

      const msg = `السلام عليكم ورحمة الله وبركاته، الزملاء الكرام في ثانوية الأمير عبدالمجيد الأولى 🌿\n\nنذكّركم بسرعة إرفاق شواهد المهمة:\n📌 *${selectedTask.title}*\n${deadlineText}\n\nنأمل من الزملاء الكرام المبادرة برفع الرابط عبر المنصة:\n${namesList}\n\nشاكرين ومقدرين جهودكم المستمرة لخدمة أبنائنا الطلاب وتوثيق الأداء المتميز ✨\nإدارة المدرسة`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(() => {
          setCopiedReminder(true);
          setTimeout(() => setCopiedReminder(false), 3000);
        }).catch(() => {
          fallbackCopy(msg);
        });
      } else {
        fallbackCopy(msg);
      }
    } catch (e) {
      console.warn('Error in copyLateReminderWhatsApp:', e);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedReminder(true);
      setTimeout(() => setCopiedReminder(false), 3000);
    } catch (err) {
      prompt('يرجى نسخ رسالة التذكير يدوياً:', text);
    }
  };

  return (
    <div className="space-y-8 text-right font-cairo" dir="rtl">
      
      {/* الترويسة الرئيسية والإجراءات */}
      <div className="bg-gradient-to-l from-[#0f4c4c] to-[#164e63] p-6 md:p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            المتابعة الإشرافية المستمرة 1448هـ
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">المهام والمحطات المجدولة وتسليمات الروابط</h2>
          <p className="text-emerald-100/80 text-sm max-w-2xl leading-relaxed">
            حدد المتطلبات الفصلية، واطلب الشواهد من المعلمين (توزيع المنهج، الاختبارات التشخيصية، نماذج الاختبارات)، وتابع نسب التسليم واعتمدها لحظياً.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-6 py-3.5 rounded-2xl font-black text-sm shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2 shrink-0 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          إضافة مهمة / متطلب جديد
        </button>
      </div>

      {/* شريط المهام المتاحة (Cards Grid) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#0f4c4c]" />
            قائمة المهام الفصلية ({tasks.length})
          </h3>
          <span className="text-xs text-slate-400 font-bold">انقر على أي مهمة لاستعراض تسليمات المعلمين</span>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-700">لا توجد مهام مجدولة مضافة حتى الآن</h4>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              ابدأ الآن بإنشاء أول مهمة فصلية (مثل: توزيع المنهج، الاختبار التشخيصي) ليقوم المعلمون برفع شواهدهم فوراً.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#0f4c4c] text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-[#164e63] transition shadow"
            >
              + إضافة أول مهمة الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map(task => {
              const stats = getTaskStats(task.id);
              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-5 rounded-[2rem] bg-white border-2 cursor-pointer transition-all shadow-md relative overflow-hidden flex flex-col justify-between gap-4 ${
                    isSelected
                      ? 'border-[#0f4c4c] ring-4 ring-[#0f4c4c]/10 bg-slate-50/50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        task.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {task.is_active ? 'متاحة للتسليم 🟢' : 'مغلقة ⚪'}
                      </span>
                      {task.target_role && task.target_role !== 'الكل' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {task.target_role}
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-slate-800 text-base leading-snug line-clamp-2">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {/* شريط نسبة التسليم */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-slate-500">نسبة التسليم:</span>
                        <span className="text-[#0f4c4c] font-black">{stats.percent}% ({stats.submittedCount} من {stats.total})</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold">
                      {task.due_date ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> الموعد: {task.due_date}
                        </span>
                      ) : (
                        <span>بدون موعد نهائي</span>
                      )}

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          title={task.is_active ? 'إغلاق المهمة' : 'إعادة فتح المهمة'}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          title="حذف المهمة"
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* تفاصيل تسليمات المهمة المحددة */}
      {selectedTask && (
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-200 space-y-6">
          
          {/* ترويسة تفاصيل المهمة */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-black text-slate-800">{selectedTask.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  selectedTask.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedTask.is_active ? 'متاحة للتسليم' : 'مغلقة'}
                </span>
                {selectedTask.due_date && (
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> آخر موعد: {selectedTask.due_date}
                  </span>
                )}
              </div>
              {selectedTask.description && (
                <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">{selectedTask.description}</p>
              )}
            </div>

            {/* أزرار الإجراءات السريعة والطباعة */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowPrintReport(true)}
                className="bg-[#0f4c4c] hover:bg-[#134e4a] text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                طباعة كشف حصر وتسليمات المهمة 🖨️
              </button>

              <button
                onClick={copyLateReminderWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                {copiedReminder ? <CheckCheck className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                {copiedReminder ? 'تم نسخ الرسالة!' : 'نسخ تذكير واتساب للمتأخرين'}
              </button>
            </div>
          </div>

          {/* كروت الإحصائيات الفرعية لهذه المهمة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs font-bold text-slate-400">إجمالي المطلوب منهم</p>
              <p className="text-2xl font-black text-slate-800">{currentStats.total}</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <p className="text-xs font-bold text-blue-600">قاموا بالتسليم</p>
              <p className="text-2xl font-black text-blue-700">{currentStats.submittedCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-xs font-bold text-emerald-600">تم اعتمادهم</p>
              <p className="text-2xl font-black text-emerald-700">{currentStats.approvedCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <p className="text-xs font-bold text-rose-600">لم يسلموا بعد</p>
              <p className="text-2xl font-black text-rose-700">{currentStats.pendingCount}</p>
            </div>
          </div>

          {/* شريط الفرز والبحث المتقدم الشامل للمدير */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* حقل البحث السريع بالاسم أو التخصص أو الهاتف */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="بحث سريع باسم المعلم أو التخصص..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#0f4c4c] bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-3 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* تصفية التخصص الدراسي */}
              <div>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#0f4c4c] bg-white"
                >
                  <option value="all">كافة التخصصات والمواد ({availableSubjects.length})</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* تصفية الفئة والدور الوظيفي */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-[#0f4c4c] bg-white"
                >
                  <option value="all">كافة الفئات الوظيفية</option>
                  <option value={UserRole.TEACHER}>معلم مادة (تعليمي)</option>
                  <option value={UserRole.TEACHER_ACTIVITY}>معلم رائد نشاط</option>
                  <option value={UserRole.TEACHER_HEALTH}>معلم موجه صحي</option>
                  <option value={UserRole.COUNSELOR}>موجه طلابي</option>
                  <option value={UserRole.LAB_ASSISTANT}>محضر مختبر</option>
                </select>
              </div>
            </div>

            {/* أزرار تصفية حالة التسليم */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1">
              {[
                { id: 'all', label: `الكل (${targetStaff.length})` },
                { id: 'submitted', label: `بانتظار المراجعة (${Math.max(0, currentStats.submittedCount - currentStats.approvedCount)})` },
                { id: 'approved', label: `المعتمدون (${currentStats.approvedCount})` },
                { id: 'rejected', label: `طلب تعديل` },
                { id: 'pending', label: `المتأخرون عن التسليم (${currentStats.pendingCount})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-[#0f4c4c] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {(searchQuery || roleFilter !== 'all' || subjectFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('all');
                    setSubjectFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs font-black text-rose-600 hover:underline px-2 whitespace-nowrap"
                >
                  إعادة ضبط الفلاتر ↺
                </button>
              )}
            </div>
          </div>

          {/* جدول تسليمات المعلمين */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-400 text-xs font-black">
                  <th className="py-3.5 px-3">المعلم والتخصص</th>
                  <th className="py-3.5 px-3">حالة التسليم</th>
                  <th className="py-3.5 px-3">رابط الشاهد</th>
                  <th className="py-3.5 px-3">ملاحظة وتوجيه المدير</th>
                  <th className="py-3.5 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {getFilteredStaffForTask().map(teacher => {
                  const sub = submissions.find(s => s.task_id === selectedTask.id && s.teacher_id === teacher.id);
                  const isSubmitted = !!sub?.drive_link;
                  const status = sub?.status || 'pending';
                  const isActing = actionLoadingId === teacher.id;

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800">{teacher.full_name}</div>
                        <div className="text-xs text-slate-400">{teacher.role} {teacher.subject ? `• ${teacher.subject}` : ''}</div>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        {status === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                            <Check className="w-3.5 h-3.5" /> معتمد
                          </span>
                        )}
                        {status === 'submitted' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                            <Clock className="w-3.5 h-3.5" /> تم التسليم
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                            <AlertCircle className="w-3.5 h-3.5" /> يحتاج تعديل
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                            لم يسلم بعد
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-3">
                        {isSubmitted ? (
                          <div className="space-y-1">
                            <a
                              href={sub.drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> فتح ملف الشاهد
                            </a>
                            {sub.teacher_notes && (
                              <p className="text-[11px] text-slate-400 italic max-w-xs truncate" title={sub.teacher_notes}>
                                ملاحظة المعلم: {sub.teacher_notes}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">لا يوجد رابط</span>
                        )}
                      </td>

                      <td className="py-4 px-3">
                        <input
                          type="text"
                          placeholder={sub?.principal_feedback ? `الحالي: ${sub.principal_feedback}` : 'اكتب ملاحظة أو توجيه للمعلم...'}
                          value={feedbackInputs[teacher.id] !== undefined ? feedbackInputs[teacher.id] : (sub?.principal_feedback || '')}
                          onChange={(e) => setFeedbackInputs({ ...feedbackInputs, [teacher.id]: e.target.value })}
                          className="w-full max-w-xs text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0f4c4c] outline-none font-bold"
                        />
                      </td>

                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            disabled={!isSubmitted || isActing}
                            onClick={() => handleUpdateSubmissionStatus(sub?.id || null, selectedTask.id, teacher.id, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-sm"
                            title="اعتماد الشاهد"
                          >
                            <Check className="w-3.5 h-3.5" /> اعتماد
                          </button>

                          <button
                            disabled={!isSubmitted || isActing}
                            onClick={() => handleUpdateSubmissionStatus(sub?.id || null, selectedTask.id, teacher.id, 'rejected')}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-40 px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1"
                            title="طلب تعديل الشاهد"
                          >
                            <X className="w-3.5 h-3.5" /> تعديل
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* مودال إضافة مهمة جديدة */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">إضافة مهمة أو متطلب جديد</h3>
                  <p className="text-xs text-slate-400 font-bold">نشر مهمة جديدة وإشعار المعلمين بتقديم الروابط</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* نماذج سريعة جاهزة */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">نماذج متطلبات شائعة (انقر للإدراج السريع):</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNewTitle(tmpl.title);
                      setNewDescription(tmpl.desc);
                    }}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 px-3 py-1.5 rounded-xl border border-slate-200 transition text-right"
                  >
                    + {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">عنوان المهمة / المتطلب <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: توزيع المنهج والخطط الفصلية"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-[#0f4c4c] outline-none font-bold text-sm bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">توجيهات وإرشادات المعلم</label>
                <textarea
                  rows={3}
                  placeholder="مثال: يرجى التأكد من ضبط مشاركة الملف لتكون متاحة للعرض، وإدراج خطة الفصل كاملة..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-[#0f4c4c] outline-none font-bold text-sm bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">آخر موعد للتسليم (اختياري)</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-[#0f4c4c] outline-none font-bold text-sm bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">الفئة المستهدفة بالتكليف</label>
                  <select
                    value={newTargetRole}
                    onChange={(e) => setNewTargetRole(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 focus:border-[#0f4c4c] outline-none font-bold text-sm bg-slate-50 focus:bg-white"
                  >
                    <option value="الكل">كافة منسوبي المدرسة (الجميع)</option>
                    <option value={UserRole.TEACHER}>المعلمون (يشمل: تعليمي، رائد نشاط، موجه صحي)</option>
                    <option value={UserRole.TEACHER_ACTIVITY}>معلم رائد النشاط الطلابي فقط</option>
                    <option value={UserRole.TEACHER_HEALTH}>معلم الموجه الصحي فقط</option>
                    <option value={UserRole.COUNSELOR}>الموجه الطلابي</option>
                    <option value={UserRole.LAB_ASSISTANT}>محضر المختبر</option>
                    <option value={UserRole.VICE_PRINCIPAL}>وكيل المدرسة</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={savingTask}
                  className="flex-1 bg-[#0f4c4c] hover:bg-[#164e63] disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm shadow-lg transition"
                >
                  {savingTask ? 'جاري النشر...' : 'نشر المهمة وإشعار المعلمين'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-4 rounded-2xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة طباعة كشف حصر وتسليمات المهمة المفلترة A4 */}
      {showPrintReport && selectedTask && (
        <PrintableTaskReport
          task={selectedTask}
          staffList={getFilteredStaffForTask()}
          submissions={submissions}
          principalProfile={principalProfile}
          filterTitle={getPrintFilterTitle()}
          onClose={() => setShowPrintReport(false)}
        />
      )}

    </div>
  );
};
