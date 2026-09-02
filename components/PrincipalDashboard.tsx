import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, UserRole, Evaluation, SchoolTimeline, EvaluationPeriod, SchoolNotification } from '../types';
import { DEFAULT_TIMELINE, buildWhatsAppMessage, CRITERIA_MAP } from '../constants';
import * as XLSX from 'xlsx';
import { 
  Search, LogOut, Printer, 
  MessageCircle, Settings, Sparkles,
  Users, UserCheck, X, AlertCircle,
  UserPlus, UserMinus, Check, Loader2,
  LayoutDashboard, PieChart, ClipboardCheck, FolderX,
  UserCog, Save, Edit3, Calendar, Clock, Award, Send,
  Filter, CheckCircle2, ChevronRight, Phone, BookOpen, Trash2,
  Bell, Megaphone, RefreshCw, FileSpreadsheet, Download,
  ExternalLink, Share2, Copy
} from 'lucide-react';
import EvaluationModal from './EvaluationModal';
import PrintableReport from './PrintableReport';

const PrincipalDashboard: React.FC<{ userProfile: Profile, onLogout: () => void }> = ({ userProfile, onLogout }) => {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [timeline, setTimeline] = useState<SchoolTimeline>({
    ...DEFAULT_TIMELINE,
    academicYear: '1448هـ'
  });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'active' | 'pending' | 'timeline' | 'notifications'>('active');
  const [filterType, setFilterType] = useState<'all' | 'evaluated_midterm' | 'evaluated_final' | 'pending_eval' | 'no_file'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Modals state
  const [selectedStaffForEval, setSelectedStaffForEval] = useState<{ staff: Profile, period: EvaluationPeriod } | null>(null);
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
  const [whatsAppModalStaff, setWhatsAppModalStaff] = useState<Profile | null>(null);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'midterm_reminder' | 'final_reminder' | 'eval_result' | 'custom'>('midterm_reminder');
  const [customWhatsAppText, setCustomWhatsAppText] = useState('');
  const [evaluationToShow, setEvaluationToShow] = useState<{ staff: Profile, evaluation: Evaluation } | null>(null);

  // Notifications State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifRecipient, setNotifRecipient] = useState<string>('all');
  const [sendingNotif, setSendingNotif] = useState(false);

  useEffect(() => { 
    // Clear old 1447 cache if exists
    localStorage.removeItem('school_timeline_1447');
    localStorage.removeItem('school_notifications_1447');

    fetchData();
    fetchTimeline();
  }, []);

  const fetchTimeline = () => {
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
          academicYear: '1448هـ'
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveTimeline = (newTimeline: SchoolTimeline) => {
    const updated = {
      ...newTimeline,
      academicYear: '1448هـ'
    };
    setTimeline(updated);
    localStorage.setItem('school_timeline_1448', JSON.stringify(updated));
    
    // Also save as an announcement notification
    if (updated.activeAnnouncement) {
      pushNotification('تعميم مدرسي للعام الدراسي 1448هـ', updated.activeAnnouncement, 'general', null);
    }

    alert('✅ تم حفظ الجدول الزمني وتعميم العام الدراسي 1448هـ بنجاح');
  };

  const pushNotification = async (title: string, message: string, type: 'general' | 'midterm' | 'final' | 'private', recipientId: string | null) => {
    const newNotif: SchoolNotification = {
      id: 'notif-' + Date.now(),
      title,
      message,
      type,
      recipient_id: recipientId,
      sender_name: userProfile.full_name || 'مدير المدرسة',
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('notifications').insert([newNotif]);
    } catch (e) {
      console.warn('Fallback to local notifications storage', e);
    }

    try {
      const existing = localStorage.getItem('school_notifications_1448');
      const list: SchoolNotification[] = existing ? JSON.parse(existing) : [];
      list.unshift(newNotif);
      localStorage.setItem('school_notifications_1448', JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const formatSaudiPhone = (rawMobile: string) => {
    if (!rawMobile) return '';
    let cleaned = String(rawMobile).replace(/\D/g, '').trim();
    if (cleaned.startsWith('05')) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5')) {
      cleaned = '966' + cleaned;
    } else if (cleaned.startsWith('00966')) {
      cleaned = cleaned.substring(2);
    } else if (!cleaned.startsWith('966') && cleaned.length >= 9) {
      cleaned = '966' + cleaned;
    }
    return cleaned;
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setSendingNotif(true);
    const targetId = notifRecipient === 'all' ? null : notifRecipient;
    await pushNotification(notifTitle.trim(), notifMessage.trim(), targetId ? 'private' : 'general', targetId);
    
    alert('✅ تم إرسال الإشعار بنجاح وسيظهر في بروفايل المعلم فوراً!');
    setNotifTitle('');
    setNotifMessage('');
    setSendingNotif(false);
  };

  const handleSendSingleWhatsApp = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert('الرجاء كتابة عنوان ونص الرسالة أولاً.');
      return;
    }

    const targetStaff = staff.find(s => s.id === notifRecipient);
    if (!targetStaff) {
      alert('الرجاء اختيار معلم محدد.');
      return;
    }

    const phone = formatSaudiPhone(targetStaff.mobile);
    if (!phone) {
      alert('رقم جوال المعلم غير متوفر أو غير صالح.');
      return;
    }

    const fullMessage = `السلام عليكم ورحمة الله وبركاته أ. ${targetStaff.full_name} المحترم،\n\n📌 *${notifTitle.trim()}*\n${notifMessage.trim()}\n\n— إدارة ثانوية الأمير عبدالمجيد الأولى (1448هـ)`;

    // Save in platform
    await pushNotification(notifTitle.trim(), notifMessage.trim(), 'private', targetStaff.id);

    // Open WhatsApp Web
    const encodedText = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const exportWhatsAppExcel = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert('الرجاء كتابة عنوان التعميم ونص الرسالة أولاً قبل تصدير ملف الإكسل.');
      return;
    }

    const approvedStaff = staff.filter(s => s.is_approved && s.mobile);
    if (approvedStaff.length === 0) {
      alert('لا يوجد معلمين معتمدين بأرقام جوال مسجلة لتصديرهم.');
      return;
    }

    // Prepare rows according to the Chrome extension format:
    // Row 0 (Header): [Phone, Name, Message] -> starts with non-digit so it gets skipped
    // Subsequent rows: [Phone (Column A), Name (Column B), Message (Column C)]
    const rows: (string | number)[][] = [
      ['رقم الجوال (Phone)', 'اسم المعلم (Name)', 'نص الرسالة (Message)']
    ];

    approvedStaff.forEach(s => {
      const phone = formatSaudiPhone(s.mobile);
      const customMsg = `السلام عليكم ورحمة الله وبركاته أ. ${s.full_name} المحترم،\n\n📌 *${notifTitle.trim()}*\n${notifMessage.trim()}\n\n— إدارة ثانوية الأمير عبدالمجيد الأولى (1448هـ)`;
      rows.push([
        phone, 
        s.full_name + (s.subject ? ` (${s.subject})` : ''), 
        customMsg
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قائمة الإرسال');

    // Column sizing for neat preview in Excel
    ws['!cols'] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 65 }
    ];

    const fileName = `واتساب_إتقان_تعميم_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    // Also push notification to platform so it appears in teachers' dashboards
    await pushNotification(notifTitle.trim(), notifMessage.trim(), 'general', null);

    alert(`✅ تم تصدير ملف Excel بنجاح لعدد (${approvedStaff.length}) معلم باسم:\n${fileName}\n\nالملف جاهز ومطابق لإضافة كروم للواتساب (العمود A: الجوال، والعمود C: الرسالة).`);
  };

  const exportStaffListExcel = () => {
    const approvedStaff = staff.filter(s => s.is_approved);
    if (approvedStaff.length === 0) {
      alert('لا يوجد معلمون مسجلون لتصديرهم.');
      return;
    }

    const rows: (string | number)[][] = [
      ['رقم الجوال (Phone)', 'اسم المعلم', 'التكليف / الدور', 'المادة / التخصص', 'شواهد النصفي', 'شواهد النهائي', 'درجة النصفي (من 5)', 'درجة النهائي (من 5)']
    ];

    approvedStaff.forEach(s => {
      const phone = formatSaudiPhone(s.mobile);
      const evals = getStaffEvaluations(s.id);
      rows.push([
        phone,
        s.full_name,
        s.role,
        s.subject || 'غير محدد',
        s.drive_link ? 'تم الرفع' : 'لم يُرفع',
        s.drive_link_v2 ? 'تم الرفع' : 'لم يُرفع',
        evals.midterm ? (evals.midterm.total_score / 20).toFixed(1) : 'لم يرصد',
        evals.final ? (evals.final.total_score / 20).toFixed(1) : 'لم يعتمد'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل المعلمين 1448هـ');
    ws['!cols'] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 25 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 }
    ];

    XLSX.writeFile(wb, `بيانات_معلمي_ثانوية_الأمير_عبدالمجيد_1448هـ.xlsx`);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', UserRole.PRINCIPAL)
        .order('created_at', { ascending: false });
      
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (staffData) setStaff(staffData);
      if (evalData) setEvaluations(evalData);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const approveUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من اعتماد حساب هذا المعلم؟')) return;
    setProcessingId(id);
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    if (!error) {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, is_approved: true } : s));
    }
    setProcessingId(null);
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`⚠️ تحذير: سيتم حذف المعلم (${name}) نهائياً مع كافة سجلات التقييم الخاصة به.\n\nهل أنت متأكد من الحذف؟`)) return;
    setProcessingId(id);
    try {
      await supabase.from('evaluations').delete().eq('staff_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) {
        setStaff(prev => prev.filter(s => s.id !== id));
        alert('تم حذف المعلم بنجاح.');
      } else {
        alert('حدث خطأ أثناء الحذف: ' + error.message);
      }
    } catch (e: any) {
      alert('خطأ: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    
    setProcessingId(editingStaff.id);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editingStaff.full_name.trim(),
        mobile: editingStaff.mobile.trim(),
        role: editingStaff.role,
        subject: editingStaff.subject?.trim() || null,
        is_approved: editingStaff.is_approved
      })
      .eq('id', editingStaff.id);

    if (!error) {
      setStaff(prev => prev.map(s => s.id === editingStaff.id ? editingStaff : s));
      setEditingStaff(null);
      alert('✅ تم تحديث بيانات المعلم وتكليفه بنجاح!');
    } else {
      alert('حدث خطأ: ' + error.message);
    }
    setProcessingId(null);
  };

  const getStaffEvaluations = (staffId: string) => {
    const staffEvals = evaluations.filter(e => e.staff_id === staffId);
    const midterm = staffEvals.find(e => e.period === 'midterm') || (staffEvals.length > 0 && !staffEvals[0].period ? staffEvals[0] : null);
    const final = staffEvals.find(e => e.period === 'final');
    return { midterm, final };
  };

  const getFilteredStaff = () => {
    let list = staff.filter(s => s.is_approved);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s => 
        s.full_name.toLowerCase().includes(term) || 
        s.mobile.includes(term) ||
        (s.subject && s.subject.toLowerCase().includes(term))
      );
    }

    if (roleFilter !== 'all') {
      list = list.filter(s => s.role === roleFilter);
    }

    if (filterType === 'evaluated_midterm') {
      list = list.filter(s => !!getStaffEvaluations(s.id).midterm);
    } else if (filterType === 'evaluated_final') {
      list = list.filter(s => !!getStaffEvaluations(s.id).final);
    } else if (filterType === 'pending_eval') {
      list = list.filter(s => {
        const evals = getStaffEvaluations(s.id);
        return (!evals.midterm && s.drive_link) || (!evals.final && s.drive_link_v2);
      });
    } else if (filterType === 'no_file') {
      list = list.filter(s => !s.drive_link && !s.drive_link_v2);
    }

    return list;
  };

  const activeStaff = getFilteredStaff();
  const pendingStaff = staff.filter(s => !s.is_approved);

  const stats = {
    total: staff.filter(s => s.is_approved).length,
    evaluatedMidterm: staff.filter(s => s.is_approved && !!getStaffEvaluations(s.id).midterm).length,
    evaluatedFinal: staff.filter(s => s.is_approved && !!getStaffEvaluations(s.id).final).length,
    pendingEval: staff.filter(s => s.is_approved && (s.is_ready_for_eval || s.is_ready_for_final)).length,
    noFile: staff.filter(s => s.is_approved && !s.drive_link).length
  };

  const getGradeInfo = (score: number) => {
    if (score >= 90) return { label: 'مثالي', points: 5, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (score >= 80) return { label: 'تخطى التوقعات', points: 4, color: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 70) return { label: 'وافق التوقعات', points: 3, color: 'text-amber-600', bg: 'bg-amber-50' };
    if (score >= 60) return { label: 'بحاجة إلى تطوير', points: 2, color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'غير مرضي', points: 1, color: 'text-red-600', bg: 'bg-red-50' };
  };

  const handlePrint = (s: Profile, ev: Evaluation) => {
    setEvaluationToShow({ staff: s, evaluation: ev });
    setTimeout(() => { 
      window.print(); 
      setEvaluationToShow(null); 
    }, 500);
  };

  const sendWhatsAppMessage = () => {
    if (!whatsAppModalStaff) return;
    const s = whatsAppModalStaff;
    const evals = getStaffEvaluations(s.id);
    const targetEval = whatsAppTemplate === 'midterm_reminder' ? evals.midterm : (evals.final || evals.midterm);
    const grade = targetEval ? getGradeInfo(targetEval.total_score) : undefined;

    const formatted = formatSaudiPhone(s.mobile);

    const encodedText = buildWhatsAppMessage(
      whatsAppTemplate,
      s.full_name,
      userProfile.full_name,
      s.role,
      {
        deadline: timeline.midtermEndDate,
        totalScore: targetEval?.total_score,
        gradeLabel: grade?.label,
        comments: targetEval?.comments,
        customText: customWhatsAppText
      }
    );

    window.open(`https://web.whatsapp.com/send?phone=${formatted}&text=${encodedText}`, '_blank');
    setWhatsAppModalStaff(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-cairo text-right" dir="rtl">
      {/* هيدر المدير الرسمي للعام 1448هـ */}
      <header className="bg-[#0f4c4c] text-white pt-8 pb-20 px-4 md:px-6 relative overflow-hidden shadow-2xl no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
           <div className="text-right space-y-0.5 order-2 md:order-1 flex-1">
              <p className="text-[10px] md:text-xs font-bold opacity-90">المملكة العربية السعودية</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">وزارة التعليم</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">الإدارة العامة للتعليم بمحافظة جدة</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-base md:text-lg font-black text-white border-r-4 border-[#00a18e] pr-3">ثانوية الأمير عبدالمجيد الأولى (بنين)</p>
                <span className="bg-white/10 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">لوحة الإدارة 1448هـ</span>
              </div>
           </div>

           <div className="order-1 md:order-2 flex-shrink-0">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-20 md:h-32 object-contain drop-shadow-2xl" alt="Logo" />
           </div>

           <div className="flex flex-col items-center md:items-end gap-2 order-3 flex-1">
              <div className="bg-black/30 px-6 py-3 rounded-2xl border border-white/10 text-center md:text-right shadow-xl">
                <p className="text-[10px] opacity-70 font-bold text-emerald-400">مدير المدرسة المسؤول،</p>
                <p className="text-sm font-black">{userProfile.full_name}</p>
              </div>
              <button onClick={onLogout} className="text-red-300 hover:text-red-100 text-xs font-bold flex items-center gap-1.5 transition-colors group mt-1">
                <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> تسجيل الخروج
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 -mt-10 space-y-8 relative z-20 pb-20 no-print">
        
        {/* بطاقات الإحصائيات السريعة */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
           {[
             { id: 'all', label: 'إجمالي المعلمين', val: stats.total, icon: Users, color: 'bg-slate-100 text-slate-700' },
             { id: 'evaluated_midterm', label: 'تقييم نصفي مرصود', val: stats.evaluatedMidterm, icon: Clock, color: 'bg-emerald-50 text-emerald-700' },
             { id: 'evaluated_final', label: 'تقييم نهائي معتمد', val: stats.evaluatedFinal, icon: Award, color: 'bg-blue-50 text-blue-700' },
             { id: 'pending_eval', label: 'بانتظار الرصد', val: stats.pendingEval, icon: Sparkles, color: 'bg-amber-50 text-amber-700' },
             { id: 'no_file', label: 'لم يرفع الشواهد', val: stats.noFile, icon: FolderX, color: 'bg-rose-50 text-rose-700' }
           ].map((s) => (
             <button 
               key={s.id} 
               onClick={() => { setView('active'); setFilterType(s.id as any); }}
               className={`p-4 md:p-5 rounded-[2rem] bg-white shadow-lg border-2 transition-all flex flex-col md:flex-row items-center gap-3.5 group text-right ${
                 filterType === s.id && view === 'active' 
                   ? 'border-[#0f4c4c] ring-4 ring-[#0f4c4c]/10' 
                   : 'border-transparent hover:border-slate-200'
               }`}
             >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-center md:text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{s.label}</p>
                   <p className="text-xl font-black text-slate-800">{s.val}</p>
                </div>
             </button>
           ))}
        </div>

        {/* أزرار التبويبات الرئيسية والبحث والتصفية */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch">
           <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <button 
                onClick={() => { setView('active'); setFilterType('all'); }} 
                className={`px-4 md:px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  view === 'active' ? 'bg-[#0f4c4c] text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                المعلمين ({stats.total})
              </button>

              <button 
                onClick={() => setView('pending')} 
                className={`px-4 md:px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all relative ${
                  view === 'pending' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                الطلبات الجديدة
                {pendingStaff.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                    {pendingStaff.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setView('timeline')} 
                className={`px-4 md:px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  view === 'timeline' ? 'bg-[#00a18e] text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                الجدول الزمني (1448هـ)
              </button>

              <button 
                onClick={() => setView('notifications')} 
                className={`px-4 md:px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  view === 'notifications' ? 'bg-purple-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Bell className="w-4 h-4" />
                إرسال إشعارات
              </button>
           </div>

           {view === 'active' && (
             <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
               <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 flex items-center px-4 flex-1">
                  <Search className="text-slate-400 ml-2 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="بحث باسم المعلم، التخصص، أو الجوال..." 
                    className="bg-transparent border-none outline-none w-full font-bold text-xs" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
               </div>

               <select
                 value={roleFilter}
                 onChange={(e) => setRoleFilter(e.target.value)}
                 className="bg-white px-4 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-700 outline-none shadow-md"
               >
                 <option value="all">كافة التكليفات والوظائف</option>
                 <option value={UserRole.TEACHER}>معلم</option>
                 <option value={UserRole.TEACHER_ACTIVITY}>معلم مسند له نشاط طلابي</option>
                 <option value={UserRole.TEACHER_HEALTH}>معلم مسند له توجيه صحي</option>
                 <option value={UserRole.COUNSELOR}>موجه طلابي</option>
                 <option value={UserRole.LAB_ASSISTANT}>محضر مختبر</option>
                 <option value={UserRole.VICE_PRINCIPAL}>وكيل مدرسة</option>
               </select>

               <button
                 onClick={exportStaffListExcel}
                 title="تصدير بيانات المعلمين وأرقام الجوال لملف Excel"
                 className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 whitespace-nowrap"
               >
                 <FileSpreadsheet className="w-4 h-4" />
                 تصدير Excel
               </button>
             </div>
           )}
        </div>

        {/* ======================= عرض إرسال الإشعارات والواتساب ======================= */}
        {view === 'notifications' && (
          <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-2xl border border-slate-200 space-y-8 animate-in fade-in duration-300">
            <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3.5 bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-2xl shadow-lg">
                  <Bell className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2">
                    مركز الإشعارات والرسائل الذكية (1448هـ)
                    <span className="bg-purple-100 text-purple-800 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                      واتساب + المنصة
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    إرسال توجيهات للمعلمين، محادثات واتساب مباشرة، وتصدير ملفات Excel للإرسال الجماعي
                  </p>
                </div>
              </div>

              {/* عداد المعلمين المستلمين */}
              <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 text-xs font-black">
                <span className="text-slate-500">المعلمون النشطون:</span>
                <span className="text-[#0f4c4c] bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {staff.filter(s => s.is_approved).length} معلم
                </span>
              </div>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-6 max-w-3xl">
              
              {/* اختيار المستلم */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 block flex items-center justify-between">
                  <span>تحديد المستلم / نطاق الإرسال:</span>
                  {notifRecipient === 'all' ? (
                    <span className="text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg text-[11px] font-black">
                      📢 إرسال جماعي لجميع المعلمين ({staff.filter(s => s.is_approved).length})
                    </span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg text-[11px] font-black">
                      👤 إرسال فردي لمعلم محدد
                    </span>
                  )}
                </label>

                <select
                  value={notifRecipient}
                  onChange={(e) => setNotifRecipient(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-black text-[#0f4c4c] outline-none focus:border-purple-600 transition-colors"
                >
                  <option value="all">📢 تعميم عام لجميع المعلمين (إرسال جماعي)</option>
                  <optgroup label="المعلمون المسجلون والمعتمدون:">
                    {staff.filter(s => s.is_approved).map(s => (
                      <option key={s.id} value={s.id}>
                        👤 {s.full_name} — {s.role} {s.subject ? `(${s.subject})` : ''} - جوال: {s.mobile}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* بطاقة معلومات المعلم المحدد في حال الإرسال الفردي */}
              {notifRecipient !== 'all' && (() => {
                const targetTeacher = staff.find(s => s.id === notifRecipient);
                if (!targetTeacher) return null;
                const formattedPhone = formatSaudiPhone(targetTeacher.mobile);
                return (
                  <div className="bg-emerald-50/80 border-2 border-emerald-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-700" />
                        المعلم المستلم: {targetTeacher.full_name}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-800">
                        التكليف: {targetTeacher.role} | الجوال: <span dir="ltr" className="font-mono font-black">{targetTeacher.mobile}</span> (منسق دولي: <span dir="ltr" className="font-mono font-black text-emerald-900">{formattedPhone}</span>)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendSingleWhatsApp}
                      disabled={!notifTitle.trim() || !notifMessage.trim()}
                      className="bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      فتح محادثة واتساب الآن
                    </button>
                  </div>
                );
              })()}

              {/* قوالب سريعة للعناوين */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 block">عنوان الإشعار / الموضوع:</label>
                  <span className="text-[10px] text-slate-400 font-bold">قوالب سريعة:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'موعد رصد التقييم النصفي 1448هـ',
                    'تذكير برفع شواهد الأداء والملفات',
                    'اعتماد نتيجة التقييم الرسمي',
                    'تعميم بشأن دوام واجتماع المدرسة'
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setNotifTitle(tpl)}
                      className="text-[11px] font-bold bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 transition-colors"
                    >
                      + {tpl}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="اكتب عنوان الإشعار أو التعميم هنا..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-purple-600 focus:bg-white transition-colors"
                />
              </div>

              {/* نص الرسالة */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">نص الرسالة والتوجيه:</label>
                <textarea
                  rows={4}
                  required
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="اكتب تفاصيل التوجيه، الملاحظة، أو الموعد المحدد..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-purple-600 focus:bg-white transition-colors"
                />
              </div>

              {/* ================= صندوق الإرسال الذكي ================= */}
              <div className="pt-2 border-t border-slate-100">
                {notifRecipient === 'all' ? (
                  /* خيارات الإرسال الجماعي (الجميع) */
                  <div className="space-y-4">
                    {/* بطاقة توضيحية لإضافة الكروم */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 font-black mb-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                        <span>ميزة الإرسال الجماعي للواتساب عبر إضافة المتصفح (Chrome Extension):</span>
                      </div>
                      <p className="text-emerald-800 leading-relaxed font-bold">
                        عند الضغط على الزر الأخضر، سيتم توليد وتنزيل ملف <strong>Excel (.xlsx)</strong> متوافق 100% مع إضافة الكروم الخاصة بك:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 font-mono text-[11px] text-emerald-950">
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">العمود A: رقم الجوال (9665...)</div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">العمود B: اسم المعلم والتكليف</div>
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">العمود C: نص الرسالة المخصصة</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* زر تصدير Excel للإضافة */}
                      <button
                        type="button"
                        onClick={exportWhatsAppExcel}
                        className="flex-1 bg-[#128C7E] hover:bg-[#075E54] text-white py-4 px-6 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all active:scale-95"
                      >
                        <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
                        📥 تصدير ملف Excel لإضافة الواتساب التلقائية
                      </button>

                      {/* زر نشر التعميم بالمنصة فقط */}
                      <button
                        type="submit"
                        disabled={sendingNotif}
                        className="bg-purple-700 hover:bg-purple-900 text-white py-4 px-6 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                      >
                        {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        📢 نشر التعميم بالمنصة لجميع المعلمين
                      </button>
                    </div>
                  </div>
                ) : (
                  /* خيارات الإرسال الفردي لمعلم محدد */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* زر الإرسال المباشر للواتساب */}
                      <button
                        type="button"
                        onClick={handleSendSingleWhatsApp}
                        className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white py-4 px-6 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all active:scale-95"
                      >
                        <MessageCircle className="w-5 h-5" />
                        💬 فتح محادثة الواتساب للمعلم مباشرة + حفظ الإشعار
                      </button>

                      {/* زر إرسال إشعار للمنصة فقط */}
                      <button
                        type="submit"
                        disabled={sendingNotif}
                        className="bg-purple-700 hover:bg-purple-900 text-white py-4 px-6 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                      >
                        {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        📢 إرسال إشعار في بروفايل المعلم بالمنصة فقط
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ======================= عرض الجدول الزمني والتعاميم ======================= */}
        {view === 'timeline' && (
          <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-2xl border border-slate-200 space-y-8 animate-in fade-in duration-300">
            <div className="border-b border-slate-100 pb-6 flex items-center gap-3">
              <div className="p-3 bg-[#0f4c4c]/10 text-[#0f4c4c] rounded-2xl">
                <Calendar className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-800">إدارة الجدول الزمني لدورة الأداء والتعاميم (1448هـ)</h3>
                <p className="text-xs text-slate-500 font-bold">تحديد فترات التقييم النصفي والنهائي، وإرسال التعاميم والتنبيهات المباشرة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* فترة التقييم النصفي */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-[#0f4c4c] flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 1. المراجعة نصف السنوية (التقييم النصفي)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-600">{timeline.isMidtermOpen ? 'مفتوح' : 'مغلق'}</span>
                    <input 
                      type="checkbox" 
                      checked={timeline.isMidtermOpen} 
                      onChange={(e) => setTimeline({ ...timeline, isMidtermOpen: e.target.checked })}
                      className="w-5 h-5 accent-[#0f4c4c]" 
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">تاريخ البدء:</label>
                    <input 
                      type="date" 
                      value={timeline.midtermStartDate} 
                      onChange={(e) => setTimeline({ ...timeline, midtermStartDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">تاريخ الانتهاء:</label>
                    <input 
                      type="date" 
                      value={timeline.midtermEndDate} 
                      onChange={(e) => setTimeline({ ...timeline, midtermEndDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                  </div>
                </div>
              </div>

              {/* فترة التقييم النهائي */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-[#00a18e] flex items-center gap-2">
                    <Award className="w-4 h-4" /> 2. التقييم النهائي المعتمد (نهاية العام)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-600">{timeline.isFinalOpen ? 'مفتوح' : 'مغلق'}</span>
                    <input 
                      type="checkbox" 
                      checked={timeline.isFinalOpen} 
                      onChange={(e) => setTimeline({ ...timeline, isFinalOpen: e.target.checked })}
                      className="w-5 h-5 accent-[#00a18e]" 
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">تاريخ البدء:</label>
                    <input 
                      type="date" 
                      value={timeline.finalStartDate} 
                      onChange={(e) => setTimeline({ ...timeline, finalStartDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">تاريخ الانتهاء:</label>
                    <input 
                      type="date" 
                      value={timeline.finalEndDate} 
                      onChange={(e) => setTimeline({ ...timeline, finalEndDate: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* نص التعميم الموجه لبروفايل المعلمين */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
              <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#0f4c4c]" /> نص التعميم / الإشعار المعروض في بروفايل المعلمين (1448هـ):
              </label>
              <textarea 
                value={timeline.activeAnnouncement}
                onChange={(e) => setTimeline({ ...timeline, activeAnnouncement: e.target.value })}
                rows={3}
                placeholder="اكتب التوجيهات أو الملاحظات التي تود عرضها لجميع المعلمين..."
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#0f4c4c]"
              />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => saveTimeline(timeline)}
                className="bg-[#0f4c4c] hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" /> حفظ ونشر الجدول الزمني والتعاميم 1448هـ
              </button>
            </div>
          </div>
        )}

        {/* ======================= عرض قائمة المعلمين ======================= */}
        {view !== 'timeline' && view !== 'notifications' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[450px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 text-[#0f4c4c] animate-spin" />
                <p className="text-slate-400 font-bold">جاري تحميل بيانات المعلمين والتقييمات للعام 1448هـ...</p>
              </div>
            ) : (
              <div className="p-6 md:p-10">
                {(view === 'active' ? activeStaff : pendingStaff).length === 0 ? (
                  <div className="text-center py-20">
                    <Users className="w-16 h-16 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold text-sm">لا يوجد معلمين يطابقون خيارات البحث أو التصفية الحالية.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(view === 'active' ? activeStaff : pendingStaff).map(s => {
                      const { midterm, final } = getStaffEvaluations(s.id);
                      const midtermGrade = midterm ? getGradeInfo(midterm.total_score) : null;
                      const finalGrade = final ? getGradeInfo(final.total_score) : null;
                      const isReadyMid = s.is_ready_for_eval && !midterm;
                      const isReadyFin = s.is_ready_for_final && !final;
                      
                      return (
                        <div 
                          key={s.id} 
                          className={`bg-white p-6 rounded-[2.5rem] border-2 flex flex-col justify-between gap-5 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden ${
                            isReadyFin ? 'border-blue-500 ring-2 ring-blue-500/10' :
                            isReadyMid ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 
                            'border-slate-100'
                          }`}
                        >
                          {/* شريط الإشعار الفوري */}
                          {isReadyFin ? (
                            <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-[9px] font-black rounded-bl-2xl flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-3 h-3" /> جاهز للتقييم النهائي
                            </div>
                          ) : isReadyMid ? (
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white px-4 py-1 text-[9px] font-black rounded-bl-2xl flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-3 h-3" /> جاهز للتقييم النصفي
                            </div>
                          ) : null}

                          <div>
                            {/* بطاقة معلومات المعلم والأزرار العلوية */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-[#0f4c4c]/10 text-[#0f4c4c] group-hover:bg-[#0f4c4c] group-hover:text-white flex items-center justify-center font-black text-lg transition-colors flex-shrink-0">
                                  {s.full_name.charAt(0)}
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-slate-800 text-base leading-snug">{s.full_name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    {s.role} {s.subject ? `(${s.subject})` : ''}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-400">{s.mobile}</p>
                                </div>
                              </div>

                              {/* زر تعديل وحذف المعلم */}
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setEditingStaff(s)} 
                                  title="تعديل بيانات وتكليف المعلم"
                                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 border border-slate-200 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => deleteUser(s.id, s.full_name)} 
                                  title="حذف المعلم نهائياً"
                                  className="p-2 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl text-red-600 border border-red-100 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* ملخص نتائج التقييمين (نصفي ونهائي) */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                              <div className="text-right border-l border-slate-200 pl-2">
                                <p className="text-[9px] font-black text-slate-400">التقييم النصفي</p>
                                <p className={`text-xs font-black ${midtermGrade?.color || 'text-slate-500'}`}>
                                  {midterm ? `${midtermGrade?.label} (${(midterm.total_score / 20).toFixed(1)})` : 'لم يُرصد'}
                                </p>
                              </div>
                              <div className="text-right pr-2">
                                <p className="text-[9px] font-black text-slate-400">التقييم النهائي</p>
                                <p className={`text-xs font-black ${finalGrade?.color || 'text-slate-500'}`}>
                                  {final ? `${finalGrade?.label} (${(final.total_score / 20).toFixed(1)})` : 'لم يُعتمد'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* أزرار الإجراءات (تقييم نصفي / نهائي / واتساب / طباعة) */}
                          <div className="space-y-2">
                            {view === 'pending' ? (
                              <button 
                                disabled={processingId === s.id} 
                                onClick={() => approveUser(s.id)} 
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                              >
                                {processingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                اعتماد طلب المعلم
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => setSelectedStaffForEval({ staff: s, period: 'midterm' })} 
                                  className={`py-2.5 px-3 rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                                    midterm 
                                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                      : isReadyMid 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' 
                                        : 'bg-[#0f4c4c] hover:bg-black text-white'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  {midterm ? 'تعديل النصفي' : 'رصد النصفي'}
                                </button>

                                <button 
                                  onClick={() => setSelectedStaffForEval({ staff: s, period: 'final' })} 
                                  className={`py-2.5 px-3 rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                                    final 
                                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                                      : isReadyFin
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
                                        : 'bg-[#00a18e] hover:bg-[#008f7e] text-white'
                                  }`}
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  {final ? 'تعديل النهائي' : 'رصد النهائي'}
                                </button>
                              </div>
                            )}

                            {/* أزرار الواتساب والطباعة */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <button 
                                onClick={() => setWhatsAppModalStaff(s)}
                                className="flex items-center gap-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                إشعار واتساب
                              </button>

                              <div className="flex gap-1">
                                {midterm && (
                                  <button 
                                    onClick={() => handlePrint(s, midterm)} 
                                    title="طباعة بطاقة التقييم النصفي" 
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                )}
                                {final && (
                                  <button 
                                    onClick={() => handlePrint(s, final)} 
                                    title="طباعة التقرير النهائي المعتمد" 
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================= نافذة تعديل بيانات وتكليف المعلم ======================= */}
      {editingStaff && (
        <div className="fixed inset-0 bg-[#0f4c4c]/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <UserCog className="text-[#0f4c4c]" /> تعديل بيانات المعلم
              </h3>
              <button onClick={() => setEditingStaff(null)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffEdit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">الاسم الرباعي:</label>
                <input 
                  type="text" 
                  value={editingStaff.full_name} 
                  onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#0f4c4c]" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">رقم الجوال:</label>
                  <input 
                    type="text" 
                    value={editingStaff.mobile} 
                    onChange={(e) => setEditingStaff({ ...editingStaff, mobile: e.target.value })}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#0f4c4c]" 
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">التخصص / المادة:</label>
                  <input 
                    type="text" 
                    value={editingStaff.subject || ''} 
                    onChange={(e) => setEditingStaff({ ...editingStaff, subject: e.target.value })}
                    placeholder="مثال: رياضيات"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#0f4c4c]" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">الوظيفة التعليمية / التكليف المسند:</label>
                <select 
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as UserRole })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-[#0f4c4c] outline-none focus:border-[#0f4c4c]"
                >
                  <option value={UserRole.TEACHER}>معلم (نموذج التدريس العام)</option>
                  <option value={UserRole.TEACHER_ACTIVITY}>معلم مسند له نشاط طلابي (نموذج النشاط)</option>
                  <option value={UserRole.TEACHER_HEALTH}>معلم مسند له توجيه صحي (نموذج التوجيه الصحي)</option>
                  <option value={UserRole.COUNSELOR}>موجه طلابي</option>
                  <option value={UserRole.LAB_ASSISTANT}>محضر مختبر</option>
                  <option value={UserRole.VICE_PRINCIPAL}>وكيل مدرسة</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="approveCheckbox"
                  checked={editingStaff.is_approved}
                  onChange={(e) => setEditingStaff({ ...editingStaff, is_approved: e.target.checked })}
                  className="w-4 h-4 accent-[#0f4c4c]"
                />
                <label htmlFor="approveCheckbox" className="text-xs font-black text-slate-700 cursor-pointer">
                  حساب معتمد ونشط في المنصة
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={processingId === editingStaff.id}
                  className="flex-1 bg-[#0f4c4c] hover:bg-black text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {processingId === editingStaff.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ التعديلات
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingStaff(null)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= نافذة إرسال رسائل الواتساب الذكية ======================= */}
      {whatsAppModalStaff && (
        <div className="fixed inset-0 bg-[#0f4c4c]/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <MessageCircle className="text-emerald-600" /> إرسال إشعار واتساب (1448هـ)
              </h3>
              <button onClick={() => setWhatsAppModalStaff(null)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-500 mb-4">
              المعلم: <span className="text-[#0f4c4c] font-black">{whatsAppModalStaff.full_name}</span> ({whatsAppModalStaff.mobile})
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-2">اختر قالب الرسالة:</label>
                <div className="space-y-2">
                  {[
                    { id: 'midterm_reminder', label: 'تذكير برفع شواهد التقييم النصف سنوي (1448هـ)' },
                    { id: 'final_reminder', label: 'تذكير برفع ملف التقييم النهائي (1448هـ)' },
                    { id: 'eval_result', label: 'إشعار بالنتيجة والتقدير العام المعتمد' },
                    { id: 'custom', label: 'رسالة أو تعميم مخصص' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setWhatsAppTemplate(tpl.id as any)}
                      className={`w-full p-3 rounded-xl text-right text-xs font-bold border transition-all flex items-center justify-between ${
                        whatsAppTemplate === tpl.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-black'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tpl.label}
                      {whatsAppTemplate === tpl.id && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {whatsAppTemplate === 'custom' && (
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">نص الرسالة المخصصة:</label>
                  <textarea
                    rows={3}
                    value={customWhatsAppText}
                    onChange={(e) => setCustomWhatsAppText(e.target.value)}
                    placeholder="اكتب التوجيه أو الملاحظة الخاصة للمعلم هنا..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={sendWhatsAppMessage}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Phone className="w-4 h-4" /> فتح محادثة الواتساب الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال التقييم المزدوج */}
      {selectedStaffForEval && (
        <EvaluationModal 
          staff={selectedStaffForEval.staff} 
          initialPeriod={selectedStaffForEval.period}
          onClose={() => { 
            setSelectedStaffForEval(null); 
            fetchData(); 
          }} 
        />
      )}

      {/* تقرير الطباعة الرسمي */}
      {evaluationToShow && (
        <PrintableReport 
          staff={evaluationToShow.staff} 
          evaluation={evaluationToShow.evaluation} 
          principalName={userProfile.full_name} 
        />
      )}
    </div>
  );
};

export default PrincipalDashboard;
