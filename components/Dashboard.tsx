
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, Evaluation } from '../types';
import { 
  LogOut, ExternalLink, ShieldAlert, 
  Link as LinkIcon, BookOpen, 
  CheckCircle2, FileCheck, ChevronLeft,
  LayoutTemplate, MousePointer2, Trash2, 
  Lock, Clock, ShieldCheck, Info
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

  const getGradeInfo = (score: number) => {
    const ratingFromFive = (score / 20).toFixed(1);
    if (score >= 90) return { 
      label: 'ممتاز', 
      rating: `${ratingFromFive}/5`, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-600', 
      border: 'border-emerald-100',
      description: 'أداء يفوق التوقعات بشكل استثنائي.' 
    };
    if (score >= 80) return { 
      label: 'جيد جداً', 
      rating: `${ratingFromFive}/5`, 
      color: 'text-blue-600', 
      bg: 'bg-blue-600', 
      border: 'border-blue-100',
      description: 'أداء يتجاوز التوقعات في معظم الأحيان.' 
    };
    if (score >= 70) return { 
      label: 'جيد', 
      rating: `${ratingFromFive}/5`, 
      color: 'text-amber-600', 
      bg: 'bg-amber-600', 
      border: 'border-amber-100',
      description: 'أداء يلبي التوقعات المطلوبة.' 
    };
    if (score >= 60) return { 
      label: 'مرضي', 
      rating: `${ratingFromFive}/5`, 
      color: 'text-orange-600', 
      bg: 'bg-orange-600', 
      border: 'border-orange-100',
      description: 'أداء أقل من التوقعات، يحتاج إلى تحسين.' 
    };
    return { 
      label: 'غير مرضي', 
      rating: `${ratingFromFive}/5`, 
      color: 'text-red-600', 
      bg: 'bg-red-600', 
      border: 'border-red-100',
      description: 'أداء ضعيف جداً ولا يلبي المعايير الدنيا.' 
    };
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

  const grade = lastEval ? getGradeInfo(lastEval.total_score) : null;

  return (
    <div className="min-h-screen bg-[#f4f7f6] pb-20 font-cairo text-right" dir="rtl">
      <header className="bg-[#0f4c4c] text-white pt-10 pb-20 px-8 relative overflow-hidden border-b-4 border-[#00a18e]">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
        </div>

        <div className="max-w-7xl mx-auto flex justify-between items-start relative z-10">
           <div className="text-right space-y-0.5 font-cairo">
              <p className="text-sm font-bold tracking-tight">المملكة العربية السعودية</p>
              <p className="text-sm font-medium">وزارة التعليم</p>
              <p className="text-sm font-medium">الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-lg font-black mt-2 text-white border-r-4 border-[#00a18e] pr-4">ثانوية الأمير عبدالمجيد الأولى</p>
           </div>

           <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-28 md:h-32 object-contain drop-shadow-xl" alt="Logo" />
              <div className="bg-white/10 px-6 py-1 rounded-full border border-white/20 backdrop-blur-sm">
                <p className="text-[10px] md:text-xs font-bold tracking-widest text-emerald-50 uppercase">
                  بوابة الموظف الرقمية
                </p>
              </div>
           </div>

           <div className="flex flex-col items-end gap-3 min-w-[220px]">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm text-right w-full">
                 <p className="text-[10px] font-bold text-emerald-400 mb-1">الموظف:</p>
                 <p className="text-sm font-black text-white">{currentProfile.full_name}</p>
                 <p className="text-[10px] text-white/60 font-medium mt-1 tracking-widest uppercase">{currentProfile.role}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="bg-white/10 border border-white/10 px-8 py-2 rounded-xl text-[11px] hover:bg-red-500/20 transition-all flex items-center gap-3 group font-black">
                تسجيل الخروج
                <LogOut className="w-4 h-4" />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-10 space-y-8 relative z-20">
        <div className="bg-white rounded-[3rem] p-8 md:p-12 text-[#0f4c4c] shadow-2xl relative overflow-hidden border border-slate-200">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-12">
             <div className="flex items-center gap-6 text-right w-full xl:w-auto">
                <div className="bg-[#0f4c4c]/5 p-5 rounded-[2.5rem] border border-[#0f4c4c]/10">
                   <LayoutTemplate className="w-12 h-12 text-[#0f4c4c]" />
                </div>
                <div>
                   <span className="bg-[#0f4c4c]/10 text-[#0f4c4c] px-4 py-1 rounded-full text-[10px] font-black tracking-widest mb-2 inline-block uppercase">Reports Engine</span>
                   <h2 className="text-3xl md:text-4xl font-black mb-2">منصة إعداد التقارير</h2>
                   <p className="text-slate-500 text-sm font-medium">الأداة المعتمدة لتجهيز ملفات الأداء السنوي</p>
                </div>
             </div>
             <div className="flex-1 w-full bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {[
                     { step: "01", text: "تعبئة البيانات" },
                     { step: "02", text: "توليد ملف PDF" },
                     { step: "03", text: "رفع الشواهد للـ Drive" }
                   ].map((item, idx) => (
                     <div key={idx} className="flex items-center gap-4 group/step">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xs font-black border border-slate-200 group-hover/step:bg-[#0f4c4c] group-hover/step:text-white transition-all shadow-sm">
                          {item.step}
                        </div>
                        <p className="text-[11px] font-black text-slate-600 leading-snug">{item.text}</p>
                     </div>
                   ))}
                </div>
             </div>
             <a href="#" target="_blank" className="w-full xl:w-auto bg-[#0f4c4c] text-white px-12 py-6 rounded-[2rem] font-black text-sm flex items-center justify-center gap-4 shadow-xl hover:scale-105 active:scale-95 transition-all group/btn">
                دخول المنصة <MousePointer2 className="w-6 h-6" />
             </a>
          </div>
        </div>

        <div className="bg-white rounded-[3.5rem] p-8 md:p-14 shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 mb-12">
            <div className="bg-amber-100 p-5 rounded-3xl">
              <ShieldAlert className="w-10 h-10 text-amber-600" />
            </div>
            <div className="text-right flex-1">
              <h4 className="text-lg font-black text-amber-900 mb-1">دليل مشاركة الشواهد</h4>
              <p className="text-sm text-amber-800 font-bold leading-relaxed">
                تأكد من ضبط خصوصية المجلد في Google Drive إلى <span className="underline text-red-600 font-black">"Anyone with the link"</span> ليتمكن المدير من المراجعة.
              </p>
            </div>
            <img src="https://img.icons8.com/color/96/google-drive--v2.png" className="h-16 w-16 opacity-80" alt="Drive" />
          </div>

          {!lastEval ? (
            <div className="space-y-12">
               <div className="text-center space-y-4">
                  <div className="bg-slate-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
                     <LinkIcon className="w-10 h-10 text-[#0f4c4c]" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">إيداع رابط الشواهد</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Digital Evidence Submission</p>
               </div>

               <form onSubmit={handleUpdateLink} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-500 mr-2 uppercase tracking-wider">التخصص أو المادة</label>
                        <input type="text" placeholder="مثال: لغة عربية - المرحلة الثانوية" className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0f4c4c] outline-none text-sm font-bold shadow-inner transition-all" value={subject} onChange={(e) => setSubject(e.target.value)} />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-500 mr-2 uppercase tracking-wider">رابط مجلد المادة (Drive)</label>
                        <div className="relative">
                           <img src="https://img.icons8.com/color/48/google-drive--v2.png" className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 opacity-30" alt="Drive" />
                           <input type="url" required placeholder="https://drive.google.com/..." className="w-full pr-14 pl-8 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-[#0f4c4c] outline-none text-sm font-sans dir-ltr text-left shadow-inner transition-all" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} />
                        </div>
                     </div>
                  </div>
                  <button disabled={saving} className="w-full bg-[#0f4c4c] text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-[#0d3d3d] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50">
                     {saving ? 'جاري الحفظ...' : 'اعتماد وإرسال الشواهد'} {!saving && <ChevronLeft className="w-7 h-7" />}
                  </button>
               </form>
            </div>
          ) : (
            <div className="text-center py-8 space-y-6">
               <div className="bg-emerald-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto border border-emerald-100 shadow-xl">
                  <CheckCircle2 className="w-14 h-14 text-emerald-600" />
               </div>
               <h3 className="text-3xl font-black text-slate-800">تم اعتماد التقييم الوظيفي</h3>
               <p className="text-base text-slate-500 font-bold max-w-xl mx-auto leading-relaxed">
                  بناءً على الشواهد المقدمة، تم رصد نتيجتكم النهائية واعتمادها من قبل القيادة المدرسية بنجاح.
               </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-10">
           <div className="h-px bg-slate-200 flex-1"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Tracking System</p>
           <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
           <div className={`bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 relative transition-all ${!currentProfile.drive_link ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-10">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><LinkIcon className="w-8 h-8 text-slate-400" /></div>
                 <div>
                    {lastEval ? (
                       <span className="bg-slate-100 text-slate-500 px-5 py-2 rounded-full text-[10px] font-black flex items-center gap-2 border border-slate-200 uppercase">
                          <Lock className="w-4 h-4" /> Locked
                       </span>
                    ) : currentProfile.drive_link ? (
                       <span className="bg-amber-50 text-amber-600 px-5 py-2 rounded-full text-[10px] font-black flex items-center gap-2 border border-amber-100 animate-pulse">
                          <Clock className="w-4 h-4" /> Pending
                       </span>
                    ) : (
                       <span className="bg-slate-50 text-slate-300 px-5 py-2 rounded-full text-[10px] font-black uppercase">Empty</span>
                    )}
                 </div>
              </div>
              <div className="space-y-4">
                 <h4 className="font-black text-slate-800 text-lg">رابط ملف الشواهد المعتمد</h4>
                 {currentProfile.drive_link ? (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 font-sans text-[11px] text-[#0f4c4c] break-all shadow-inner">
                       {currentProfile.drive_link}
                    </div>
                 ) : (
                    <p className="text-xs text-slate-400 font-bold italic">لا يوجد ملفات رقمية حالياً</p>
                 )}
              </div>
              {currentProfile.drive_link && (
                 <div className="mt-8 flex items-center gap-3">
                    <a href={currentProfile.drive_link} target="_blank" className="flex-1 bg-[#0f4c4c] text-white py-4 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-[#0d3d3d] shadow-lg">
                       <ExternalLink className="w-4 h-4" /> معاينة المجلد
                    </a>
                    {!lastEval && (
                       <button onClick={handleDeleteLink} className="p-4 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 className="w-5 h-5" />
                       </button>
                    )}
                 </div>
              )}
           </div>

           <div className={`bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 relative transition-all ${!lastEval ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><FileCheck className="w-8 h-8 text-[#0f4c4c]" /></div>
                 <div>
                    {lastEval ? (
                       <span className={`px-5 py-2 rounded-full text-[10px] font-black flex items-center gap-2 border uppercase ${grade?.bg.replace('bg-', 'bg-')}/10 ${grade?.color} ${grade?.border}`}>
                          <ShieldCheck className="w-4 h-4" /> VERIFIED
                       </span>
                    ) : (
                       <span className="bg-slate-50 text-slate-300 px-5 py-2 rounded-full text-[10px] font-black uppercase">Awaiting</span>
                    )}
                 </div>
              </div>
              
              <div className="flex items-center gap-8 mb-6">
                 <div className="relative w-28 h-28 shrink-0">
                    <svg className="w-full h-full -rotate-90">
                       <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                       <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={314} strokeDashoffset={lastEval ? 314 - (314 * lastEval.total_score) / 100 : 314} className={`${grade?.color.replace('text-', 'stroke-')} transition-all duration-1000`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#0f4c4c] font-sans">
                       <span className="text-3xl font-black leading-none">{lastEval ? lastEval.total_score : '--'}</span>
                       <span className="text-[10px] font-bold opacity-40">%</span>
                    </div>
                 </div>
                 <div className="text-right flex-1 space-y-2">
                    <h4 className="font-black text-slate-800 text-lg leading-tight">مؤشر الأداء الوظيفي</h4>
                    {lastEval ? (
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 tracking-wider">تاريخ الاعتماد: {new Date(lastEval.created_at).toLocaleDateString('ar-SA')}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${grade?.color}`}>تقدير الأداء: {grade?.label}</span>
                            <span className="text-[11px] font-bold text-slate-400">({grade?.rating})</span>
                          </div>
                       </div>
                    ) : (
                       <p className="text-[11px] text-slate-400 font-bold italic">سيظهر مؤشر الدرجة بعد الاعتماد</p>
                    )}
                 </div>
              </div>

              {lastEval && (
                <div className={`mt-4 p-5 rounded-2xl border-2 ${grade?.border} ${grade?.bg.replace('bg-', 'bg-')}/5 flex items-start gap-4`}>
                   <div className={`${grade?.color} mt-0.5`}><Info className="w-5 h-5" /></div>
                   <div className="text-right">
                      <p className={`text-xs font-black ${grade?.color} mb-1`}>{grade?.label}</p>
                      <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                        {grade?.description}
                      </p>
                   </div>
                </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
