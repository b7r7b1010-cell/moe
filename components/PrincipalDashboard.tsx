
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, UserRole, Evaluation } from '../types';
import { 
  Search, ExternalLink, LogOut, Printer, 
  MessageCircle, ShieldCheck, Settings, Sparkles,
  Users, ClipboardCheck, CheckCircle, Clock, ChevronLeft,
  FileSearch, UserCheck, TrendingUp
} from 'lucide-react';
import EvaluationModal from './EvaluationModal';
import PrintableReport from './PrintableReport';

const PrincipalDashboard: React.FC<{ userProfile: Profile }> = ({ userProfile }) => {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [evaluationToShow, setEvaluationToShow] = useState<any>(null);

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // جلب الموظفين
    const { data: staffData } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', UserRole.PRINCIPAL)
      .order('full_name', { ascending: true });
    
    // جلب التقييمات الحالية
    const { data: evalData } = await supabase
      .from('evaluations')
      .select('*');

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

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.full_name.includes(searchTerm) || s.mobile.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleShareWhatsApp = (staff: Profile, score: number) => {
    const formattedScore = score >= 90 ? 'ممتاز' : score >= 80 ? 'جيد جداً' : 'جيد';
    const message = `الأستاذ/ة: ${staff.full_name} المحترم/ة\n\nنحيطكم علماً بأنه تم اعتماد تقييم الأداء الوظيفي الخاص بكم.\nالدرجة النهائية: ${score}%\nالتقدير العام: ${formattedScore}\n\nشكراً لعطائكم المستمر.\nمدير المدرسة: ${userProfile.full_name}`;
    window.open(`https://wa.me/966${staff.mobile.substring(1)}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const stats = {
    total: staff.length,
    completed: Object.keys(evaluations).length,
    pending: staff.length - Object.keys(evaluations).length
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-cairo">
      {/* Official State Header */}
      <header className="bg-[#0f4c4c] text-white pt-10 pb-24 px-6 relative overflow-hidden shadow-2xl no-print">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <Settings className="absolute top-10 right-1/4 w-40 h-40 rotate-12" />
          <Sparkles className="absolute bottom-10 left-1/4 w-32 h-32 -rotate-12" />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
           <div className="text-center md:text-right space-y-1 font-official min-w-[250px]">
              <p className="text-sm font-bold tracking-wide">المملكة العربية السعودية</p>
              <p className="text-sm">وزارة التعليم</p>
              <p className="text-sm font-black mt-2 text-emerald-400 border-t border-white/10 pt-2">ثانوية الأمير عبدالمجيد الأولى بجدة</p>
           </div>

           <div className="flex flex-col items-center gap-4">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-28 object-contain drop-shadow-2xl" alt="Logo" />
              <div className="bg-white/10 px-8 py-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
                 <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs font-black tracking-widest text-emerald-50 uppercase">نظام إدارة التقييم - بوابة القيادة</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-col items-center md:items-end gap-4 min-w-[250px]">
              <div className="bg-black/20 p-4 rounded-3xl border border-white/5 backdrop-blur-sm text-right">
                 <p className="text-[10px] font-bold text-emerald-400 mb-1">المدير المسؤول:</p>
                 <p className="text-sm font-black text-white">{userProfile.full_name}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl text-[10px] hover:bg-red-500/20 transition-all flex items-center gap-3 group font-black">
                خروج من النظام
                <LogOut className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-16 space-y-8 relative z-20 pb-20">
        
        {/* Statistics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'إجمالي المنسوبين', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
             { label: 'تم رصد تقييمهم', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'بانتظار التقييم', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' }
           ].map((stat, i) => (
             <div key={i} className={`${stat.bg} p-6 rounded-[2.5rem] border border-white shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all`}>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                   <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-4 rounded-3xl bg-white/80 shadow-inner ${stat.color}`}>
                   <stat.icon className="w-8 h-8" />
                </div>
             </div>
           ))}
        </div>

        {/* Filter & Search Hub */}
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center no-print">
          <div className="relative flex-1 w-full group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-[#0f4c4c] transition-colors" />
            <input 
              type="text" 
              placeholder="البحث باسم الموظف أو رقم الجوال..." 
              className="w-full pr-16 pl-6 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#0f4c4c] outline-none text-sm font-bold shadow-inner transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <select 
            className="w-full md:w-80 px-8 py-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 outline-none text-sm font-black text-slate-700 cursor-pointer shadow-inner focus:bg-white" 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">جميع الفئات الوظيفية</option>
            {Object.values(UserRole).filter(r => r !== UserRole.PRINCIPAL).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Professional Staff Table */}
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-10 py-8">الموظف</th>
                  <th className="px-10 py-8">الدور الوظيفي</th>
                  <th className="px-10 py-8">الشواهد الرقمية</th>
                  <th className="px-10 py-8 text-center">حالة التقييم</th>
                  <th className="px-10 py-8 text-center">مركز العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((s) => {
                  const ev = evaluations[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-[#0f4c4c] font-black text-lg group-hover:bg-[#0f4c4c] group-hover:text-white transition-all shadow-sm">
                             {s.full_name.charAt(0)}
                           </div>
                           <div>
                             <div className="font-black text-slate-800 text-base leading-tight">{s.full_name}</div>
                             <div className="text-[10px] text-slate-400 font-sans mt-1 tracking-wider">{s.mobile}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-[10px] font-black">{s.role}</span>
                      </td>
                      <td className="px-10 py-8">
                        {s.drive_link ? (
                          <a href={s.drive_link} target="_blank" className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-[11px] font-black w-fit">
                            <FileSearch className="w-4 h-4" /> فحص المستندات
                          </a>
                        ) : (
                          <span className="text-slate-300 italic text-[11px] font-bold">لم ترفع الشواهد</span>
                        )}
                      </td>
                      <td className="px-10 py-8 text-center">
                        {ev ? (
                           <div className="flex flex-col items-center gap-1">
                              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[9px] font-black">تم الاعتماد</span>
                              <div className="text-2xl font-black text-[#0f4c4c]">{ev.total_score}%</div>
                           </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                             <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[9px] font-black">شاغر</span>
                             <div className="text-xl font-black text-slate-200">--</div>
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => setSelectedStaff(s)} 
                            className="bg-[#0f4c4c] text-white px-6 py-2.5 rounded-xl text-[11px] font-black hover:bg-[#0d3d3d] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-teal-900/10 flex items-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" /> رصد التقييم
                          </button>
                          {ev && (
                            <>
                              <button onClick={() => setEvaluationToShow({ staff: s, evaluation: ev })} className="p-2.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all border border-slate-100" title="طباعة التقرير">
                                <Printer className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleShareWhatsApp(s, ev.total_score)} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-slate-100" title="مشاركة واتساب">
                                <MessageCircle className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Dynamic Evaluation Modal */}
      {selectedStaff && (
        <EvaluationModal 
          staff={selectedStaff} 
          onClose={() => { 
            setSelectedStaff(null); 
            fetchData(); 
          }} 
        />
      )}

      {/* Professional Printing Preview */}
      {evaluationToShow && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[95vh] rounded-[4rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center no-print">
              <div className="flex items-center gap-5 text-right">
                <div className="p-4 bg-[#0f4c4c] text-white rounded-3xl shadow-xl shadow-teal-900/10"><Printer className="w-8 h-8" /></div>
                <div>
                   <h2 className="text-2xl font-black text-slate-800 font-official">معاينة بطاقة الأداء النهائية</h2>
                   <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">جاهز للتصدير والطباعة الرسمية</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="bg-[#0f4c4c] text-white px-10 py-4 rounded-[1.5rem] font-black text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-teal-900/20">
                  <Printer className="w-5 h-5" /> طباعة فورية
                </button>
                <button onClick={() => setEvaluationToShow(null)} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] font-black text-sm hover:bg-slate-50 transition-all">إلغاء المعاينة</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-12">
               <div className="bg-white shadow-2xl rounded-sm mx-auto transform scale-95 origin-top print:scale-100">
                  <PrintableReport 
                    staff={evaluationToShow.staff} 
                    evaluation={evaluationToShow.evaluation} 
                    principalName={userProfile.full_name} 
                  />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalDashboard;
