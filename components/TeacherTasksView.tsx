import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, SchoolTask, TaskSubmission, SubmissionStatus } from '../types';
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

  // Currently active/highlighted task
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<string>('');
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

      let activeTasks: SchoolTask[] = [];

      // If database query succeeded, database is strictly authoritative (even if 0 tasks)
      if (!tasksError && tasksData) {
        activeTasks = tasksData;
        try {
          localStorage.setItem('local_school_tasks_1448', JSON.stringify(tasksData));
        } catch {}
      } else {
        // Fallback to local storage ONLY in case of offline/network errors
        const localTasksStr = localStorage.getItem('local_school_tasks_1448');
        if (localTasksStr) {
          try {
            activeTasks = JSON.parse(localTasksStr).filter((t: SchoolTask) => t.is_active);
          } catch (e) {
            activeTasks = [];
          }
        }
      }

      // Filter tasks assigned to this teacher's role (comprehensively covers all 3 teacher roles)
      const relevantTasks = activeTasks.filter(t => isStaffTargetedByTask(userProfile, t));
      setTasks(relevantTasks);

      // Auto-select first task in the submission dropdown if not selected
      if (relevantTasks.length > 0) {
        if (!selectedTaskForSubmission || !relevantTasks.some(t => t.id === selectedTaskForSubmission)) {
          setSelectedTaskForSubmission(relevantTasks[0].id);
        }
      } else {
        setSelectedTaskForSubmission('');
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

    } catch (e) {
      console.warn('Teacher tasks fetch fallback note:', e);
      try {
        const localTasksStr = localStorage.getItem('local_school_tasks_1448');
        if (localTasksStr) {
          const parsed = JSON.parse(localTasksStr).filter((t: SchoolTask) => t.is_active);
          const relevant = parsed.filter((t: SchoolTask) => isStaffTargetedByTask(userProfile, t));
          setTasks(relevant);
        } else {
          setTasks([]);
        }
      } catch {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Scroll directly to a selected task card and highlight it
  const scrollToTask = (taskId: string) => {
    setSelectedTaskForSubmission(taskId);
    const element = document.getElementById(`task-card-${taskId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      setSubmissionSuccessMsg('✅ تم تسليم رابط المهمة بنجاح! سيتم إشعار مدير المدرسة بمراجعتها.');
      setTimeout(() => setSubmissionSuccessMsg(null), 5000);
      alert('✅ تم تسليم رابط المهمة بنجاح! سيتم إشعار مدير المدرسة بمراجعتها.');
    } catch (e: any) {
      alert('خطأ أثناء التسليم: ' + e.message);
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const completedCount = submissions.filter(s => s.drive_link).length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;

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
            المتطلبات التي حددتها إدارة المدرسة خلال الفصل الدراسي (الخطط، الاختبارات التشخيصية، الشواهد الدورية). قم بإرفاق روابط الشواهد في بطاقة كل مهمة أدناه ليتم اعتمادها.
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

      {/* تنبيه النجاح اللحظي */}
      {submissionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 text-sm font-bold flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submissionSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. شريط التوجيه والتنقل السريع بين المهام */}
      {/* ========================================================================= */}
      {tasks.length > 0 ? (
        <div className="bg-white rounded-[2rem] p-6 md:p-7 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base md:text-lg font-black text-slate-800">
                  دليل تسليم الشواهد والانتقال المباشر للمهام
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-bold mr-10">
                انقر على أي مهمة أدناه للانتقال إليها مباشرة وتعبئة رابط مجلد الشواهد الخاص بها:
              </p>
            </div>

            {/* تنبيه صلاحية الرابط */}
            <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-2xl text-[11px] font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تأكد من ضبط صلاحية الرابط في Google Drive على: <strong>«أي شخص لديه الرابط يمكنه العرض»</strong></span>
            </div>
          </div>

          {/* أزرار التنقل السريع بين المهام */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {tasks.map((task, idx) => {
              const sub = submissions.find(s => s.task_id === task.id);
              const isApproved = sub?.status === 'approved';
              const isRevision = sub?.status === 'rejected';
              const isResubmitted = sub?.status === 'resubmitted';
              const isSubmitted = sub?.status === 'submitted';
              const isExpired = isTaskExpired(task.due_date) && (!sub?.drive_link || sub.status === 'pending');
              const isSelected = selectedTaskForSubmission === task.id;

              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => scrollToTask(task.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border shadow-sm ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 text-emerald-900'
                      : isApproved
                        ? 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : isRevision
                          ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse'
                          : isResubmitted
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                            : isSubmitted
                              ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                              : isExpired
                                ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[200px] sm:max-w-xs">{task.title}</span>
                  {isApproved && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  {isRevision && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                  {isSubmitted && !isApproved && <Clock className="w-3.5 h-3.5 text-blue-600" />}
                  {!sub?.drive_link && !isExpired && <span className="text-[10px] text-amber-600 font-bold">⏳ بانتظار التسليم</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h4 className="text-base font-black text-slate-700">لا توجد مهام أو متطلبات مجدولة حالياً</h4>
          <p className="text-xs text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
            لم تقم إدارة المدرسة بإسناد أي مهام فصلية حتى الآن. ستظهر المهام وخانات رفع الشواهد هنا فور إدراجها من قبل مدير المدرسة.
          </p>
        </div>
      )}

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
        ) : tasks.length === 0 ? (
          <div className="bg-white p-12 rounded-[2rem] text-center border border-slate-200 shadow-sm space-y-3">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-slate-800">قائمة المهام فارغة (0 مهام)</h4>
            <p className="text-xs text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
              تم تحديث السجلات بنجاح، ولا توجد مهام أو تكليفات فصلية معتمدة في الوقت الراهن.
            </p>
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
                  id={`task-card-${task.id}`}
                  className={`bg-white rounded-[2rem] p-6 md:p-8 shadow-md border transition-all hover:shadow-lg space-y-6 ${
                    isCardApproved 
                      ? 'border-emerald-200 bg-emerald-50/10'
                      : isCardNeedsRevision
                        ? 'border-amber-300 ring-2 ring-amber-400/20'
                        : selectedTaskForSubmission === task.id 
                          ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-xl' 
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
