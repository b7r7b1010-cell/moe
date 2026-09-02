import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, Evaluation, SchoolTimeline, UserRole, SchoolNotification } from '../types';
import { CRITERIA_MAP, DEFAULT_TIMELINE } from '../constants';
import { 
  LogOut, ExternalLink, 
  Link as LinkIcon, CheckCircle2, 
  Info, Sparkles, Send,
  SendHorizontal,
  Heart, Palette, PhoneCall, Calendar,
  Clock, AlertCircle, Award, Target, BookOpen, ChevronDown, ChevronUp,
  FolderCheck, Bell, Megaphone, Check, MessageCircle,
  RefreshCw
} from 'lucide-react';

const Dashboard: React.FC<{ userProfile: Profile, onLogout: () => void }> = ({ userProfile, onLogout }) => {
  const [driveLink, setDriveLink] = useState(userProfile.drive_link || '');
  const [driveLinkV2, setDriveLinkV2] = useState(userProfile.drive_link_v2 || '');
  const [saving, setSaving] = useState(false);
  const [midtermEval, setMidtermEval] = useState<Evaluation | null>(null);
  const [finalEval, setFinalEval] = useState<Evaluation | null>(null);
  const [timeline, setTimeline] = useState<SchoolTimeline>({
    ...DEFAULT_TIMELINE,
    academicYear: '1448هـ'
  });
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [isReadyMidterm, setIsReadyMidterm] = useState(userProfile.is_ready_for_eval || false);
  const [isReadyFinal, setIsReadyFinal] = useState(userProfile.is_ready_for_final || false);
  const [activeTab, setActiveTab] = useState<'midterm' | 'final' | 'notifications' | 'criteria'>('midterm');
  const [expandedCriterion, setExpandedCriterion] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const criteria = CRITERIA_MAP[userProfile.role] || CRITERIA_MAP[UserRole.TEACHER] || [];

  useEffect(() => {
    // Clear old 1447 cache if exists
    localStorage.removeItem('school_timeline_1447');
    localStorage.removeItem('school_notifications_1447');

    fetchEvaluations();
    fetchTimeline();
    fetchNotifications();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvaluations(), fetchTimeline(), fetchNotifications()]);
    setRefreshing(false);
  };

  const fetchTimeline = async () => {
    try {
      const stored = localStorage.getItem('school_timeline_1448');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTimeline({
          ...parsed,
          academicYear: '1448هـ'
        });
      } else {
        setTimeline({
          ...DEFAULT_TIMELINE,
          academicYear: '1448هـ',
          activeAnnouncement: 'نرحب بجميع الزملاء المعلمين في منصة إتقان لإدارة الأداء الوظيفي للعام الدراسي 1448هـ. نأمل رفع شواهد الأداء في المواعيد المحددة.'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = async () => {
    try {
      let notifsList: SchoolNotification[] = [];

      // 1. Try Supabase
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .or(`recipient_id.is.null,recipient_id.eq.${userProfile.id}`)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          notifsList = data;
        }
      } catch (e) {
        // Silent catch for local mode
      }

      // 2. Check LocalStorage fallback
      if (notifsList.length === 0) {
        const localNotifs = localStorage.getItem('school_notifications_1448');
        if (localNotifs) {
          const parsed: SchoolNotification[] = JSON.parse(localNotifs);
          notifsList = parsed.filter(n => !n.recipient_id || n.recipient_id === userProfile.id);
        }
      }

      // Default welcome notification for 1448
      if (notifsList.length === 0) {
        notifsList = [
          {
            id: 'init-1',
            title: 'بدء دورة الأداء الوظيفي للعام الدراسي 1448هـ',
            message: 'مرحباً بكم في منصة إتقان 2.0. نأمل من الجميع تجهيز شواهد الأداء ورفعها في مواعيد التقييم المحددة.',
            type: 'general',
            sender_name: 'مدير المدرسة',
            created_at: new Date().toISOString()
          }
        ];
      }

      setNotifications(notifsList);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEvaluations = async () => {
    const { data: evals } = await supabase
      .from('evaluations')
      .select('*')
      .eq('staff_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (evals && evals.length > 0) {
      const finalRecord = evals.find(e => e.period === 'final') || (evals.length > 1 ? evals[0] : null);
      const midRecord = evals.find(e => e.period === 'midterm') || evals[evals.length - 1];
      
      if (evals.length === 1) {
        if (evals[0].period === 'final') {
          setFinalEval(evals[0]);
        } else {
          setMidtermEval(evals[0]);
        }
      } else {
        setMidtermEval(midRecord);
        setFinalEval(finalRecord);
      }
    }
  };

  const getGradeInfo = (score: number) => {
    if (score >= 90) return { label: 'مثالي', points: 5, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (score >= 80) return { label: 'تخطى التوقعات', points: 4, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 70) return { label: 'وافق التوقعات', points: 3, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    if (score >= 60) return { label: 'بحاجة إلى تطوير', points: 2, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { label: 'غير مرضي', points: 1, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const handleUpdateLink = async (isFinal: boolean) => {
    setSaving(true);
    const updateData = isFinal ? { drive_link_v2: driveLinkV2 } : { drive_link: driveLink };
    const { error } = await supabase.from('profiles').update(updateData).eq('id', userProfile.id);
    if (error) {
      alert('حدث خطأ: ' + error.message);
    } else {
      alert('✅ تم حفظ وتحديث رابط المجلد بنجاح');
      fetchEvaluations();
    }
    setSaving(false);
  };

  const handleNotifyReady = async (isFinal: boolean) => {
    const linkToCheck = isFinal ? driveLinkV2 : driveLink;
    if (!linkToCheck || !linkToCheck.startsWith('http')) {
      alert('الرجاء إدخال رابط صالح لمجلد Google Drive / OneDrive أولاً.');
      return;
    }

    const confirmMsg = isFinal
      ? 'هل أنت متأكد من جاهزية ملف الشواهد النهائي؟ سيتم إشعار مدير المدرسة بالبدء في التقييم النهائي الختامي.'
      : 'هل أنت متأكد من جاهزية ملف الشواهد النصف سنوي؟ سيتم إشعار مدير المدرسة لبدء المراجعة نصف السنوية.';

    if (!confirm(confirmMsg)) return;

    setSaving(true);
    const updatePayload = isFinal ? { is_ready_for_final: true } : { is_ready_for_eval: true };
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userProfile.id);
    
    if (error) {
      alert('حدث خطأ أثناء الإرسال: ' + error.message);
    } else {
      if (isFinal) setIsReadyFinal(true);
      else setIsReadyMidterm(true);
      alert('✅ تم الإشعار بنجاح! تم إبلاغ مدير المدرسة بجاهزية ملفك.');
    }
    setSaving(false);
  };

  const getLowScoreCriteria = (evalObj: Evaluation | null) => {
    if (!evalObj || !evalObj.scores) return [];
    return criteria.filter(c => {
      const score = evalObj.scores[c.id];
      return score && score < 3;
    });
  };

  const midtermGrade = midtermEval ? getGradeInfo(midtermEval.total_score) : null;
  const finalGrade = finalEval ? getGradeInfo(finalEval.total_score) : null;
  const lowCriteria = getLowScoreCriteria(midtermEval);

  // حساب الأيام المتبقية
  const getRemainingDays = (endDateStr: string) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const midtermRemaining = getRemainingDays(timeline.midtermEndDate);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 font-cairo text-right" dir="rtl">
      {/* الهيدر الرئيسي المطور */}
      <header className="bg-[#0f4c4c] text-white pt-8 pb-16 px-4 md:px-6 relative overflow-hidden shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
           <div className="text-right space-y-0.5 order-2 md:order-1 flex-1">
              <p className="text-[10px] md:text-xs font-bold opacity-90">المملكة العربية السعودية</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">وزارة التعليم</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">الإدارة العامة للتعليم بمحافظة جدة</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm md:text-base font-black text-emerald-300 border-r-4 border-emerald-400 pr-3">ثانوية الأمير عبدالمجيد الأولى</p>
                <span className="bg-white/15 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white/90">بنين</span>
              </div>
           </div>
           
           <div className="order-1 md:order-2 flex-shrink-0">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-20 md:h-28 object-contain drop-shadow-2xl" alt="Logo" />
           </div>

           <div className="flex flex-col items-center md:items-end gap-2 order-3 flex-1">
              <div className="bg-white/10 px-5 py-3 rounded-2xl border border-white/10 text-center md:text-right backdrop-blur-sm">
                <p className="text-[10px] opacity-70 font-bold">المعلم الفاضل،</p>
                <p className="text-sm md:text-base font-black text-white">{userProfile.full_name}</p>
                <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                  <span className="bg-emerald-400/20 text-emerald-300 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-emerald-400/30">{userProfile.role}</span>
                  {userProfile.subject && (
                    <span className="text-white/70 text-[10px] font-medium">• {userProfile.subject}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <button 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  className="text-emerald-200 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> تحديث البيانات
                </button>
                <button onClick={onLogout} className="text-red-300 hover:text-red-100 text-xs font-bold flex items-center gap-1 transition-colors group">
                  <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> تسجيل الخروج
                </button>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 -mt-10 space-y-6 relative z-20">
        
        {/* ========================================================================= */}
        {/* مركز الإشعارات والجدول الزمني التفاعلي (1448هـ) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-[2.5rem] p-5 md:p-8 shadow-2xl border border-slate-200 space-y-6">
          
          {/* الترويسة العلوية للجدول */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-[#0f4c4c]/10 text-[#0f4c4c] rounded-2xl flex-shrink-0">
                <Calendar className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-black text-slate-800">الجدول الزمني لدورة الأداء الوظيفي (1448هـ)</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-black">العام 1448هـ</span>
                </div>
                <p className="text-xs text-slate-500 font-bold mt-0.5">وفق الإطار الزمني المحدد من إدارة ثانوية الأمير عبدالمجيد الأولى</p>
              </div>
            </div>

            {/* بطاقات المواعيد السريعة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
              {/* موعد التقييم النصفي */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                timeline.isMidtermOpen ? 'bg-emerald-50/80 border-emerald-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${timeline.isMidtermOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500">فترة التقييم النصفي</p>
                    <p className="text-xs font-black text-slate-800 font-mono">{timeline.midtermEndDate || 'محدد قريباً'}</p>
                  </div>
                </div>
                {timeline.isMidtermOpen && (
                  <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-1 rounded-xl font-black shadow-sm">
                    {midtermRemaining !== null ? `متبقي ${midtermRemaining} يوم` : 'مفتوح للرفع'}
                  </span>
                )}
              </div>

              {/* موعد التقييم النهائي */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                timeline.isFinalOpen ? 'bg-blue-50/80 border-blue-300' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${timeline.isFinalOpen ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-[10px] font-black text-slate-500">فترة التقييم النهائي</p>
                    <p className="text-xs font-black text-slate-800 font-mono">{timeline.finalEndDate || 'نهاية العام'}</p>
                  </div>
                </div>
                {timeline.isFinalOpen ? (
                  <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-xl font-black shadow-sm">
                    مفتوح للرصد
                  </span>
                ) : (
                  <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-lg font-bold">
                    مجدول لاحقاً
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* شريط التعميم النشط للإدارة */}
          {timeline.activeAnnouncement && (
            <div className="bg-gradient-to-l from-amber-50 to-orange-50/60 border-2 border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-xl flex-shrink-0 mt-0.5 sm:mt-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">تعميم وإشعار مدير المدرسة:</span>
                  <p className="text-xs md:text-sm font-black text-amber-950 leading-relaxed mt-0.5">
                    {timeline.activeAnnouncement}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('notifications')}
                className="self-end sm:self-auto text-xs font-black text-[#0f4c4c] bg-white hover:bg-slate-50 px-4 py-2 rounded-xl border border-amber-300 shadow-sm transition-all whitespace-nowrap"
              >
                عرض كافة الإشعارات ({notifications.length})
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* التبويبات الأربعة الرئيسية (متجاوبة تماماً مع الجوال واللابتوب) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-slate-200 pb-2">
          {/* التبويب 1: التقييم النصفي */}
          <button
            onClick={() => setActiveTab('midterm')}
            className={`py-3.5 px-3 md:px-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 transition-all ${
              activeTab === 'midterm'
                ? 'bg-[#0f4c4c] text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>1. التقييم النصفي</span>
            {midtermEval && <span className="bg-emerald-400 text-slate-900 text-[9px] px-2 py-0.5 rounded-full font-black">مرصود</span>}
          </button>

          {/* التبويب 2: التقييم النهائي */}
          <button
            onClick={() => setActiveTab('final')}
            className={`py-3.5 px-3 md:px-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 transition-all ${
              activeTab === 'final'
                ? 'bg-[#0f4c4c] text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Award className="w-4 h-4 flex-shrink-0" />
            <span>2. التقييم النهائي</span>
            {finalEval && <span className="bg-emerald-400 text-slate-900 text-[9px] px-2 py-0.5 rounded-full font-black">معتمد</span>}
          </button>

          {/* التبويب 3: الإشعارات والرسائل */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3.5 px-3 md:px-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 transition-all relative ${
              activeTab === 'notifications'
                ? 'bg-[#00a18e] text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            <span>الإشعارات والرسائل</span>
            {notifications.length > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[9px] px-2 py-0.5 rounded-full font-black">
                {notifications.length}
              </span>
            )}
          </button>

          {/* التبويب 4: المعايير */}
          <button
            onClick={() => setActiveTab('criteria')}
            className={`py-3.5 px-3 md:px-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 transition-all ${
              activeTab === 'criteria'
                ? 'bg-[#0f4c4c] text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">معايير {userProfile.role}</span>
          </button>
        </div>

        {/* ======================= التبويب الأول: التقييم النصف سنوي ======================= */}
        {activeTab === 'midterm' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* بطاقة نتيجة التقييم النصفي إن وجدت */}
            {midtermEval && (
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border-2 border-emerald-500/20 flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                    <circle 
                      cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={264} 
                      strokeDashoffset={264 - (264 * midtermEval.total_score) / 100} 
                      className={`${midtermGrade?.color.replace('text-', 'stroke-')} transition-all duration-1000`} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-[#0f4c4c]">{(midtermEval.total_score / 20).toFixed(2)}</span>
                    <span className="text-[8px] font-bold text-slate-400">من 5</span>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center gap-3 mb-1 justify-center md:justify-start">
                    <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black">المراجعة نصف السنوية (1448هـ)</span>
                    <h2 className={`text-xl font-black ${midtermGrade?.color}`}>التقدير: {midtermGrade?.label} ({midtermGrade?.points} من 5)</h2>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">هذه الدرجة للمتابعة والدعم المستمر وتحديد نقاط القوة وسد الفجوات قبل التقييم الختامي.</p>
                  {midtermEval.comments && (
                    <div className="mt-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-slate-700 text-xs font-bold">
                      <span className="text-[#0f4c4c] font-black">توجيه المدير: </span>"{midtermEval.comments}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* خطة سد الفجوات التحسينية (IDP) إذا وجدت معايير أقل من 3 */}
            {lowCriteria.length > 0 && (
              <div className="bg-amber-50/60 border-2 border-amber-300 rounded-[2.5rem] p-6 md:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-amber-600" />
                  <h3 className="text-lg font-black text-amber-900">خطة التطوير الفردية وسد الفجوات (IDP) - وفق الدليل الإرشادي</h3>
                </div>
                <p className="text-xs text-amber-800 font-bold mb-6">
                  تم رصد فرصة للتحسين في المعايير التالية خلال التقييم النصفي، يرجى التركيز على أنشطة التعلم المهني والتطوير وفق منهجية (10-20-70):
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lowCriteria.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-black text-slate-800">{c.text}</span>
                        <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                          الدرجة: {midtermEval?.scores[c.id]} من 5
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{c.explanation}</p>
                      <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
                        💡 خطة التحسين المقترحة: المشاركة في مجتمعات التعلم المهنية وتطبيق الممارسات المرجعية.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* قسم إدخال رابط شواهد التقييم النصفي */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#0f4c4c]/10 text-[#0f4c4c] rounded-2xl">
                    <FolderCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-black text-slate-800">رابط مجلد شواهد التقييم النصف سنوي</h3>
                    <p className="text-xs text-slate-500 font-bold">ضع رابط مجلد Google Drive أو OneDrive متضمناً شواهد الفصل الأول</p>
                  </div>
                </div>
                {midtermEval ? (
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl text-xs font-black">تمت المراجعة</span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl text-xs font-black">متاح للتعديل</span>
                )}
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-sans outline-none focus:border-[#0f4c4c] text-left"
                    dir="ltr"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleUpdateLink(false)}
                    disabled={saving}
                    className="flex-1 bg-[#0f4c4c] hover:bg-[#0d3d3d] text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-4 h-4" /> حفظ الرابط
                  </button>

                  {driveLink && (
                    <a
                      href={driveLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      معاينة المجلد <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* زر إشعار المدير بجاهزية ملف التقييم النصفي */}
                {!midtermEval && (
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-700">اكتمال ملف الشواهد النصف سنوي</p>
                      <p className="text-[11px] text-slate-400 font-bold">إشعار مدير المدرسة بجاهزية ملفك لرصد درجات المراجعة النصف سنوية</p>
                    </div>
                    <button
                      onClick={() => handleNotifyReady(false)}
                      disabled={saving || isReadyMidterm}
                      className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                        isReadyMidterm
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                          : 'bg-[#00a18e] hover:bg-[#008f7e] text-white'
                      }`}
                    >
                      {isReadyMidterm ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          تم الإرسال للمدير
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="w-4 h-4" />
                          إشعار المدير بالجاهزية
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= التبويب الثاني: التقييم النهائي ======================= */}
        {activeTab === 'final' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {finalEval ? (
              <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border-2 border-emerald-500 flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                    <circle 
                      cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" 
                      strokeDasharray={301} 
                      strokeDashoffset={301 - (301 * finalEval.total_score) / 100} 
                      className={`${finalGrade?.color.replace('text-', 'stroke-')} transition-all duration-1000`} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-[#0f4c4c]">{(finalEval.total_score / 20).toFixed(2)}</span>
                    <span className="text-[9px] font-bold text-slate-400">من 5</span>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center gap-3 mb-2 justify-center md:justify-start flex-wrap">
                    <span className="bg-emerald-600 text-white px-3.5 py-1 rounded-full text-xs font-black">الاعتماد النهائي المعتمد</span>
                    <h2 className={`text-xl md:text-2xl font-black ${finalGrade?.color}`}>المستوى: {finalGrade?.label} ({finalGrade?.points} من 5)</h2>
                    <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">{finalEval.total_score}%</span>
                  </div>
                  <p className="text-xs text-slate-600 font-bold">تم اعتماد درجات الأداء الوظيفي السنوي بناء على شواهدكم وممارساتكم المهنية.</p>
                  {finalEval.comments && (
                    <div className="mt-4 bg-[#0f4c4c]/5 p-4 rounded-2xl border border-[#0f4c4c]/10 text-slate-800 text-xs font-bold">
                      <span className="text-[#0f4c4c] font-black">توصيات مدير المدرسة: </span>"{finalEval.comments}"
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-blue-900 flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-sm font-black mb-1">مرحلة التقييم النهائي الختامي (1448هـ)</h4>
                  <p className="text-xs leading-relaxed font-medium">
                    يتم فتح هذه المرحلة في نهاية العام الدراسي لاعتماد الدرجة النهائية، يرجى رفع مجلد الشواهد النهائي بعد استكمال كافة المتطلبات التدريسية والتكليفات.
                  </p>
                </div>
              </div>
            )}

            {/* إدخال رابط الشواهد النهائي */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/10 text-emerald-700 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-800">رابط مجلد الشواهد النهائي (المحدث)</h3>
                  <p className="text-xs text-slate-500 font-bold">رابط المجلد الختامي شامل كافة شواهد ومخرجات العام الدراسي 1448هـ</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <LinkIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="url"
                    value={driveLinkV2}
                    onChange={(e) => setDriveLinkV2(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-sans outline-none focus:border-[#0f4c4c] text-left"
                    dir="ltr"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleUpdateLink(true)}
                    disabled={saving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Send className="w-4 h-4" /> حفظ الرابط النهائي
                  </button>

                  {driveLinkV2 && (
                    <a
                      href={driveLinkV2}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      معاينة المجلد النهائي <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {!finalEval && (
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-700">إشعار الاعتماد النهائي</p>
                      <p className="text-[11px] text-slate-400 font-bold">إشعار الإدارة بجاهزية الشواهد النهائية لرصد الاعتماد الختامي</p>
                    </div>
                    <button
                      onClick={() => handleNotifyReady(true)}
                      disabled={saving || isReadyFinal}
                      className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                        isReadyFinal
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                          : 'bg-[#0f4c4c] hover:bg-black text-white'
                      }`}
                    >
                      {isReadyFinal ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          تم الإرسال للاعتماد النهائي
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="w-4 h-4" />
                          إرسال نهائي للمدير
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= التبويب الثالث: الإشعارات والرسائل الواردة ======================= */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-200 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#00a18e]/10 text-[#00a18e] rounded-2xl">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-800">صندوق الإشعارات والتنبيهات المدرسية</h3>
                  <p className="text-xs text-slate-500 font-bold">الرسائل والمواعيد والتوجيهات الموجهة لك من إدارة المدرسة للعام الدراسي 1448هـ</p>
                </div>
              </div>
              <span className="bg-[#00a18e] text-white px-3.5 py-1 rounded-full text-xs font-black">
                {notifications.length} إشعار
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="font-bold text-xs">لا توجد إشعارات جديدة حالياً.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all flex items-start gap-4"
                  >
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl flex-shrink-0 mt-0.5">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <h4 className="text-sm font-black text-slate-900">{n.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(n.created_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">{n.message}</p>
                      <div className="mt-2 text-[10px] text-emerald-800 font-black">
                        المرسل: {n.sender_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================= التبويب الرابع: معايير التقييم ======================= */}
        {activeTab === 'criteria' && (
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-200 space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-800">عناصر ومعايير تقييم: {userProfile.role}</h3>
                <p className="text-xs text-slate-500 font-bold">وفق الدليل الإرشادي لإدارة الأداء الوظيفي (الإصدار الثاني) - وزارة التعليم</p>
              </div>
              <span className="bg-[#0f4c4c]/10 text-[#0f4c4c] px-4 py-2 rounded-xl text-xs font-black">
                إجمالي الأوزان: 100%
              </span>
            </div>

            <div className="space-y-3">
              {criteria.map((c, idx) => {
                const isExpanded = expandedCriterion === c.id;
                return (
                  <div key={c.id} className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                    <button
                      onClick={() => setExpandedCriterion(isExpanded ? null : c.id)}
                      className="w-full p-4 text-right flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-[#0f4c4c] text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs md:text-sm font-black text-slate-800">{c.text}</span>
                        {c.category && (
                          <span className="hidden sm:inline-block bg-slate-100 text-slate-600 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                            {c.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-[11px] md:text-xs font-black text-[#0f4c4c] bg-[#0f4c4c]/5 px-2.5 py-1 rounded-lg">
                          {(c.weight * 100).toFixed(0)}%
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-4">
                        {c.explanation && (
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed font-medium">
                            <span className="text-[#0f4c4c] font-bold">التفسير والهدف: </span>{c.explanation}
                          </div>
                        )}
                        {c.levels && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-black text-slate-700">سلالم التقدير ومستوى الإتقان (1 إلى 5):</p>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-right">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <div key={lvl} className={`p-3 rounded-xl border text-xs ${lvl >= 4 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-black text-[#0f4c4c]">المستوى {lvl}</span>
                                    <span className="text-[10px] text-slate-400">{lvl === 5 ? 'مثالي' : lvl === 4 ? 'تخطى' : lvl === 3 ? 'وافق' : lvl === 2 ? 'تطوير' : 'غير مرضي'}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 leading-normal">{c.levels?.[lvl]}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* فوتر الدعم الفني وتوقيع التطوير */}
        <footer className="pt-8 pb-4 space-y-8">
           <div className="flex flex-col items-center justify-center gap-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">الدعم الفني المباشر</p>
              <a 
                href="https://wa.me/966559945045" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-3 bg-[#25D366] text-white px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-[#128C7E] transition-all active:scale-95"
              >
                <PhoneCall className="w-5 h-5" />
                <span className="text-sm">تواصل مع الدعم الفني والتقني</span>
              </a>
           </div>

           <div className="flex flex-col items-center justify-center gap-3 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-md border border-slate-100">
                 <Palette className="w-5 h-5 text-amber-500" />
                 <p className="text-xs font-bold text-slate-600">
                   تطوير وإشراف: <span className="text-[#0f4c4c] font-black">الأستاذ عبدالله الشهري</span>
                 </p>
                 <Heart className="w-4 h-4 text-red-500 animate-pulse" fill="currentColor" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">نظام إتقان 2.0 • ثانوية الأمير عبدالمجيد الأولى بجدة (1448هـ)</p>
           </div>
        </footer>

      </main>
    </div>
  );
};

export default Dashboard;
