
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, UserRole, Evaluation } from '../types';
import { 
  Search, LogOut, Printer, 
  MessageCircle, ShieldCheck, Settings, Sparkles,
  Users, CheckCircle, Clock, FileSearch, UserCheck
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: staffData } = await supabase.from('profiles').select('*').neq('role', UserRole.PRINCIPAL).order('full_name', { ascending: true });
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

  const filteredStaff = staff.filter(s => (s.full_name.includes(searchTerm) || s.mobile.includes(searchTerm)) && (roleFilter === 'all' || s.role === roleFilter));

  const handleShareWhatsApp = (staff: Profile, evaluation: Evaluation) => {
    const score = evaluation.total_score;
    const comments = evaluation.comments ? `\n\n*التوجيهات والتوصيات:*\n${evaluation.comments}` : '';
    const formattedScore = score >= 90 ? 'ممتاز' : score >= 80 ? 'جيد جداً' : score >= 70 ? 'جيد' : 'مرضي';
    
    const message = `*ثانوية الأمير عبدالمجيد الأولى*\n*بطاقة الأداء الوظيفي الرقمية*\n\nالأستاذ/ة: ${staff.full_name} المحترم/ة\nنحيطكم علماً بأنه تم اعتماد تقييم أداءكم الوظيفي بنجاح.\n\n*النتيجة النهائية:* ${score}%\n*التقدير العام:* ${formattedScore}${comments}\n\nشكراً لعطائكم المستمر.\n*مدير المدرسة:* ${userProfile.full_name}`;
    
    window.open(`https://wa.me/966${staff.mobile.substring(1)}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-cairo">
      {/* Official Header */}
      <header className="bg-[#0f4c4c] text-white pt-10 pb-24 px-8 relative overflow-hidden shadow-2xl no-print">
        <div className="max-w-7xl mx-auto flex justify-between items-center relative z-10">
           <div className="text-right space-y-1 font-official">
              <p className="text-sm font-bold">المملكة العربية السعودية</p>
              <p className="text-sm">وزارة التعليم</p>
              <p className="text-sm">الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-xl font-black mt-2">ثانوية الأمير عبدالمجيد الأولى</p>
           </div>
           <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-32 md:h-36 object-contain drop-shadow-2xl" alt="Logo" />
              <div className="bg-black/20 px-6 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                 <p className="text-[10px] font-black tracking-widest text-emerald-100 uppercase">نظام إدارة التقييم - بوابة القيادة</p>
              </div>
           </div>
           <div className="flex flex-col items-end gap-4 min-w-[220px]">
              <div className="bg-black/30 p-4 rounded-3xl border border-white/10 backdrop-blur-sm text-right">
                 <p className="text-[10px] font-bold text-emerald-400 mb-1">المدير المسؤول:</p>
                 <p className="text-sm font-black text-white font-official">{userProfile.full_name}</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="bg-white/5 border border-white/10 px-8 py-2 rounded-2xl text-[10px] hover:bg-red-500/20 transition-all flex items-center gap-3 group font-black">
                خروج من النظام <LogOut className="w-4 h-4" />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-16 space-y-8 relative z-20 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'إجمالي المنسوبين', value: staff.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
             { label: 'تم رصد تقييمهم', value: Object.keys(evaluations).length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'بانتظار التقييم', value: staff.length - Object.keys(evaluations).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' }
           ].map((stat, i) => (
             <div key={i} className={`${stat.bg} p-8 rounded-[3rem] border border-white shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-all`}>
                <div className="text-right">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                   <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-5 rounded-3xl bg-white/80 shadow-inner ${stat.color}`}>
                   <stat.icon className="w-10 h-10" />
                </div>
             </div>
           ))}
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-[#0f4c4c]" />
            <input type="text" placeholder="البحث باسم الموظف أو رقم الجوال..." className="w-full pr-16 pl-6 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#0f4c4c] outline-none text-sm font-bold shadow-inner transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="w-full md:w-80 px-8 py-5 rounded-[2rem] bg-slate-50 border border-slate-100 outline-none text-sm font-black text-slate-700 shadow-inner focus:bg-white" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">جميع الفئات الوظيفية</option>
            {Object.values(UserRole).filter(r => r !== UserRole.PRINCIPAL).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-10 py-10">الموظف</th>
                  <th className="px-10 py-10">الفئة المهنية</th>
                  <th className="px-10 py-10">المستندات الرقمية</th>
                  <th className="px-10 py-10 text-center">الدرجة النهائية</th>
                  <th className="px-10 py-10 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((s) => {
                  const ev = evaluations[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-10">
                        <div className="flex items-center gap-5">
                           <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-[#0f4c4c] font-black text-xl group-hover:bg-[#0f4c4c] group-hover:text-white transition-all shadow-sm">{s.full_name.charAt(0)}</div>
                           <div>
                             <div className="font-black text-slate-800 text-lg font-official leading-tight">{s.full_name}</div>
                             <div className="text-[10px] text-slate-400 font-sans mt-1 tracking-wider">{s.mobile}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-10"><span className="bg-slate-100 text-slate-600 px-5 py-2 rounded-full text-[10px] font-black">{s.role}</span></td>
                      <td className="px-10 py-10">
                        {s.drive_link ? (
                          <a href={s.drive_link} target="_blank" className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-3 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all text-[11px] font-black w-fit"><FileSearch className="w-5 h-5" /> فحص المستندات</a>
                        ) : (<span className="text-slate-300 italic text-xs font-bold">لم ترفع الشواهد</span>)}
                      </td>
                      <td className="px-10 py-10 text-center">
                        {ev ? (
                           <div className="flex flex-col items-center gap-1">
                              <span className="bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-[10px] font-black">معتمد</span>
                              <div className="text-3xl font-black text-[#0f4c4c] font-sans">{ev.total_score}%</div>
                           </div>
                        ) : (<div className="text-2xl font-black text-slate-200">--</div>)}
                      </td>
                      <td className="px-10 py-10">
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => setSelectedStaff(s)} className="bg-[#0f4c4c] text-white px-8 py-3.5 rounded-2xl text-[11px] font-black hover:bg-[#0d3d3d] hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-3"><UserCheck className="w-5 h-5" /> رصد التقييم</button>
                          {ev && (
                            <>
                              <button onClick={() => setEvaluationToShow({ staff: s, evaluation: ev })} className="p-3 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl transition-all border border-slate-100"><Printer className="w-6 h-6" /></button>
                              <button onClick={() => handleShareWhatsApp(s, ev)} className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all border border-slate-100"><MessageCircle className="w-6 h-6" /></button>
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

      {selectedStaff && <EvaluationModal staff={selectedStaff} onClose={() => { setSelectedStaff(null); fetchData(); }} />}
      {evaluationToShow && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[95vh] rounded-[4rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center no-print">
              <div className="flex items-center gap-5 text-right">
                <div className="p-5 bg-[#0f4c4c] text-white rounded-3xl shadow-xl shadow-teal-900/10"><Printer className="w-10 h-10" /></div>
                <div>
                   <h2 className="text-3xl font-black text-slate-800 font-official">معاينة بطاقة الأداء النهائية</h2>
                   <p className="text-[11px] text-slate-400 font-black tracking-widest uppercase">مستند رسمي معتمد وجاهز للطباعة</p>
                </div>
              </div>
              <div className="flex gap-5">
                <button onClick={() => window.print()} className="bg-[#0f4c4c] text-white px-12 py-5 rounded-[2rem] font-black text-sm flex items-center gap-4 hover:scale-105 transition-all shadow-xl shadow-teal-900/20"><Printer className="w-6 h-6" /> طباعة فورية</button>
                <button onClick={() => setEvaluationToShow(null)} className="px-10 py-5 bg-white border border-slate-200 text-slate-500 rounded-[2rem] font-black text-sm hover:bg-slate-50 transition-all">إلغاء المعاينة</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-16">
               <div className="bg-white shadow-2xl rounded-sm mx-auto transform scale-95 origin-top print:scale-100">
                  <PrintableReport staff={evaluationToShow.staff} evaluation={evaluationToShow.evaluation} principalName={userProfile.full_name} />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalDashboard;
