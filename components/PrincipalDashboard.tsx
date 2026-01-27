
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, UserRole, Evaluation } from '../types';
import { 
  Search, LogOut, Printer, 
  MessageCircle, ShieldCheck, Settings, Sparkles,
  Users, CheckCircle, Clock, FileSearch, UserCheck, X, AlertCircle
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

  const handlePrint = (s: Profile, ev: Evaluation) => {
    setEvaluationToShow({ staff: s, evaluation: ev });
    setTimeout(() => {
      window.print();
      setEvaluationToShow(null);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-cairo">
      <header className="bg-[#0f4c4c] text-white pt-10 pb-24 px-8 relative overflow-hidden shadow-2xl no-print">
        <div className="max-w-7xl mx-auto flex justify-between items-center relative z-10">
           <div className="text-right space-y-1">
              <p className="text-sm font-bold">الإدارة العامة للتعليم بجدة</p>
              <p className="text-xl font-black mt-2">ثانوية الأمير عبدالمجيد الأولى</p>
           </div>
           <div className="absolute left-1/2 -translate-x-1/2">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-32 object-contain drop-shadow-2xl" alt="Logo" />
           </div>
           <div className="bg-black/30 p-4 rounded-3xl border border-white/10 text-right">
              <p className="text-[10px] font-bold text-emerald-400 mb-1">المدير المسؤول:</p>
              <p className="text-sm font-black text-white">{userProfile.full_name}</p>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-16 space-y-8 relative z-20 pb-20 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'إجمالي المنسوبين', value: staff.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
             { label: 'تم رصد تقييمهم', value: Object.keys(evaluations).length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'طلبوا إعادة تقييم', value: staff.filter(s => s.drive_link_v2).length, icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50' }
           ].map((stat, i) => (
             <div key={i} className={`${stat.bg} p-8 rounded-[3rem] border border-white shadow-xl flex items-center justify-between`}>
                <div className="text-right">
                   <p className="text-[11px] font-black text-slate-400 mb-1">{stat.label}</p>
                   <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-5 rounded-3xl bg-white/80 ${stat.color}`}><stat.icon className="w-10 h-10" /></div>
             </div>
           ))}
        </div>

        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] font-black border-b border-slate-100">
                <th className="px-10 py-10">الموظف</th>
                <th className="px-10 py-10">الشواهد الرقمية</th>
                <th className="px-10 py-10">الدرجة (النقاط)</th>
                <th className="px-10 py-10 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((s) => {
                const ev = evaluations[s.id];
                const hasV2 = !!s.drive_link_v2;
                // تحويل الدرجة لنقاط في لوحة المدير أيضاً
                const points = ev ? (ev.total_score >= 90 ? 5 : ev.total_score >= 80 ? 4 : ev.total_score >= 70 ? 3 : ev.total_score >= 60 ? 2 : 1) : '--';
                
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-10">
                      <div className="flex items-center gap-5">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${hasV2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-[#0f4c4c]'}`}>{s.full_name.charAt(0)}</div>
                         <div>
                           <div className="font-black text-slate-800 text-lg flex items-center gap-2">
                             {s.full_name}
                             {hasV2 && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><Sparkles className="w-3 h-3" /> تحسين</span>}
                           </div>
                           <div className="text-[10px] text-slate-400 font-sans mt-1">{s.role} | {s.mobile}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-10 py-10">
                      <div className="flex flex-col gap-2">
                        {s.drive_link && (
                          <a href={s.drive_link} target="_blank" className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 w-fit">المجلد الأساسي</a>
                        )}
                        {hasV2 && (
                          <a href={s.drive_link_v2} target="_blank" className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2 w-fit border border-emerald-100 ring-2 ring-emerald-500/20"><AlertCircle className="w-3 h-3" /> مجلد التحسين (جديد)</a>
                        )}
                        {!s.drive_link && <span className="text-slate-300 italic text-xs">لا توجد شواهد</span>}
                      </div>
                    </td>
                    <td className="px-10 py-10">
                      {ev ? (
                         <div className="text-center w-fit">
                            <div className="text-2xl font-black text-[#0f4c4c] font-sans">{points} <span className="text-xs text-slate-300">/ 5</span></div>
                            <div className="text-[10px] font-bold text-slate-400">({ev.total_score}%)</div>
                         </div>
                      ) : <span className="text-slate-200">--</span>}
                    </td>
                    <td className="px-10 py-10">
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => setSelectedStaff(s)} className={`px-8 py-3.5 rounded-2xl text-[11px] font-black transition-all shadow-lg flex items-center gap-3 ${hasV2 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-[#0f4c4c] hover:bg-black text-white'}`}>
                           <UserCheck className="w-5 h-5" /> {ev ? 'تعديل التقييم' : 'بدء التقييم'}
                        </button>
                        {ev && <button onClick={() => handlePrint(s, ev)} className="p-3 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all"><Printer className="w-6 h-6" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {selectedStaff && <EvaluationModal staff={selectedStaff} onClose={() => { setSelectedStaff(null); fetchData(); }} />}
      {evaluationToShow && <PrintableReport staff={evaluationToShow.staff} evaluation={evaluationToShow.evaluation} principalName={userProfile.full_name} />}
    </div>
  );
};

export default PrincipalDashboard;
