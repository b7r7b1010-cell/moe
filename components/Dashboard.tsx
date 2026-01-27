
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, Evaluation } from '../types';
import { 
  LogOut, ExternalLink, Send, ShieldAlert, 
  Info, Link as LinkIcon, BookOpen, 
  CheckCircle2, FileCheck, ArrowUpLeft, ChevronLeft,
  LayoutTemplate, MousePointer2, Sparkles, Trash2, 
  Edit3, Lock, Clock, AlertCircle, Settings
} from 'lucide-react';

const Dashboard: React.FC<{ userProfile: Profile }> = ({ userProfile }) => {
  const [driveLink, setDriveLink] = useState(userProfile.drive_link || '');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastEval, setLastEval] = useState<Evaluation | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile>(userProfile);

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

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userProfile.id)
      .single();
    if (profileData) {
      setCurrentProfile(profileData);
      setDriveLink(profileData.drive_link || '');
    }
  };

  const handleUpdateLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lastEval) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ drive_link: driveLink })
      .eq('id', userProfile.id);
    
    if (error) alert(error.message);
    else {
      alert('تم تحديث بيانات الشواهد بنجاح');
      fetchLatestEvaluation();
    }
    setSaving(false);
  };

  const handleDeleteLink = async () => {
    if (lastEval) {
      alert('لا يمكن الحذف بعد صدور التقييم النهائي');
      return;
    }
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف الرابط الحالي؟')) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ drive_link: null })
      .eq('id', userProfile.id);
    
    if (error) alert(error.message);
    else {
      setDriveLink('');
      fetchLatestEvaluation();
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] pb-20">
      {/* Official State Header */}
      <header className="bg-[#0f4c4c] text-white pt-8 pb-16 px-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
          <Sparkles className="absolute top-10 left-1/4 w-32 h-32 rotate-45" />
          <Settings className="absolute bottom-10 right-1/4 w-48 h-48 -rotate-12" />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
           {/* Section 1: Right Side - Official Text (Amiri Font) */}
           <div className="text-center md:text-right space-y-1 font-official min-w-[250px]">
              <p className="text-sm font-bold tracking-wide">المملكة العربية السعودية</p>
              <p className="text-sm">وزارة التعليم</p>
              <p className="text-sm">الإدارة العامة للتعليم بمحافظة جدة</p>
              <div className="pt-2 border-t border-white/10 mt-2">
                 <p className="text-lg font-black tracking-tighter">ثانوية الأمير عبدالمجيد الأولى</p>
              </div>
           </div>

           {/* Section 2: Center Side - Logo & System Title */}
           <div className="flex flex-col items-center gap-4">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-24 md:h-28 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]" alt="Logo" />
              <div className="bg-white/10 px-6 py-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner text-center">
                <p className="text-xs md:text-sm font-black tracking-widest text-emerald-100 uppercase">
                  ( بوابة الموظف - نظام إدارة الأداء الوظيفي )
                </p>
              </div>
           </div>

           {/* Section 3: Left Side - User Info & Action */}
           <div className="flex flex-col items-center md:items-end gap-4 min-w-[250px]">
              <div className="bg-black/20 p-4 rounded-3xl border border-white/5 backdrop-blur-sm text-right w-full md:w-auto">
                 <p className="text-[10px] font-bold text-emerald-400 mb-1">المستخدم الحالي:</p>
                 <p className="text-sm font-black text-white">{currentProfile.full_name}</p>
                 <p className="text-[10px] text-white/60 font-medium mt-1 uppercase tracking-widest">{currentProfile.role}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl text-xs hover:bg-red-500/20 hover:border-red-500/30 transition-all flex items-center gap-3 group font-black">
                تسجيل الخروج
                <LogOut className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-10 space-y-10 relative z-20">
        
        {/* Iconic Canvas-Style Banner for External Platform */}
        <div className="bg-[#00a18e] rounded-[3rem] p-6 md:p-10 text-white shadow-[0_30px_60px_-15px_rgba(0,161,142,0.3)] relative overflow-hidden border border-white/20">
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="flex flex-col xl:flex-row items-center justify-between gap-10">
             {/* Left Column: Visual Label */}
             <div className="flex items-center gap-6 text-right w-full xl:w-auto">
                <div className="bg-white/20 p-5 rounded-[2rem] backdrop-blur-xl border border-white/30 shadow-2xl">
                   <LayoutTemplate className="w-10 h-10 text-white" />
                </div>
                <div>
                   <span className="bg-white/20 px-4 py-1 rounded-full text-[10px] font-black tracking-[0.2em] mb-2 inline-block">PLATFORM</span>
                   <h2 className="text-2xl md:text-3xl font-black leading-none mb-2">المنصة الخارجية لإعداد التقارير</h2>
                   <p className="text-white/70 text-sm font-medium">ابدأ الآن بتجهيز ملفاتك الرقمية وفق المعايير</p>
                </div>
             </div>

             {/* Center Column: Digital Steps */}
             <div className="flex-1 w-full bg-black/10 rounded-[2.5rem] p-6 border border-white/5 backdrop-blur-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {[
                     { step: "01", text: "تعبئة البيانات" },
                     { step: "02", text: "توليد ملف PDF" },
                     { step: "03", text: "رفع الشواهد للـ Drive" }
                   ].map((item, idx) => (
                     <div key={idx} className="flex items-center gap-4 group/step">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xs font-black border border-white/20 group-hover/step:bg-white group-hover/step:text-[#00a18e] transition-all">
                          {item.step}
                        </div>
                        <p className="text-[11px] font-bold opacity-80 uppercase leading-snug">{item.text}</p>
                     </div>
                   ))}
                </div>
             </div>

             {/* Right Column: CTA */}
             <a href="#" target="_blank" className="w-full xl:w-auto bg-white text-[#00a18e] px-10 py-5 rounded-[2rem] font-black text-sm flex items-center justify-center gap-4 shadow-2xl hover:scale-105 active:scale-95 transition-all group/btn">
                دخول المنصة <MousePointer2 className="w-5 h-5 group-hover/btn:-translate-y-1 transition-transform" />
             </a>
          </div>
        </div>

        {/* Digital Control Center Card */}
        <div className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-2xl border border-slate-100 relative overflow-hidden">
          {!lastEval ? (
            <div className="space-y-12">
               <div className="bg-amber-50/50 border border-amber-200/50 p-6 rounded-[2rem] flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-amber-100 p-3 rounded-2xl"><ShieldAlert className="w-6 h-6 text-amber-600" /></div>
                  <div className="text-right flex-1">
                     <p className="text-xs font-black text-amber-900 mb-1 tracking-wide">تنبيه الخصوصية الرقمي</p>
                     <p className="text-[11px] text-amber-800/70 font-medium">
                        يرجى التأكد من تغيير إعدادات المجلد في Drive إلى <span className="underline font-bold">"أي شخص لديه الرابط"</span>.
                     </p>
                  </div>
                  <img src="https://img.icons8.com/color/48/google-drive--v2.png" className="h-10 opacity-40 grayscale" alt="Drive" />
               </div>

               <div className="text-center space-y-4">
                  <div className="bg-[#f0f9f8] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border border-[#00a18e]/10">
                     <LinkIcon className="w-10 h-10 text-[#00a18e]" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">إرسال رابط الشواهد</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">التزامك برفع الشواهد يساعد في دقة التقييم</p>
               </div>

               <form onSubmit={handleUpdateLink} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 flex items-center gap-2 mr-2">
                           <BookOpen className="w-3.5 h-3.5" /> المسمى الوظيفي / التخصص
                        </label>
                        <input type="text" placeholder="مثال: معلم تقنية رقمية" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-[#00a18e] outline-none text-sm font-bold shadow-inner transition-all" value={subject} onChange={(e) => setSubject(e.target.value)} />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 flex items-center gap-2 mr-2">
                           <LinkIcon className="w-3.5 h-3.5" /> رابط مجلد GOOGLE DRIVE
                        </label>
                        <div className="relative">
                           <img src="https://img.icons8.com/color/48/google-drive--v2.png" className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 opacity-60" alt="Drive" />
                           <input type="url" required placeholder="https://drive.google.com/..." className="w-full pr-16 pl-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] focus:bg-white focus:border-[#00a18e] outline-none text-sm font-sans dir-ltr text-left shadow-inner transition-all" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} />
                        </div>
                     </div>
                  </div>
                  <button disabled={saving} className="w-full bg-[#0f4c4c] text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-teal-900/20 hover:bg-[#0d3d3d] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50">
                     {saving ? 'جاري الحفظ...' : 'اعتماد إرسال الشواهد للمدير'} {!saving && <ChevronLeft className="w-6 h-6" />}
                  </button>
               </form>
            </div>
          ) : (
            <div className="text-center py-10 space-y-6">
               <div className="bg-emerald-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
               </div>
               <h3 className="text-3xl font-black text-slate-800">تم اعتماد التقييم بنجاح</h3>
               <p className="text-sm text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">
                  تم رصد الدرجة النهائية وإغلاق ملف التقييم لهذا العام. يمكنك مراجعة النتيجة في البطاقة أدناه.
               </p>
            </div>
          )}
        </div>

        {/* Dynamic Tracking Hub */}
        <div className="space-y-8">
           <div className="flex items-center gap-4 px-6">
              <div className="h-px bg-slate-200 flex-1"></div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">مركز متابعة الإنجاز الرقمي</p>
              <div className="h-px bg-slate-200 flex-1"></div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Evidence Status Card */}
              <div className={`bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 relative group transition-all hover:scale-[1.02] ${!currentProfile.drive_link ? 'opacity-40 grayscale' : ''}`}>
                 <div className="flex justify-between items-start mb-8">
                    <div className="bg-emerald-50 p-4 rounded-2xl"><LinkIcon className="w-8 h-8 text-emerald-600" /></div>
                    <div className="text-right">
                       {lastEval ? (
                          <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2">
                             <Lock className="w-3.5 h-3.5" /> الملف مقفل
                          </span>
                       ) : currentProfile.drive_link ? (
                          <span className="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 animate-pulse">
                             <Clock className="w-3.5 h-3.5" /> بانتظار المدير
                          </span>
                       ) : (
                          <span className="bg-slate-50 text-slate-300 px-4 py-1.5 rounded-full text-[10px] font-black">شاغر</span>
                       )}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="font-black text-slate-800 text-lg">مستودع الشواهد الرقمي</h4>
                    {currentProfile.drive_link ? (
                       <p className="text-[10px] text-emerald-600 font-sans truncate bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50 select-all">
                          {currentProfile.drive_link}
                       </p>
                    ) : (
                       <p className="text-[11px] text-slate-400 font-bold italic">يرجى رفع رابط Google Drive الخاص بك لبدء التقييم</p>
                    )}
                 </div>
                 {currentProfile.drive_link && (
                    <div className="mt-8 flex items-center gap-4">
                       <a href={currentProfile.drive_link} target="_blank" className="flex-1 bg-[#0f4c4c] text-white py-4 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-[#0d3d3d] shadow-lg shadow-teal-900/10">
                          <ExternalLink className="w-4 h-4" /> تصفح الملفات
                       </a>
                       {!lastEval && (
                          <button onClick={handleDeleteLink} className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                             <Trash2 className="w-5 h-5" />
                          </button>
                       )}
                    </div>
                 )}
              </div>

              {/* Evaluation Status Card */}
              <div className={`bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 relative group transition-all hover:scale-[1.02] ${!lastEval ? 'opacity-40 grayscale' : ''}`}>
                 <div className="flex justify-between items-start mb-8">
                    <div className="bg-[#0f4c4c]/5 p-4 rounded-2xl"><FileCheck className="w-8 h-8 text-[#0f4c4c]" /></div>
                    <div className="text-right">
                       {lastEval ? (
                          <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2">
                             <CheckCircle2 className="w-3.5 h-3.5" /> نتيجة معتمدة
                          </span>
                       ) : (
                          <span className="bg-slate-50 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black">بانتظار الرصد</span>
                       )}
                    </div>
                 </div>
                 <div className="flex items-center gap-8">
                    <div className="relative w-24 h-24 shrink-0">
                       <svg className="w-full h-full -rotate-90">
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                          <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={264} strokeDashoffset={lastEval ? 264 - (264 * lastEval.total_score) / 100 : 264} className="text-[#00a18e] transition-all duration-1000" strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-[#0f4c4c]">
                          {lastEval ? lastEval.total_score : '--'}
                       </div>
                    </div>
                    <div className="text-right flex-1 space-y-2">
                       <h4 className="font-black text-slate-800 text-lg">مؤشر الأداء الوظيفي</h4>
                       {lastEval ? (
                          <p className="text-[11px] font-bold text-slate-500">صدر بتاريخ {new Date(lastEval.created_at).toLocaleDateString('ar-SA')}</p>
                       ) : (
                          <p className="text-[11px] font-bold text-slate-400 italic">سيتم عرض الدرجة هنا فور الاعتماد</p>
                       )}
                    </div>
                 </div>
                 {lastEval && (
                    <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                       <p className="text-[10px] text-emerald-800 font-black leading-relaxed">
                          تهانينا! تم إتمام التقييم. يمكنك طلب نسخة ورقية من الإدارة عند الحاجة.
                       </p>
                    </div>
                 )}
              </div>
           </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
