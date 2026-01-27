
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, UserRole, Evaluation } from '../types';
import { 
  Search, LogOut, Printer, 
  MessageCircle, ShieldCheck, Settings, Sparkles,
  Users, CheckCircle, Clock, FileSearch, UserCheck, X, AlertCircle,
  UserPlus, UserMinus, ShieldAlert, Check
} from 'lucide-react';
import EvaluationModal from './EvaluationModal';
import PrintableReport from './PrintableReport';

const PrincipalDashboard: React.FC<{ userProfile: Profile }> = ({ userProfile }) => {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'active' | 'pending'>('active');
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [evaluationToShow, setEvaluationToShow] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    // جلب جميع الموظفين ما عدا المدير
    const { data: staffData } = await supabase.from('profiles').select('*').neq('role', UserRole.PRINCIPAL).order('created_at', { ascending: false });
    const { data: evalData } = await supabase.from('evaluations').select('*');
    if (staffData) setStaff(staffData);
    if (evalData) {
      const evalMap = evalData.reduce((acc: any, curr: Evaluation) => {
        acc[curr.staff_id] = curr;
        return acc;
      }, {});
      setEvaluations(evalMap);
    }
    setLoading(false);
  };

  const approveUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذا الحساب؟ سيتمكن الموظف من الدخول فوراً.')) return;
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    if (error) alert(error.message);
    else {
      // إرسال رسالة ترحيبية عبر واتساب اختيارياً
      fetchData();
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('سيتم حذف طلب هذا المستخدم نهائياً. هل أنت متأكد؟')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const activeStaff = staff.filter(s => s.is_approved && (s.full_name.includes(searchTerm) || s.mobile.includes(searchTerm)));
  const pendingStaff = staff.filter(s => !s.is_approved);

  const getGradeInfo = (score: number) => {
    let points = 1; let label = 'غير مرضي';
    if (score >= 90) { points = 5; label = 'ممتاز'; }
    else if (score >= 80) { points = 4; label = 'جيد جداً'; }
    else if (score >= 70) { points = 3; label = 'جيد'; }
    else if (score >= 60) { points = 2; label = 'مرضي'; }
    return { label, points };
  };

  const handlePrint = (s: Profile, ev: Evaluation) => {
    setEvaluationToShow({ staff: s, evaluation: ev });
    setTimeout(() => { window.print(); setEvaluationToShow(null); }, 500);
  };

  const openWhatsApp = (s: Profile, ev?: Evaluation) => {
    const mobile = s.mobile;
    const formatted = mobile.startsWith('0') ? '966' + mobile.substring(1) : mobile;
    let message = `الأستاذ / ${s.full_name}%0A`;
    if (ev) {
      const info = getGradeInfo(ev.total_score);
      message += `لقد تم رصد تقييمك للأداء الوظيفي بنجاح:%0A`;
      message += `النتيجة المئوية: ${ev.total_score}%%0A`;
      message += `النقاط: ${info.points} من 5%0A`;
      message += `التقدير: ${info.label}%0A%0A`;
      message += `توصيات المدير: %0A${ev.comments || 'نثمن جهودكم المهنية المتميزة ونتطلع لمزيد من الإبداع.'}%0A%0A`;
      message += `رسالة تحفيزية: %0Aنقدر عطاءكم المستمر وإخلاصكم في أداء رسالتكم السامية، فبكم وبجهودكم نرتقي بالعملية التعليمية نحو الإتقان والريادة.%0A%0A`;
    } else {
      message += `نأمل التكرم بتجهيز ملف الشواهد الرقمي الخاص بكم عبر المنصة لتتم عملية التقييم في أقرب وقت.%0A%0A`;
    }
    message += `مدير المدرسة: ${userProfile.full_name}`;
    window.open(`https://wa.me/${formatted}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-cairo">
      {/* هيدر رسمي متوازن - يطابق واجهة المعلمين تماماً */}
      <header className="bg-[#0f4c4c] text-white pt-8 pb-20 px-6 relative overflow-hidden shadow-2xl no-print">
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

           {/* اليسار: معلومات المدير */}
           <div className="flex flex-col items-center md:items-end gap-2 order-3 flex-1">
              <div className="bg-black/30 px-6 py-3 rounded-2xl border border-white/10 text-center md:text-right">
                <p className="text-[10px] opacity-70 font-bold text-emerald-400">المدير المسؤول،</p>
                <p className="text-sm font-black">{userProfile.full_name}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="text-red-300 hover:text-red-100 text-[10px] font-bold flex items-center gap-1 transition-colors">
                <LogOut className="w-3 h-3" /> تسجيل الخروج
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-10 space-y-8 relative z-20 pb-20 no-print">
        {/* شريط الإحصائيات والأزرار */}
        <div className="flex flex-col md:flex-row gap-6">
           <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              <button onClick={() => setView('active')} className={`p-6 rounded-[2.5rem] border shadow-xl flex items-center gap-4 transition-all ${view === 'active' ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/10' : 'bg-slate-50 border-transparent opacity-60'}`}>
                 <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><Users /></div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400">المعتمدون</p>
                    <p className="text-2xl font-black text-slate-800">{activeStaff.length}</p>
                 </div>
              </button>
              <button onClick={() => setView('pending')} className={`p-6 rounded-[2.5rem] border shadow-xl flex items-center gap-4 transition-all relative ${view === 'pending' ? 'bg-white border-amber-500 ring-4 ring-amber-500/10' : 'bg-slate-50 border-transparent opacity-60'}`}>
                 <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><UserPlus /></div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400">طلبات جديدة</p>
                    <p className="text-2xl font-black text-slate-800">{pendingStaff.length}</p>
                 </div>
                 {pendingStaff.length > 0 && <span className="absolute top-4 left-4 bg-red-500 w-3 h-3 rounded-full animate-ping"></span>}
              </button>
           </div>
           <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center px-8 flex-1">
              <Search className="text-slate-300 ml-4" />
              <input type="text" placeholder="بحث باسم الموظف أو رقم الجوال..." className="bg-transparent border-none outline-none w-full font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
        </div>

        {/* جدول العرض */}
        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
          {view === 'active' ? (
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-black border-b border-slate-100">
                  <th className="px-10 py-10">الموظف</th>
                  <th className="px-10 py-10">الشواهد الرقمية</th>
                  <th className="px-10 py-10 text-center">الدرجة (النقاط)</th>
                  <th className="px-10 py-10 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStaff.map((s) => {
                  const ev = evaluations[s.id];
                  const hasV2 = !!s.drive_link_v2;
                  const info = ev ? getGradeInfo(ev.total_score) : null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-10 py-10">
                        <div className="flex items-center gap-5">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${hasV2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-[#0f4c4c]'}`}>{s.full_name.charAt(0)}</div>
                           <div>
                             <p className="font-black text-slate-800 text-lg">{s.full_name}</p>
                             <div className="text-[10px] text-slate-400 font-sans mt-1">{s.role} | {s.mobile}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-10">
                        <div className="flex flex-col gap-2">
                          {s.drive_link && <a href={s.drive_link} target="_blank" className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 w-fit">المجلد الأساسي</a>}
                          {hasV2 && <a href={s.drive_link_v2} target="_blank" className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2 w-fit border border-emerald-100 ring-2 ring-emerald-500/20"><AlertCircle className="w-3 h-3" /> مجلد التحسين</a>}
                        </div>
                      </td>
                      <td className="px-10 py-10">
                        {info ? (
                           <div className="text-center">
                              <div className="text-2xl font-black text-[#0f4c4c] font-sans">{info.points} <span className="text-xs text-slate-300">/ 5</span></div>
                              <div className="text-[10px] font-bold text-slate-400">({info.label})</div>
                           </div>
                        ) : <span className="text-slate-200 text-center block">--</span>}
                      </td>
                      <td className="px-10 py-10">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedStaff(s)} className={`px-6 py-3.5 rounded-2xl text-[11px] font-black transition-all shadow-lg flex items-center gap-3 ${hasV2 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#0f4c4c] hover:bg-black text-white'}`}>
                             <UserCheck className="w-5 h-5" /> {ev ? 'تعديل' : 'تقييم'}
                          </button>
                          <button onClick={() => openWhatsApp(s, ev)} className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all" title="واتساب"><MessageCircle className="w-6 h-6" /></button>
                          {ev && <button onClick={() => handlePrint(s, ev)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all"><Printer className="w-6 h-6" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-10">
              {pendingStaff.length === 0 ? (
                <div className="text-center py-20">
                   <ShieldCheck className="w-20 h-20 text-slate-100 mx-auto mb-4" />
                   <p className="text-slate-400 font-black">لا توجد طلبات انضمام جديدة بانتظار الموافقة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {pendingStaff.map(s => (
                     <div key={s.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0f4c4c] font-black shadow-sm">{s.full_name.charAt(0)}</div>
                           <div>
                              <p className="font-black text-slate-800">{s.full_name}</p>
                              <p className="text-[10px] text-slate-500 font-bold">{s.role} | {s.mobile}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => approveUser(s.id)} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition shadow-lg flex items-center gap-2" title="اعتماد">
                              <Check className="w-5 h-5" />
                              <span className="text-[10px] font-black">اعتماد</span>
                           </button>
                           <button onClick={() => deleteUser(s.id)} className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-600 hover:text-white transition" title="حذف">
                              <UserMinus className="w-5 h-5" />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {selectedStaff && <EvaluationModal staff={selectedStaff} onClose={() => { setSelectedStaff(null); fetchData(); }} />}
      {evaluationToShow && <PrintableReport staff={evaluationToShow.staff} evaluation={evaluationToShow.evaluation} principalName={userProfile.full_name} />}
    </div>
  );
};

export default PrincipalDashboard;
