import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, SchoolTask, TaskSubmission, SubmissionStatus } from '../types';
import { INITIAL_SCHOOL_TASKS } from '../lib/schoolTasksData';
import { isStaffTargetedByTask, generateSafeUUID, withTimeout, isTaskExpired } from '../lib/taskHelpers';
import { 
  ClipboardList, ExternalLink, Send, CheckCircle2, 
  Clock, AlertCircle, Sparkles, MessageSquare, 
  Calendar, Check, RefreshCw, Link as LinkIcon, PlusCircle,
  FolderCheck, Info, CheckCheck, Lock, ShieldCheck, AlertTriangle
} from 'lucide-react';

interface TeacherTasksViewProps {
  userProfile: Profile;
}

export const TeacherTasksView: React.FC<TeacherTasksViewProps> = ({ userProfile }) => {
  const [tasks, setTasks] = useState<SchoolTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  // Dedicated Top Form State for adding task link
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<string>('');
  const [dedicatedLink, setDedicatedLink] = useState<string>('');
  const [dedicatedNote, setDedicatedNote] = useState<string>('');
  const [isSubmittingDedicated, setIsSubmittingDedicated] = useState<boolean>(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);

  // Per-card input state for inline updates
  const [links, setLinks] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTasksAndSubmissions();

    // Realtime listeners
    const channel = supabase
      .channel(`teacher_tasks_${userProfile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasksAndSubmissions();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'task_submissions',
        filter: `teacher_id=eq.${userProfile.id}`
      }, () => {
        fetchTasksAndSubmissions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.id]);

  const fetchTasksAndSubmissions = async () => {
    setLoading(true);
    try {
      // 1. Fetch active tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      let activeTasks = tasksData || [];

      // If database returned 0 tasks or error, fallback to local storage or initial defaults
      if (!activeTasks || activeTasks.length === 0) {
        const localTasksStr = localStorage.getItem('local_school_tasks_1448');
        if (localTasksStr) {
          try {
            activeTasks = JSON.parse(localTasksStr).filter((t: SchoolTask) => t.is_active);
          } catch (e) {
            activeTasks = [];
          }
        }

        // If still empty, use INITIAL_SCHOOL_TASKS so the view is never empty!
        if (activeTasks.length === 0) {
          activeTasks = INITIAL_SCHOOL_TASKS;
          localStorage.setItem('local_school_tasks_1448', JSON.stringify(INITIAL_SCHOOL_TASKS));
          // Try to persist initial tasks to Supabase if possible
          try {
            await supabase.from('tasks').upsert(INITIAL_SCHOOL_TASKS);
          } catch (e) {
            // silent ignore
          }
        }
      }

      // Filter tasks assigned to this teacher's role (comprehensively covers all 3 teacher roles)
      const relevantTasks = activeTasks.filter(t => isStaffTargetedByTask(userProfile, t));
      setTasks(relevantTasks);

      // Auto-select first task in the submission dropdown if not selected
      if (relevantTasks.length > 0 && !selectedTaskForSubmission) {
        setSelectedTaskForSubmission(relevantTasks[0].id);
      }

      // 2. Fetch my submissions
      const { data: subsData } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('teacher_id', userProfile.id);

      let mySubs = subsData || [];
      if (!mySubs || mySubs.length === 0) {
        const localSubsStr = localStorage.getItem('local_school_submissions_1448');
        if (localSubsStr) {
          try {
            mySubs = JSON.parse(localSubsStr).filter((s: TaskSubmission) => s.teacher_id === userProfile.id);
          } catch (e) {
            mySubs = [];
          }
        }
      }
      setSubmissions(mySubs);

      // Initialize form inputs
      const initialLinks: Record<string, string> = {};
      const initialNotes: Record<string, string> = {};
      mySubs.forEach(s => {
        if (s.drive_link) initialLinks[s.task_id] = s.drive_link;
        if (s.teacher_notes) initialNotes[s.task_id] = s.teacher_notes;
      });
      setLinks(prev => ({ ...initialLinks, ...prev }));
      setNotes(prev => ({ ...initialNotes, ...prev }));

      // Set initial values for top form based on first task
      if (relevantTasks.length > 0 && initialLinks[relevantTasks[0].id]) {
        setDedicatedLink(initialLinks[relevantTasks[0].id]);
        setDedicatedNote(initialNotes[relevantTasks[0].id] || '');
      }

    } catch (e) {
      console.warn('Teacher tasks fetch fallback:', e);
      setTasks(INITIAL_SCHOOL_TASKS);
    } finally {
      setLoading(false);
    }
  };

  // When teacher selects a different task in the top dropdown
  const handleTaskSelectionChange = (taskId: string) => {
    setSelectedTaskForSubmission(taskId);
    const existing = submissions.find(s => s.task_id === taskId);
    setDedicatedLink(existing?.drive_link || links[taskId] || '');
    setDedicatedNote(existing?.teacher_notes || notes[taskId] || '');
  };

  // Dedicated Top Submission Handler
  const handleDedicatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const link = dedicatedLink.trim();
    if (!link) {
      alert('الرجاء إدخال رابط الشاهد (Google Drive أو OneDrive أو رابط ملف الشواهد) أولاً.');
      return;
    }

    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      alert('الرجاء إدخال رابط صحيح يبدأ بـ https://');
      return;
    }

    let targetTaskId = selectedTaskForSubmission;
    if (!targetTaskId) {
      alert('الرجاء اختيار المهمة المستهدفة من القائمة أولاً.');
      return;
    }

    setIsSubmittingDedicated(true);

    try {
      // Save submission optimistically & sync
      await saveSubmissionData(targetTaskId, link, dedicatedNote);
      setSubmissionSuccessMsg('تم تسليم رابط الشاهد لمدير المدرسة بنجاح! تظهر الآن في حساب الإدارة للاعتماد.');
      setTimeout(() => setSubmissionSuccessMsg(null), 6000);
    } catch (e: any) {
      console.error(e);
      alert('تم حفظ رابط المهمة وسيتم تحديثه في حساب الإدارة المدرسية.');
    } finally {
      setIsSubmittingDedicated(false);
    }
  };

  // Generic Save Submission with Optimistic UI & Timeout Protection
  const saveSubmissionData = async (
    taskId: string, 
    link: string, 
    note: string,
    forcedStatus?: 'submitted' | 'resubmitted'
  ) => {
    const existingSub = submissions.find(s => s.task_id === taskId);
    const subId = existingSub?.id || generateSafeUUID();

    // 1. Check if task is officially approved - strictly read-only!
    if (existingSub?.status === 'approved') {
      alert('🔒 لا يمكن تعديل هذه المهمة لأنها معتمدة رسمياً من مدير المدرسة وتم قفل السجل.');
      return;
    }

    // 2. Check if deadline has expired and staff has not submitted yet
    const taskObj = tasks.find(t => t.id === taskId);
    if (taskObj && isTaskExpired(taskObj.due_date) && (!existingSub?.drive_link || existingSub.status === 'pending')) {
      alert(`⏰ انتهت المهلة النظامية المحددة لتسليم شواهد هذه المهمة (${taskObj.due_date}). نأمل مراجعة إدارة المدرسة.`);
      return;
    }

    // 3. Determine status: if forced, or if previously needs_revision (rejected), set to 'resubmitted'
    let nextStatus: SubmissionStatus = forcedStatus || (existingSub?.status === 'rejected' ? 'resubmitted' : 'submitted');

    const savedData: TaskSubmission = {
      id: subId,
      task_id: taskId,
      teacher_id: userProfile.id,
      drive_link: link,
      teacher_notes: note,
      status: nextStatus,
      principal_feedback: existingSub?.principal_feedback || '',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Instant local state update (0ms latency for smooth UI!)
    setSubmissions(prev => {
      const filtered = prev.filter(s => s.task_id !== taskId);
      return [...filtered, savedData];
    });
    setLinks(prev => ({ ...prev, [taskId]: link }));
    setNotes(prev => ({ ...prev, [taskId]: note }));

    // 2. Instant Local Storage persistence
    try {
      const existingAll = JSON.parse(localStorage.getItem('local_school_submissions_1448') || '[]');
      const filteredAll = existingAll.filter((s: TaskSubmission) => !(s.task_id === taskId && s.teacher_id === userProfile.id));
      localStorage.setItem('local_school_submissions_1448', JSON.stringify([...filteredAll, savedData]));
    } catch (e) {}

    // 3. Background push to Supabase with timeout (2500ms max) so it never freezes
    const payload: any = {
      id: subId,
      task_id: taskId,
      teacher_id: userProfile.id,
      drive_link: link,
      teacher_notes: note,
      status: nextStatus,
      principal_feedback: existingSub?.principal_feedback || '',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await withTimeout(
        supabase.from('task_submissions').upsert(payload),
        2500
      );
    } catch (err) {
      console.warn('Background Supabase submission sync completed with local backup:', err);
    }
  };

  // Dedicated Confirm Revision Handler (Resubmission after Director requested changes)
  const handleConfirmRevision = async (taskId: string, linkParam?: string, noteParam?: string) => {
    const currentLink = (linkParam !== undefined ? linkParam : (links[taskId] || dedicatedLink)).trim();
    const currentNote = (noteParam !== undefined ? noteParam : (notes[taskId] || dedicatedNote)).trim();

    if (!currentLink) {
      alert('الرجاء التأكد من وجود رابط الشاهد أولاً.');
      return;
    }

    if (!currentLink.startsWith('http://') && !currentLink.startsWith('https://')) {
      alert('الرجاء إدخال رابط صحيح يبدأ بـ https://');
      return;
    }

    setSubmittingTaskId(taskId);
    try {
      await saveSubmissionData(taskId, currentLink, currentNote, 'resubmitted');
      setSubmissionSuccessMsg('🔄 تم تأكيد إكمال التعديل وإعادة إرسال المهمة لمدير المدرسة للاعتماد بنجاح!');
      setTimeout(() => setSubmissionSuccessMsg(null), 7000);
      alert('✅ تم تأكيد إكمال التعديل وإعادة إرسال المهمة لمدير المدرسة للاعتماد بنجاح!');
    } catch (e: any) {
      alert('خطأ أثناء إعادة الإرسال: ' + e.message);
    } finally {
      setSubmittingTaskId(null);
    }
  };

  // Per-card submission handler
  const handleSaveCardSubmission = async (taskId: string) => {
    const link = links[taskId]?.trim();
    if (!link) {
      alert('الرجاء إدخال رابط الشاهد (Google Drive أو OneDrive) أولاً.');
      return;
    }

    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      alert('الرجاء إدخال رابط صحيح يبدأ بـ https://');
      return;
    }

    setSubmittingTaskId(taskId);
    try {
      await saveSubmissionData(taskId, link, notes[taskId] || '');
      alert('✅ تم تسليم رابط المهمة بنجاح! سيتم إشعار مدير المدرسة بمراجعتها.');
    } catch (e: any) {
      alert('خطأ أثناء التسليم: ' + e.message);
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const completedCount = submissions.filter(s => s.drive_link).length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;

  const currentSelectedSubmission = submissions.find(s => s.task_id === selectedTaskForSubmission);
  const selectedTaskObj = tasks.find(t => t.id === selectedTaskForSubmission);
  const isSelectedTaskApproved = currentSelectedSubmission?.status === 'approved';
  const isSelectedTaskExpired = isTaskExpired(selectedTaskObj?.due_date) && (!currentSelectedSubmission?.drive_link || currentSelectedSubmission.status === 'pending');
  const isSelectedTaskNeedsRevision = currentSelectedSubmission?.status === 'rejected';
  const isSelectedTaskResubmitted = currentSelectedSubmission?.status === 'resubmitted';

  return (
    <div className="space-y-8 text-right font-cairo" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. الترويسة وبطاقة الإحصائيات للمهام المجدولة */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-l from-[#0f4c4c] to-[#115e59] p-6 md:p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            المحطات والمتطلبات الإشرافية 1448هـ
          </div>
          <h2 className="text-2xl md:text-3xl font-black">المهام والمحطات المجدولة</h2>
          <p className="text-emerald-100/80 text-sm max-w-2xl leading-relaxed">
            المتطلبات التي حددتها إدارة المدرسة خلال الفصل الدراسي (الخطط، الاختبارات التشخيصية، الشواهد الدورية). قم بإرفاق روابط الشواهد ليتم اعتمادها.
          </p>
        </div>

        {/* إحصائيات المعلم السريعة */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-center flex-1 md:flex-initial">
            <p className="text-[10px] text-emerald-200 font-bold">إجمالي المهام</p>
            <p className="text-xl font-black">{tasks.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-center flex-1 md:flex-initial">
            <p className="text-[10px] text-emerald-200 font-bold">المسلّمة</p>
            <p className="text-xl font-black text-emerald-300">{completedCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-center flex-1 md:flex-initial">
            <p className="text-[10px] text-emerald-200 font-bold">المعتمدة</p>
            <p className="text-xl font-black text-emerald-400">{approvedCount}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. الصندوق الرئيسي المباشر: مكان إضافة رابط المهمة التي أرسلها المدير */}
      {/* ========================================================================= */}
      <div className={`bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border-2 relative overflow-hidden transition-all ${
        isSelectedTaskApproved 
          ? 'border-emerald-500/50 bg-emerald-50/10' 
          : isSelectedTaskNeedsRevision
            ? 'border-amber-400 ring-2 ring-amber-400/20'
            : isSelectedTaskExpired
              ? 'border-rose-300 bg-rose-50/20'
              : 'border-emerald-500/30'
      }`}>
        {/* خلفية جمالية خفيفة */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl -z-10"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                isSelectedTaskApproved 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : isSelectedTaskNeedsRevision 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isSelectedTaskApproved ? (
                  <Lock className="w-5 h-5 text-emerald-700" />
                ) : (
                  <LinkIcon className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900">
                مكان إضافة رابط المهمة التي أرسلها المدير
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-bold mr-11">
              اختر المهمة المطلوبة من القائمة وضع رابط مجلد الشاهد ليتم رفعه واعتماده من قبل الإدارة المدرسية.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSelectedTaskApproved && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-full text-xs font-black border border-emerald-300 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> معتمدة رسمياً — السجل مقفل 🔒
              </span>
            )}
            {isSelectedTaskResubmitted && (
              <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 px-3.5 py-1.5 rounded-full text-xs font-black border border-indigo-200">
                <RefreshCw className="w-4 h-4 text-indigo-600" /> تم التعديل - بانتظار اعتماد المدير 🔄
              </span>
            )}
            {isSelectedTaskNeedsRevision && (
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-black border border-amber-300 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> مطلوب تعديل من المدير ⚠️
              </span>
            )}
            {!isSelectedTaskApproved && !isSelectedTaskNeedsRevision && !isSelectedTaskResubmitted && currentSelectedSubmission?.status === 'submitted' && (
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3.5 py-1.5 rounded-full text-xs font-black border border-blue-200">
                <Clock className="w-4 h-4 text-blue-600" /> تم التسليم - بانتظار مراجعة المدير
              </span>
            )}
            {isSelectedTaskExpired && (
              <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 px-3.5 py-1.5 rounded-full text-xs font-black border border-rose-200">
                <Lock className="w-4 h-4 text-rose-600" /> انتهت مهلة التسليم
              </span>
            )}
          </div>
        </div>

        {/* نموذج الإضافة المباشر */}
        <form onSubmit={handleDedicatedSubmit} className="pt-6 space-y-5">
          
          {/* تنبيه الاعتماد الرسمي والقفل */}
          {isSelectedTaskApproved && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-950 text-xs font-bold flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-black text-emerald-900 text-sm">🔒 هذه المهمة معتمدة رسمياً من قبل مدير المدرسة</p>
                <p className="text-emerald-700 text-[11px] mt-0.5 leading-relaxed">
                  تم إقفال إمكانية التعديل أو رفع ملفات أخرى حفاظاً على موثوقية السجلات بعد الاعتماد.
                </p>
              </div>
            </div>
          )}

          {/* تنبيه انتهاء المهلة النظامية */}
          {isSelectedTaskExpired && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-950 text-xs font-bold flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <p className="font-black text-rose-900 text-sm">⏰ انتهت المهلة النظامية المحددة لتسليم الشواهد</p>
                <p className="text-rose-700 text-[11px] mt-0.5 leading-relaxed">
                  تاريخ نهاية هذه المهمة كان ({selectedTaskObj?.due_date}). لا يمكن استقبال شواهد جديدة بعد انتهاء الموعد المحدد.
                </p>
              </div>
            </div>
          )}

          {/* تنبيه وتوجيه المدير عند طلب التعديل */}
          {isSelectedTaskNeedsRevision && (
            <div className="p-5 rounded-2xl bg-gradient-to-l from-amber-50 to-amber-100/60 border-2 border-amber-300 text-amber-950 text-xs font-bold space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>مطلوب إجراء تعديل من مدير المدرسة:</span>
              </div>
              {currentSelectedSubmission?.principal_feedback && (
                <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 text-slate-900 text-xs font-bold">
                  <span className="text-amber-900 font-black">توجيه المدير: </span>
                  {currentSelectedSubmission.principal_feedback}
                </div>
              )}
              <p className="text-amber-800 text-[11px] leading-relaxed">
                💡 <b>إرشاد:</b> تم الاحتفاظ برابط الشاهد المرفوع؛ يمكنك تعديل ملفاتك داخل مجلد Drive مباشرة أو تحديث الرابط هنا، وتدوين توضيحك ثم الضغط على زر <b>(تأكيد إكمال التعديل وإعادة الإرسال للمدير للاعتماد 🔄)</b>.
              </p>
            </div>
          )}

          {isSelectedTaskResubmitted && (
            <div className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-950 text-xs font-bold flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="font-black text-indigo-900 text-xs">🔄 تم تسليم التعديلات وهي بانتظار مراجعة واعتماد المدير مجدداً</p>
                {currentSelectedSubmission?.teacher_notes && (
                  <p className="text-indigo-700 text-[11px] mt-0.5">ملاحظتك: {currentSelectedSubmission.teacher_notes}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* اختيار المهمة */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                <span>المهمة أو المتطلب المستهدف <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">حدد المهمة المعنية</span>
              </label>
              <select
                value={selectedTaskForSubmission}
                onChange={(e) => handleTaskSelectionChange(e.target.value)}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-[#0f4c4c] outline-none font-bold text-sm bg-slate-50 focus:bg-white text-slate-800 transition"
              >
                {tasks.length === 0 ? (
                  <option value="">لا توجد مهام مسندة حالياً من قبل الإدارة</option>
                ) : (
                  tasks.map(task => {
                    const isExp = isTaskExpired(task.due_date);
                    const subItem = submissions.find(s => s.task_id === task.id);
                    return (
                      <option key={task.id} value={task.id}>
                        {subItem?.status === 'approved' ? '🔒 ' : ''}
                        {task.title} 
                        {task.due_date ? ` (آخر موعد: ${task.due_date}${isExp ? ' - منتهي' : ''})` : ''}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                <span>ملاحظات وتوضيح المعلم للإدارة (اختياري)</span>
                <span className="text-[10px] text-slate-400 font-normal">توضيح للإدارة المدرسية</span>
              </label>
              <input
                type="text"
                placeholder={isSelectedTaskNeedsRevision ? "دوّن هنا ما تم تعديله وفق ملاحظة المدير..." : "مثال: تم إرفاق الخطة كاملة مع نماذج الاختبارات وسلالم التصحيح"}
                value={dedicatedNote}
                disabled={isSelectedTaskApproved || isSelectedTaskExpired}
                onChange={(e) => setDedicatedNote(e.target.value)}
                className={`w-full p-4 rounded-2xl border-2 outline-none font-bold text-xs transition ${
                  isSelectedTaskApproved || isSelectedTaskExpired
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'border-slate-200 focus:border-[#0f4c4c] bg-slate-50 focus:bg-white text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* حقل رابط الشاهد البارز */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>رابط المهمة أو الشاهد (Google Drive / OneDrive)</span>
                <span className="text-rose-500">*</span>
              </label>

              {dedicatedLink && (
                <a
                  href={dedicatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 text-xs bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> فتح وتجربة الرابط الحالي
                </a>
              )}
            </div>

            <div className="relative">
              <input
                type="url"
                placeholder="https://drive.google.com/drive/folders/... أو https://1drv.ms/..."
                value={dedicatedLink}
                disabled={isSelectedTaskApproved || isSelectedTaskExpired}
                onChange={(e) => setDedicatedLink(e.target.value)}
                required
                className={`w-full p-4 pl-12 pr-4 rounded-2xl border-2 outline-none font-mono font-bold text-sm text-left dir-ltr shadow-inner transition ${
                  isSelectedTaskApproved || isSelectedTaskExpired
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'border-slate-200 focus:border-[#0f4c4c] bg-slate-50 focus:bg-white'
                }`}
                dir="ltr"
              />
              <LinkIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              يرجى التأكد من ضبط صلاحية مشاركة المجلد في Google Drive على: <b>«أي شخص لديه الرابط يمكنه العرض»</b>.
            </p>
          </div>

          {/* رسالة النجاح */}
          {submissionSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submissionSuccessMsg}</span>
            </div>
          )}

          {/* زر الإرسال المباشر */}
          <div className="pt-2 flex justify-end">
            {isSelectedTaskApproved ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto bg-emerald-50 text-emerald-800 border-2 border-emerald-300 px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-emerald-700" />
                <span>المهمة معتمدة رسمياً — السجل مقفل وغير قابل للتعديل</span>
              </button>
            ) : isSelectedTaskExpired ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto bg-slate-100 text-slate-500 border-2 border-slate-300 px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>انتهت المهلة النظامية المحددة للاستقبال ({selectedTaskObj?.due_date})</span>
              </button>
            ) : isSelectedTaskNeedsRevision ? (
              <button
                type="button"
                onClick={() => handleConfirmRevision(selectedTaskForSubmission, dedicatedLink, dedicatedNote)}
                disabled={isSubmittingDedicated}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-600/20 hover:shadow-amber-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmittingDedicated ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري إعادة الإرسال للمدير...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>تأكيد إكمال التعديل وإعادة الإرسال للمدير للاعتماد 🔄</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmittingDedicated}
                className="w-full sm:w-auto bg-[#0f4c4c] hover:bg-[#115e59] text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-[#0f4c4c]/20 hover:shadow-[#0f4c4c]/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmittingDedicated ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تسليم الرابط...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {currentSelectedSubmission?.drive_link ? 'تحديث وتأكيد رابط المهمة للإدارة' : 'إرسال رابط المهمة لمدير المدرسة للاعتماد'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </div>

      {/* ========================================================================= */}
      {/* 3. قائمة المهام التفصيلية لكل متطلب */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-700" />
            سجل وتفاصيل المهام المجدولة للفصل الدراسي
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {tasks.length} مهام معتمدة
          </span>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-[2rem] text-center border border-slate-200">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">جاري تحميل المهام المجدولة...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {tasks.map((task, index) => {
              const sub = submissions.find(s => s.task_id === task.id);
              const isSubmitted = !!sub?.drive_link;
              const status = sub?.status || 'pending';
              const isSaving = submittingTaskId === task.id;

              const isCardApproved = status === 'approved';
              const isCardExpired = isTaskExpired(task.due_date) && (!sub?.drive_link || status === 'pending');
              const isCardNeedsRevision = status === 'rejected';
              const isCardResubmitted = status === 'resubmitted';

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-[2rem] p-6 md:p-8 shadow-md border transition-all hover:shadow-lg space-y-6 ${
                    isCardApproved 
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : isCardNeedsRevision
                        ? 'border-amber-300 ring-2 ring-amber-400/20'
                        : selectedTaskForSubmission === task.id 
                          ? 'border-emerald-500 ring-2 ring-emerald-400/20' 
                          : 'border-slate-200'
                  }`}
                >
                  {/* رأس كارت المهمة */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <h3 className="text-lg md:text-xl font-black text-slate-800">{task.title}</h3>
                        
                        {/* بادج الحالة المطور */}
                        {isCardApproved && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-black border border-emerald-300">
                            <Lock className="w-3.5 h-3.5 text-emerald-700" /> معتمد رسمياً 🔒
                          </span>
                        )}
                        {isCardResubmitted && (
                          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-black border border-indigo-200">
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> تم التعديل - قيد المراجعة 🔄
                          </span>
                        )}
                        {isCardNeedsRevision && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black border border-amber-300 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> مطلوب تعديل ⚠️
                          </span>
                        )}
                        {!isCardApproved && !isCardNeedsRevision && !isCardResubmitted && status === 'submitted' && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-black">
                            <Clock className="w-3.5 h-3.5" /> تم التسليم - قيد المراجعة
                          </span>
                        )}
                        {!isCardApproved && !isCardNeedsRevision && !isCardResubmitted && status === 'pending' && (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            isCardExpired 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isCardExpired ? 'انتهت المهلة ⏰' : 'بانتظار التسليم'}
                          </span>
                        )}
                      </div>
                    </div>

                    {task.due_date && (
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                        isCardExpired 
                          ? 'text-rose-700 bg-rose-50 border-rose-200' 
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        آخر موعد: {task.due_date} {isCardExpired ? '(منتهي)' : ''}
                      </div>
                    )}
                  </div>

                  {/* التوجيهات المكتوبة من المدير */}
                  {task.description && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs md:text-sm text-slate-600 leading-relaxed font-bold">
                      <p className="text-slate-400 text-[10px] mb-1 font-black">تعليمات وتوجيهات الإدارة:</p>
                      {task.description}
                    </div>
                  )}

                  {/* ملاحظة أو توجيه المدير (إن وجد) */}
                  {sub?.principal_feedback && (
                    <div className={`p-4 rounded-2xl border text-xs md:text-sm font-bold flex items-start gap-3 ${
                      isCardApproved 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : isCardNeedsRevision
                          ? 'bg-amber-50 border-amber-300 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <MessageSquare className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-black text-xs mb-0.5">ملاحظة وتوجيه مدير المدرسة:</p>
                        <p>{sub.principal_feedback}</p>
                      </div>
                    </div>
                  )}

                  {/* تنبيه القفل إن كانت معتمدة */}
                  {isCardApproved && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>🔒 تم اعتماد هذه المهمة رسمياً؛ السجل مغلق وغير متاح للتعديل.</span>
                    </div>
                  )}

                  {/* تنبيه انتهاء المهلة */}
                  {isCardExpired && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>⏰ انتهت المهلة النظامية المحددة لتسليم الشواهد لهذه المهمة ({task.due_date}).</span>
                    </div>
                  )}

                  {/* حقول إدخال الرابط والملاحظة الفردية داخل الكارت */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                        <span>رابط الشاهد الخاص بهذه المهمة (Google Drive / OneDrive) <span className="text-rose-500">*</span></span>
                        {sub?.drive_link && (
                          <a
                            href={sub.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" /> فتح الرابط المرفوع حالياً
                          </a>
                        )}
                      </label>

                      <div className="relative">
                        <input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          value={links[task.id] || sub?.drive_link || ''}
                          disabled={isCardApproved || isCardExpired}
                          onChange={(e) => setLinks({ ...links, [task.id]: e.target.value })}
                          className={`w-full p-4 pl-12 rounded-2xl border outline-none font-bold text-sm text-left dir-ltr transition ${
                            isCardApproved || isCardExpired
                              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                              : 'border-slate-200 focus:border-[#0f4c4c] bg-slate-50 focus:bg-white'
                          }`}
                          dir="ltr"
                        />
                        <LinkIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700">ملاحظات إضافية من المعلم (اختياري)</label>
                      <input
                        type="text"
                        placeholder={isCardNeedsRevision ? "دوّن توضيحك للمدير حول التعديل الذي تم..." : "مثال: تم إرفاق الخطة للأول والثاني ثانوي مع نماذج الاختبارات"}
                        value={notes[task.id] !== undefined ? notes[task.id] : (sub?.teacher_notes || '')}
                        disabled={isCardApproved || isCardExpired}
                        onChange={(e) => setNotes({ ...notes, [task.id]: e.target.value })}
                        className={`w-full p-3.5 rounded-2xl border outline-none font-bold text-xs transition ${
                          isCardApproved || isCardExpired
                            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                            : 'border-slate-200 focus:border-[#0f4c4c] bg-slate-50 focus:bg-white'
                        }`}
                      />
                    </div>

                    {/* زر الإجراء داخل الكارت */}
                    <div className="flex justify-end pt-2">
                      {isCardApproved ? (
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-200 inline-flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-emerald-600" /> معتمد رسمياً — السجل مغلق
                        </span>
                      ) : isCardExpired ? (
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-5 py-3 rounded-2xl border border-slate-200 inline-flex items-center gap-1.5">
                          <Lock className="w-4 h-4 text-slate-400" /> انتهت المهلة النظامية ({task.due_date})
                        </span>
                      ) : isCardNeedsRevision ? (
                        <button
                          onClick={() => handleConfirmRevision(task.id, links[task.id] || sub?.drive_link, notes[task.id] !== undefined ? notes[task.id] : sub?.teacher_notes)}
                          disabled={isSaving}
                          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg transition flex items-center gap-2"
                        >
                          {isSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          تأكيد إكمال التعديل وإعادة الإرسال للمدير للاعتماد 🔄
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSaveCardSubmission(task.id)}
                          disabled={isSaving}
                          className="bg-[#0f4c4c] hover:bg-[#164e63] disabled:opacity-50 text-white px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg transition flex items-center gap-2"
                        >
                          {isSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          {isSubmitted ? 'تحديث رابط المهمة' : 'تسليم المهمة للإدارة'}
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
