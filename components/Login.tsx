
import React, { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection } from '../supabase';
import { UserRole } from '../types';
import { 
  KeyRound, Phone, UserPlus, LogIn, 
  RefreshCw, User, Briefcase, GraduationCap, 
  ShieldCheck, Users, Beaker, ClipboardCheck, AlertTriangle
} from 'lucide-react';

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEACHER);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const rolesConfig = [
    { role: UserRole.TEACHER, icon: GraduationCap },
    { role: UserRole.VICE_PRINCIPAL, icon: Users },
    { role: UserRole.COUNSELOR, icon: ClipboardCheck },
    { role: UserRole.LAB_ASSISTANT, icon: Beaker },
    { role: UserRole.PRINCIPAL, icon: ShieldCheck },
  ];

  const checkConnection = async () => {
    setServerStatus('checking');
    const result = await testSupabaseConnection();
    setServerStatus(result.ok ? 'online' : 'offline');
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.match(/^05\d{8}$/)) {
      alert('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام');
      return;
    }
    setLoading(true);
    const internalEmail = `${mobile}@school.local`;
    try {
      if (isRegistering) {
        if (fullName.trim().split(' ').length < 3) {
          alert('الرجاء كتابة الاسم الرباعي كاملاً');
          setLoading(false);
          return;
        }
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: internalEmail, password });
        if (authError) throw authError;
        if (authData.user) {
          await supabase.from('profiles').upsert({ id: authData.user.id, full_name: fullName, mobile: mobile, role: role });
          if (!authData.session) {
            alert('تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول.');
            setIsRegistering(false);
          } else { onLogin(); }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: internalEmail, password });
        if (signInError) throw signInError;
        onLogin();
      }
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        alert('❌ فشل الاتصال بالخادم. تأكد من جودة الإنترنت.');
        setServerStatus('offline');
      } else { alert('خطأ: ' + err.message); }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-cairo text-right" dir="rtl">
      <div className={`w-full ${isRegistering ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 relative`}>
        
        {/* Ministry Official Header */}
        <div className="bg-[#0f4c4c] p-8 text-white relative">
          <div className="flex justify-between items-center mb-6">
            <div className="text-right space-y-1 opacity-90">
              <p className="text-[10px] font-bold">المملكة العربية السعودية</p>
              <p className="text-[10px]">وزارة التعليم</p>
              <p className="text-[10px]">الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-[12px] font-black border-t border-white/10 mt-1 pt-1 tracking-tight">ثانوية الأمير عبدالمجيد الأولى</p>
            </div>
            <img 
              src="https://up6.cc/2026/01/176840436497671.png" 
              className="h-16 md:h-20 object-contain" 
              alt="Logo" 
            />
          </div>
          <div className="bg-black/20 py-2.5 px-4 rounded-xl text-center border border-white/10 shadow-inner">
            <h2 className="text-lg font-black tracking-wide">( بوابة الموظف - نظام إدارة الأداء الوظيفي )</h2>
          </div>
        </div>
        
        <div className="p-8">
          {serverStatus === 'offline' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-[10px] text-red-700 font-bold">الخادم غير متصل حالياً، يرجى التحقق من الشبكة.</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="الاسم الرباعي كاملاً" required className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:border-[#0f4c4c] outline-none" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {rolesConfig.map((item) => (
                      <button key={item.role} type="button" onClick={() => setRole(item.role)} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${role === item.role ? 'border-[#0f4c4c] bg-[#0f4c4c]/5 text-[#0f4c4c]' : 'border-slate-100 text-slate-400'}`}>
                        <item.icon className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold">{item.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="tel" placeholder="رقم الجوال" required className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-sans focus:border-[#0f4c4c] outline-none" value={mobile} onChange={(e) => setMobile(e.target.value)} dir="ltr" />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="password" placeholder="كلمة المرور" required className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:border-[#0f4c4c] outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="tel" placeholder="رقم الجوال" required className="w-full pr-10 pl-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-sans focus:border-[#0f4c4c] outline-none" value={mobile} onChange={(e) => setMobile(e.target.value)} dir="ltr" />
                </div>
                <div className="relative">
                  <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" placeholder="كلمة المرور" required className="w-full pr-10 pl-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm focus:border-[#0f4c4c] outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
            )}

            <button disabled={loading} type="submit" className="w-full bg-[#0f4c4c] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#0d3d3d] transition-all flex items-center justify-center gap-3 active:scale-95">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'إنشاء حساب جديد' : 'دخول النظام'}
            </button>
          </form>
          <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-6 text-[#0f4c4c] font-bold text-xs hover:underline">
            {isRegistering ? 'لديك حساب؟ سجل دخولك' : 'مستخدم جديد؟ سجل بياناتك الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
