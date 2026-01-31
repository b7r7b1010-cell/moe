
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, UserRole, Evaluation } from '../types';
import { 
  Search, LogOut, Printer, 
  MessageCircle, Settings, Sparkles,
  Users, UserCheck, X, AlertCircle,
  UserPlus, UserMinus, Check, Loader2,
  LayoutDashboard, PieChart, ClipboardCheck, FolderX,
  UserCog, Save, Edit3
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
  const [filterType, setFilterType] = useState<'all' | 'evaluated' | 'pending_eval' | 'no_file'>('all');
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // ضمان الخروج الفعلي في كروم وسفاري
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

  const handleUpdateUserRole = async (id: string, newRole: UserRole) => {
    setProcessingId(id);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (!error) {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s));
      setEditingStaff(null);
      alert('تم تحديث المسمى الوظيفي بنجاح');
    }
    setProcessingId(null);
  };

  const getFilteredStaff = () => {
    let list = staff.filter(s => s.is_approved && (s.full_name.includes(searchTerm) || s.mobile.includes(searchTerm)));
    if (filterType === 'evaluated') list = list.filter(s => !!evaluations[s.id]);
    if (filterType === 'pending_eval') list = list.filter(s => !evaluations[s.id] && s.drive_link);
    if (filterType === 'no_file') list = list.filter(s => !s.drive_link);
    return list;
  };

  const activeStaff = getFilteredStaff();
  const pendingStaff = staff.filter(s => !s.is_approved);
  
  const stats = {
    total: staff.filter(s => s.is_approved).length,
    evaluated: Object.keys(evaluations).length,
    pendingEval: staff.filter(s => s.is_approved && !evaluations[s.id] && s.drive_link).length,
    noFile: staff.filter(s => s.is_approved && !s.drive_link).length
  };

  const getGradeInfo = (score: number) => {
    if (score >= 90) return { label: 'مثالي', points: 5, color: 'text-emerald-600' };
    if (score >= 80) return { label: 'تخطى التوقعات', points: 4, color: 'text-blue-600' };
    if (score >= 70) return { label: 'وافق التوقعات', points: 3, color: 'text-amber-600' };
    if (score >= 60) return { label: 'بحاجة إلى تطوير', points: 2, color: 'text-orange-600' };
    return { label: 'غير مرضي', points: 1, color: 'text-red-600' };
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
      message += `لقد تم رصد تقييمك للأداء الوظيفي بنجاح:%0Aالتقدير اللفظي: ${info.label}%0Aالمعدل الموزون: ${(ev.total_score / 20).toFixed(2)} من 5%0A`;
      if (ev.comments) message += `توصيات مدير المدرسة: ${ev.comments}%0A%0A`;
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
              <p className="text-sm md:text-lg font-black mt-1 text-white border-r-4 border-[#00a18e] pr-3">ثانوية الأمير عبدالمجيد الأولى</p>
           </div>
           <div className="order-1 md:order-2 flex-shrink-0">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-24 md:h-32 object-contain drop-shadow-2xl" alt="Logo" />
           </div>
           <div className="flex flex-col items-center md:items-end gap-2 order-3 flex-1">
              <div className="bg-black/30 px-6 py-3 rounded-2xl border border-white/10 text-center md:text-right shadow-xl">
                <p className="text-[10px] opacity-70 font-bold text-emerald-400">المدير المسؤول،</p>
                <p className="text-sm font-black">{userProfile.full_name}</p>
              </div>
              <button onClick={handleLogout} className="text-red-300 hover:text-red-100 text-[10px] font-bold flex items-center gap-1 transition-colors">
                <LogOut className="w-3 h-3" /> تسجيل الخروج
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-10 space-y-8 relative z-20 pb-20 no-print">
        {/* مركز التحكم والإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
           {[
             { id: 'all', label: 'إجمالي الموظفين', val: stats.total, icon: Users, color: 'bg-blue-50 text-blue-600' },
             { id: 'evaluated', label: 'تم تقييمهم', val: stats.evaluated, icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-600' },
             { id: 'pending_eval', label: 'ينتظر التقييم', val: stats.pendingEval, icon: PieChart, color: 'bg-amber-50 text-amber-600' },
             { id: 'no_file', label: 'لم يرفع ملفه', val: stats.noFile, icon: FolderX, color: 'bg-rose-50 text-rose-600' }
           ].map((s) => (
             <button key={s.id} onClick={() => { setView('active'); setFilterType(s.id as any); }}
                     className={`p-6 rounded-[2.5rem] bg-white shadow-xl border-2 transition-all flex flex-col md:flex-row items-center gap-4 group ${filterType === s.id ? 'border-[#0f4c4c] ring-4 ring-[#0f4c4c]/5' : 'border-transparent hover:border-slate-200'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform`}><s.icon className="w-6 h-6" /></div>
                <div className="text-center md:text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{s.label}</p>
                   <p className="text-2xl font-black text-slate-800">{s.val}</p>
                </div>
             </button>
           ))}
        </div>

        <div className="flex flex-col md:flex-row gap-6">
           <div className="flex-1 grid grid-cols-2 gap-4">
              <button onClick={() => { setView('active'); setFilterType('all'); }} className={`p-6 rounded-[2.5rem] border shadow-xl flex items-center gap-4 transition-all ${view === 'active' ? 'bg-[#0f4c4c] text-white border-transparent' : 'bg-white border-slate-100 opacity-60'}`}>
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${view === 'active' ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}><Users /></div>
                 <div className="text-right"><p className={`text-[10px] font-black ${view === 'active' ? 'text-white/60' : 'text-slate-400'}`}>قائمة الموظفين</p><p className="text-2xl font-black">{stats.total}</p></div>
              </button>
              <button onClick={() => setView('pending')} className={`p-6 rounded-[2.5rem] border shadow-xl flex items-center gap-4 transition-all relative ${view === 'pending' ? 'bg-amber-500 text-white border-transparent' : 'bg-white border-slate-100 opacity-60'}`}>
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${view === 'pending' ? 'bg-white/10 text-white' : 'bg-amber-50 text-amber-600'}`}><UserPlus /></div>
                 <div className="text-right"><p className={`text-[10px] font-black ${view === 'pending' ? 'text-white/60' : 'text-slate-400'}`}>طلبات بانتظار الاعتماد</p><p className="text-2xl font-black">{pendingStaff.length}</p></div>
                 {pendingStaff.length > 0 && <span className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-black border-4 border-white animate-pulse">{pendingStaff.length}</span>}
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
                  const isReady = s.is_ready_for_eval && !ev;
                  
                  return (
                    <div key={s.id} className={`bg-white p-6 rounded-[2.5rem] border flex flex-col gap-6 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden ${isReady ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-100'}`}>
                        {isReady && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 text-[10px] font-black rounded-bl-2xl flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3" /> جاهز للتقييم
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                           <div className="relative">
                             <div className="w-14 h-14 rounded-2xl bg-slate-50 text-[#0f4c4c] group-hover:bg-[#0f4c4c] group-hover:text-white flex items-center justify-center font-black text-xl transition-colors">{s.full_name.charAt(0)}</div>
                             <button onClick={() => setEditingStaff(s)} title="تعديل المسمى الوظيفي" className="absolute -bottom-1 -right-1 p-1.5 bg-white shadow-md rounded-lg text-slate-400 hover:text-[#0f4c4c] border border-slate-100"><Edit3 className="w-3 h-3" /></button>
                           </div>
                           <div className="text-right flex-1">
                             <p className="font-black text-slate-800 text-lg leading-tight">{s.full_name}</p>
                             <p className="text-[11px] font-bold mt-1 text-slate-400">{s.role} | {s.mobile}</p>
                           </div>
                        </div>
                        
                        <div className={`flex justify-between items-center p-4 rounded-2xl transition-colors ${isReady ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                           <div className="text-right">
                             <p className="text-[10px] text-slate-400 font-bold">حالة الأداء</p>
                             <p className={`text-sm font-black ${info?.color || (isReady ? 'text-emerald-600' : 'text-slate-600')}`}>
                               {info ? `${info.label} (${info.points})` : (isReady ? 'بانتظار الرصد' : 'لم يرفع ملفه')}
                             </p>
                           </div>
                           <div className="flex gap-1">
                              <button onClick={() => openWhatsApp(s, ev)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"><MessageCircle className="w-5 h-5" /></button>
                              {ev && <button onClick={() => handlePrint(s, ev)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><Printer className="w-5 h-5" /></button>}
                           </div>
                        </div>
                        
                        <div className="flex gap-2">
                           {!s.is_approved && (
                             <button disabled={processingId === s.id} onClick={() => approveUser(s.id)} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-2xl hover:bg-emerald-700 transition shadow-lg flex items-center justify-center gap-2"><Check className="w-5 h-5" /><span className="text-xs font-black">اعتماد الحساب</span></button>
                           )}
                           {view === 'active' && (
                             <button onClick={() => setSelectedStaff(s)} className={`flex-1 text-white py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${isReady ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' : 'bg-[#0f4c4c] hover:bg-black'}`}>
                               <UserCheck className="w-5 h-5" />
                               <span className="text-xs font-black">{ev ? 'تحديث التقييم' : (isReady ? 'تقييم الآن' : 'بدء التقييم')}</span>
                             </button>
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

      {/* نافذة تعديل الرتبة الوظيفية (Role Switcher) */}
      {editingStaff && (
        <div className="fixed inset-0 bg-[#0f4c4c]/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><UserCog className="text-emerald-600" /> تعديل بيانات الموظف</h3>
              <button onClick={() => setEditingStaff(null)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500"><X /></button>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-6">تغيير المسمى الوظيفي لـ: <span className="text-[#0f4c4c]">{editingStaff.full_name}</span></p>
            <div className="space-y-3">
              {[UserRole.TEACHER, UserRole.VICE_PRINCIPAL, UserRole.COUNSELOR, UserRole.LAB_ASSISTANT].map((role) => (
                <button key={role} onClick={() => handleUpdateUserRole(editingStaff.id, role)} 
                        className={`w-full p-4 rounded-2xl text-right font-bold transition-all flex justify-between items-center border-2 ${editingStaff.role === role ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200'}`}>
                  {role}
                  {editingStaff.role === role && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <p className="mt-6 text-[10px] text-slate-400 text-center font-bold">تغيير المسمى الوظيفي سيؤدي لتغيير معايير التقييم لهذا الموظف آلياً.</p>
          </div>
        </div>
      )}

      {selectedStaff && <EvaluationModal staff={selectedStaff} onClose={() => { setSelectedStaff(null); fetchData(); }} />}
      {evaluationToShow && <PrintableReport staff={evaluationToShow.staff} evaluation={evaluationToShow.evaluation} principalName={userProfile.full_name} />}
    </div>
  );
};

export default PrincipalDashboard;
