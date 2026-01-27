
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, Evaluation } from '../types';
import { 
  LogOut, ExternalLink, ShieldAlert, 
  Link as LinkIcon, BookOpen, 
  CheckCircle2, FileCheck, ChevronLeft,
  LayoutTemplate, MousePointer2, Trash2, 
  Lock, Clock, ShieldCheck, Info, Sparkles, Send, Lightbulb,
  FileSpreadsheet, FileText, LayoutDashboard, AlertTriangle
} from 'lucide-react';

const Dashboard: React.FC<{ userProfile: Profile }> = ({ userProfile }) => {
  const [driveLink, setDriveLink] = useState(userProfile.drive_link || '');
  const [driveLinkV2, setDriveLinkV2] = useState(userProfile.drive_link_v2 || '');
  const [saving, setSaving] = useState(false);
  const [lastEval, setLastEval] = useState<Evaluation | null>(null);

  useEffect(() => {
    fetchLatestEvaluation();
  }, []);

  const fetchLatestEvaluation = async () => {
    const { data: evalData } = await supabase
      .from('evaluations')
      .select('*')
      .eq('staff_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (evalData) setLastEval(evalData);
  };

  const getGradeInfo = (score: number) => {
    let points = 1;
    let label = 'غير مرضي';
    let color = 'text-red-600';
    if (score >= 90) { points = 5; label = 'ممتاز'; color = 'text-emerald-600'; }
    else if (score >= 80) { points = 4; label = 'جيد جداً'; color = 'text-blue-600'; }
    else if (score >= 70) { points = 3; label = 'جيد'; color = 'text-amber-600'; }
    else if (score >= 60) { points = 2; label = 'مرضي'; color = 'text-orange-600'; }
    return { label, points, color };
  };

  const handleUpdateLink = async (isV2: boolean) => {
    setSaving(true);
    const updateData = isV2 ? { drive_link_v2: driveLinkV2 } : { drive_link: driveLink };
    const { error } = await supabase.from('profiles').update(updateData).eq('id', userProfile.id);
    if (error) alert(error.message);
    else {
      alert('تم التحديث بنجاح');
      fetchLatestEvaluation();
    }
    setSaving(false);
  };

  const grade = lastEval ? getGradeInfo(lastEval.total_score) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-cairo text-right" dir="rtl">
      {/* هيدر رسمي متوازن */}
      <header className="bg-[#0f4c4c] text-white pt-8 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
           {/* اليمين: البيانات الرسمية */}
           <div className="text-right space-y-0.5 order-2 md:order-1 flex-1">
              <p className="text-[10px] md:text-xs font-bold opacity-90">المملكة العربية السعودية</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">وزارة التعليم</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-sm md:text-lg font-black mt-2 text-[#00a18e] border-r-4 border-[#00a18e] pr-3">ثانوية الأمير عبدالمجيد الأولى</p>
           </div>

           {/* الوسط: الشعار */}
           <div className="order-1 md:order-2 flex-shrink-0">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-24 md:h-32 object-contain drop-shadow-2xl" alt="Logo" />
           </div>

           {/* اليسار: معلومات المستخدم */}
           <div className="flex flex-col items-center md:items-end gap-2 order-3 flex-1">
              <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-center md:text-right">
                <p className="text-[10px] opacity-70 font-bold">مرحباً بك،</p>
                <p className="text-sm font-black">{userProfile.full_name}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="text-red-300 hover:text-red-100 text-[10px] font-bold flex items-center gap-1 transition-colors">
                <LogOut className="w-3 h-3" /> تسجيل الخروج
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 -mt-10 space-y-6 relative z-20">
        
        {/* قسم المساعد والتعليمات - تصميم مدمج */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <a href="https://majestic-basbousa-9de5cc.netlify.app/" target="_blank" rel="noreferrer" 
                className="group h-full bg-[#00a18e] hover:bg-[#008f7e] rounded-[2.5rem] p-8 shadow-xl transition-all flex flex-col items-center justify-center text-center text-white border-4 border-white">
                <div className="bg-white p-4 rounded-2xl mb-4 group-hover:rotate-12 transition-transform shadow-lg">
                   <LayoutDashboard className="w-8 h-8 text-[#00a18e]" />
                </div>
                <h3 className="text-xl font-black mb-1">المنصة الخارجية</h3>
                <p className="text-xs font-bold opacity-80 mb-4">لإعداد تقاريرك المهنية بسهولة</p>
                <div className="bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2">دخول المنصة <ExternalLink className="w-3 h-3" /></div>
             </a>
          </div>

          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 flex flex-col justify-center">
             <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
               <Info className="w-5 h-5 text-[#0f4c4c]" /> آلية العمل الصحيحة:
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { t: 'تعبئة البيانات بالمنصة الخارجية.', i: FileText },
                  { t: 'حفظ التقرير بصيغة PDF.', i: FileSpreadsheet },
                  { t: 'رفعه لمجلد Google Drive الخاص بك.', i: LinkIcon }
                ].map((s, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <span className="w-7 h-7 bg-[#0f4c4c] text-white rounded-full flex items-center justify-center text-xs font-black">{idx + 1}</span>
                    <p className="text-xs font-bold text-slate-600 leading-tight">{s.t}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* التنبيه الأمني - المحاكاة للصورة التي أرسلتها */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 text-center relative overflow-hidden group">
           <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-amber-50 shadow-inner transition-transform group-hover:scale-110">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
           </div>
           <h2 className="text-2xl font-black text-amber-900 mb-2 flex items-center justify-center gap-2">
              تنبيه أمني هام جداً! <Lock className="w-5 h-5" />
           </h2>
           <p className="text-slate-600 font-bold mb-4">لضمان نجاح التقييم، يجب ضبط إعدادات المشاركة للمجلد لتكون:</p>
           <p className="text-xl md:text-3xl font-black text-red-600 mb-8 uppercase tracking-tighter">"أي شخص لديه الرابط" (Anyone with the link)</p>
           
           <div className="max-w-lg mx-auto bg-slate-100 p-3 rounded-[2rem] border-2 border-dashed border-slate-300 relative">
              <img src="https://up6.cc/2026/01/17695116652711.png" className="w-full h-auto rounded-2xl shadow-lg border-4 border-white" alt="Drive Permissions Guide" />
              <div className="absolute inset-0 bg-[#0f4c4c]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
           </div>
        </div>

        {/* ملخص الأداء - إن وُجد */}
        {lastEval && (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border-2 border-[#0f4c4c]/5 flex flex-col md:flex-row items-center gap-8">
             <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full -rotate-90">
                   <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                   <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * lastEval.total_score) / 100} className={`${grade?.color.replace('text-', 'stroke-')} transition-all duration-1000`} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                   <span className="text-2xl font-black text-[#0f4c4c]">{grade?.points}</span>
                   <span className="text-[8px] font-bold text-slate-400">من 5</span>
                </div>
             </div>
             <div className="flex-1 text-center md:text-right">
                <div className="flex items-center gap-3 mb-1 justify-center md:justify-start">
                   <h2 className={`text-xl font-black ${grade?.color}`}>مستوى الأداء: {grade?.label}</h2>
                   <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500">{lastEval.total_score}%</span>
                </div>
                <p className="text-xs text-slate-500 font-bold">نوصي بمراجعة ملاحظات المدير في الأسفل لتحسين ملفك المهني.</p>
             </div>
             <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 text-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-[10px] font-black text-emerald-800">الاعتماد: نهائي</p>
             </div>
          </div>
        )}

        {/* الروابط - تصميم متقابل */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-200 ${lastEval ? 'opacity-60 pointer-events-none' : ''}`}>
             <div className="flex justify-between items-center mb-4">
                <div className="bg-slate-100 p-2 rounded-xl"><LinkIcon className="text-slate-400 w-5 h-5" /></div>
                <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500">المجلد الأساسي</span>
             </div>
             <input type="url" disabled={!!lastEval} value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="رابط Google Drive..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-sans text-xs dir-ltr mb-4" />
             {!lastEval && (
               <button onClick={() => handleUpdateLink(false)} disabled={saving} className="w-full bg-[#0f4c4c] text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                 <Send className="w-4 h-4" /> اعتماد المجلد
               </button>
             )}
             {lastEval && <div className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-2 py-2"><Lock className="w-3 h-3" /> تم القفل بعد التقييم</div>}
          </div>

          <div className={`bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-emerald-500 relative overflow-hidden ${!lastEval ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
             <div className="flex justify-between items-center mb-4">
                <div className="bg-emerald-50 p-2 rounded-xl"><Sparkles className="text-emerald-500 w-5 h-5" /></div>
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-tighter">تحسين الأداء</span>
             </div>
             <input type="url" value={driveLinkV2} onChange={(e) => setDriveLinkV2(e.target.value)} placeholder="رابط المجلد الجديد (بعد التحسين)..." className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-2xl outline-none font-sans text-xs dir-ltr mb-4" />
             <button onClick={() => handleUpdateLink(true)} disabled={saving} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                <ChevronLeft className="w-4 h-4" /> إرسال نسخة المراجعة
             </button>
          </div>
        </div>

        {/* الملحوظات */}
        {lastEval && (
          <div className="bg-[#0f4c4c] p-6 rounded-[2.5rem] text-white shadow-xl flex items-center gap-5 border-4 border-white/5">
             <div className="bg-white/10 p-3 rounded-2xl flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-emerald-400" />
             </div>
             <div className="flex-1">
                <p className="text-[10px] font-bold opacity-60 mb-1 tracking-widest uppercase">توصيات القيادة المدرسية:</p>
                <p className="text-sm font-black italic">"{lastEval.comments || 'نثمن جهودكم المهنية المتميزة، وننصح بالاستمرار على هذا النهج التطويري.'}"</p>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
