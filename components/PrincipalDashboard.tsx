
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, UserRole, Evaluation } from '../types';
import { 
  Search, LogOut, Printer, 
  MessageCircle, ShieldCheck, Settings, Sparkles,
  Users, CheckCircle, Clock, FileSearch, UserCheck, X, AlertCircle,
  UserPlus, UserMinus, ShieldAlert, Check, Loader2, AlertTriangle
} from 'lucide-react';
import EvaluationModal from './EvaluationModal';
import PrintableReport from './PrintableReport';

const PrincipalDashboard: React.FC<{ userProfile: Profile }> = ({ userProfile }) => {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'active' | 'pending'>('active');
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [evaluationToShow, setEvaluationToShow] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
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
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const approveUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من اعتماد هذا الحساب؟')) return;
    setProcessingId(id);
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', id);
    if (!error) setStaff(prev => prev.map(s => s.id === id ? { ...s, is_approved: true } : s));
    setProcessingId(null);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('سيتم حذف طلب هذا المستخدم نهائياً. هل أنت متأكد؟')) return;
    setProcessingId(id);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) setStaff(prev => prev.filter(s => s.id !== id));
    setProcessingId(null);
  };

  const activeStaff = staff.filter(s => s.is_approved && (s.full_name.includes(searchTerm) || s.mobile.includes(searchTerm)));
  const pendingStaff = staff.filter(s => !s.is_approved);

  const getGradeInfo = (score: number) => {
    let points = 1; let label = 'غير مرضي';
    if (score >= 90) { points = 5; label = 'مثالي'; }
    else if (score >= 80) { points = 4; label = 'تخطى التوقعات'; }
    else if (score >= 70) { points = 3; label = 'وافق التوقعات'; }
    else if (score >= 60) { points = 2; label = 'بحاجة إلى تطوير'; }
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
      message += `لقد تم رصد تقييمك للأداء الوظيفي بنجاح:%0Aالتقدير: ${info.label}%0Aالنسبة: ${ev.total_score}%%0A%0A`;
    } else {
      message += `نأمل التكرم بتجهيز ملف الشواهد الرقمي الخاص بكم عبر المنصة.%0A%0A`;
    }
    message += `مدير المدرسة: ${userProfile.full_name}`;
    window.open(`https://wa.me/${formatted}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-cairo text-right" dir="rtl">
      <header className="bg-[#0f4c4c] text-white pt-8 pb-20 px-6 relative overflow-hidden shadow-2xl no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
           <div className="text-right space-y-0.5 order-2 md:order-1 flex-1">
              <p className="text-[10px] md:text-xs font-bold opacity-90">المملكة العربية السعودية</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">وزارة التعليم</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-sm md:text-lg font-black mt-2 text-[#00a18e] border-r-4 border-[#00a18e] pr-3">ثانوية الأمير عبدالمجيد الأولى</p>
           </div>
           <div className="order-1 md:order-2 flex-shrink-0">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-24 md:h-32 object-contain drop-shadow-2xl" alt="Logo" />
           </div>
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
        <div className="flex flex-col md:flex-row gap-6">
           <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              <button onClick={() => setView('active')} className={`p-6 rounded-[2.5rem] border shadow-xl flex items-center gap-4 transition-all ${view === 'active' ? 'bg-white border-emerald-500 ring-4 ring-emerald-500/10' : 'bg-slate-50 border-transparent opacity-60'}`}>
                 <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><Users /></div>
                 <div className="text-right"><p className="text-[10px] font-black text-slate-400">المعتمدون</p><p className="text-2xl font-black text-slate-800">{activeStaff.length}</p></div>
              </button>
              <button onClick={() => setView('pending')} className={`p-6 rounded-[2.5rem] border shadow-xl flex items-center gap-4 transition-all relative ${view === 'pending' ? 'bg-white border-amber-500 ring-4 ring-amber-500/10' : 'bg-slate-50 border-transparent opacity-60'}`}>
                 <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><UserPlus /></div>
                 <div className="text-right"><p className="text-[10px] font-black text-slate-400">طلبات جديدة</p><p className="text-2xl font-black text-slate-800">{pendingStaff.length}</p></div>
              </button>
           </div>
           <div className="bg-white p-4 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center px-8 flex-1">
              <Search className="text-slate-300 ml-4" />
              <input type="text" placeholder="بحث باسم الموظف أو رقم الجوال..." className="bg-transparent border-none outline-none w-full font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
        </div>
        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-12 h-12 text-emerald-600 animate-spin" /><p className="text-slate-400 font-bold">جاري المزامنة...</p></div>
          ) : (
            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(view === 'active' ? activeStaff : pendingStaff).map(s => {
                  const ev = evaluations[s.id];
                  const info = ev ? getGradeInfo(ev.total_score) : null;
                  return (
                    <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col gap-6 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 rounded-2xl bg-slate-50 text-[#0f4c4c] group-hover:bg-[#0f4c4c] group-hover:text-white flex items-center justify-center font-black text-xl transition-colors">{s.full_name.charAt(0)}</div>
                           <div className="text-right flex-1"><p className="font-black text-slate-800 text-lg leading-tight">{s.full_name}</p><p className="text-[11px] font-bold mt-1 text-slate-400">{s.role} | {s.mobile}</p></div>
                        </div>
                        {view === 'active' && (
                          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                             <div className="text-right"><p className="text-[10px] text-slate-400 font-bold">التقدير</p><p className="text-sm font-black text-[#0f4c4c]">{info ? info.label : '--'}</p></div>
                             <div className="flex gap-1">
                                <button onClick={() => openWhatsApp(s, ev)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl"><MessageCircle className="w-5 h-5" /></button>
                                {ev && <button onClick={() => handlePrint(s, ev)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><Printer className="w-5 h-5" /></button>}
                             </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                           {!s.is_approved && (
                             <button disabled={processingId === s.id} onClick={() => approveUser(s.id)} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-2xl hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2"><Check className="w-5 h-5" /><span className="text-xs font-black">اعتماد</span></button>
                           )}
                           {view === 'active' && (
                             <button onClick={() => setSelectedStaff(s)} className="flex-1 bg-[#0f4c4c] text-white py-3.5 rounded-2xl hover:bg-black transition flex items-center justify-center gap-2"><UserCheck className="w-5 h-5" /><span className="text-xs font-black">{ev ? 'تعديل التقييم' : 'تقييم الآن'}</span></button>
                           )}
                           <button disabled={processingId === s.id} onClick={() => deleteUser(s.id)} className="px-4 py-3.5 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition flex items-center justify-center">{processingId === s.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserMinus className="w-5 h-5" />}</button>
                        </div>
                    </div>
                  );
                })}
              </div>
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
