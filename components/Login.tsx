import React, { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection, safeSignOut } from '../supabase';
import { UserRole } from '../types';
import { 
  KeyRound, Phone, UserPlus, LogIn, 
  RefreshCw, User, Briefcase, GraduationCap, 
  ShieldCheck, Users, Beaker, ClipboardCheck, AlertTriangle,
  HeartPulse, Sparkles, BookOpen, Smartphone
} from 'lucide-react';
import { MobileInstallModal } from './MobileInstallModal';

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [subject, setSubject] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.TEACHER);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const rolesConfig = [
    { role: UserRole.TEACHER, label: 'معلم', icon: GraduationCap, desc: 'التدريس والواجبات التعليمية' },
    { role: UserRole.TEACHER_ACTIVITY, label: 'معلم مسند له نشاط طلابي', icon: Sparkles, desc: 'تدريس + الإشراف على الأنشطة' },
    { role: UserRole.TEACHER_HEALTH, label: 'معلم مسند له توجيه صحي', icon: HeartPulse, desc: 'تدريس + الإشراف على الصحة المدرسية' },
    { role: UserRole.COUNSELOR, label: 'موجه طلابي', icon: ClipboardCheck, desc: 'التوجيه والإرشاد ورعاية الطلاب' },
    { role: UserRole.LAB_ASSISTANT, label: 'محضر مختبر', icon: Beaker, desc: 'التجهيزات والتجارب المعملية' },
    { role: UserRole.VICE_PRINCIPAL, label: 'وكيل مدرسة', icon: Users, desc: 'الشؤون التعليمية والمدرسية' },
  ];

  const checkConnection = async () => {
    setServerStatus('checking');
    const result = await testSupabaseConnection();
    setServerStatus(result.ok ? 'online' : 'offline');
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const normalizeMobile = (str: string) => {
    const arabicNums = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    let normalized = str.trim().replace(/\s/g, '');
    for (let i = 0; i < 10; i++) {
      normalized = normalized.replace(arabicNums[i], i.toString());
    }
    return normalized;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = normalizeMobile(mobile);
    
    if (!cleanMobile.match(/^05\d{8}$/)) {
      alert('رقم جوال غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام.');
      return;
    }

    setLoading(true);
    const internalEmail = `${cleanMobile}@school.local`;
    
    try {
      if (isRegistering) {
        if (fullName.trim().split(' ').length < 3) {
          alert('الرجاء كتابة الاسم الثلاثي أو الرباعي كاملاً');
          setLoading(false);
          return;
        }
        
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email: internalEmail, 
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              mobile: cleanMobile,
              role: role,
              subject: subject.trim() || ''
            }
          }
        });
        
        if (authError) {
          if (authError.message.includes('already registered')) {
            throw new Error('هذا الرقم مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة أو طلب إعادة تعيين من مدير المدرسة.');
          }
          throw authError;
        }
        
        if (authData.user) {
          const autoApprove = role === UserRole.PRINCIPAL;
          const { error: profileError } = await supabase.from('profiles').upsert({ 
            id: authData.user.id, 
            full_name: fullName.trim(), 
            mobile: cleanMobile,
            role: role,
            subject: subject.trim() || '',
            is_approved: autoApprove 
          });

          if (profileError) {
            console.error('Error inserting profile:', profileError);
            throw new Error(`تم إنشاء الحساب الأمني ولكن تعذر حفظ الملف الشخصي: ${profileError.message}`);
          }
          
          alert(autoApprove ? 'تم إنشاء الحساب بنجاح.' : 'تم تسجيل طلبك بنجاح! يرجى الانتظار حتى يقوم مدير المدرسة باعتماد الحساب.');
          setIsRegistering(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: internalEmail, 
          password 
        });
        
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('بيانات الدخول غير صحيحة. يرجى التحقق من رقم الجوال وكلمة المرور.');
          }
          if (signInError.message.includes('Refresh Token') || signInError.message.includes('refresh_token')) {
            await safeSignOut();
            throw new Error('انتهت صلاحية الجلسة السابقة. يرجى إعادة إدخال كلمة المرور.');
          }
          throw signInError;
        }
        onLogin();
      }
    } catch (err: any) {
      alert(err.message);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-cairo text-right" dir="rtl">
      <div className={`w-full ${isRegistering ? 'max-w-3xl' : 'max-w-md'} bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 transition-all`}>
        {/* الترويسة المدرسية */}
        <div className="bg-[#0f4c4c] p-8 text-white relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="text-right space-y-0.5 font-cairo opacity-95">
              <p className="text-[10px] md:text-xs font-bold tracking-tight">المملكة العربية السعودية</p>
              <p className="text-[10px] md:text-xs font-medium">وزارة التعليم</p>
              <p className="text-[10px] md:text-xs font-medium">الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-[12px] md:text-sm font-black border-t border-white/20 mt-1 pt-1 text-emerald-300">ثانوية الأمير عبدالمجيد الأولى</p>
            </div>
            <img src="https://up6.cc/2026/01/176840436497671.png" className="h-16 md:h-20 object-contain drop-shadow-lg" alt="Logo" />
          </div>
          <div className="bg-black/20 py-2.5 px-4 rounded-xl text-center border border-white/10 shadow-inner">
            <h2 className="text-base md:text-lg font-black font-cairo">نظام «إتقان 2.0» لإدارة الأداء الوظيفي</h2>
            <p className="text-xs font-bold text-emerald-200 mt-0.5 font-cairo">1448هـ</p>
          </div>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="الاسم الرباعي كاملاً" 
                      required 
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:border-[#0f4c4c] outline-none" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                    />
                  </div>
                  <div className="relative">
                    <BookOpen className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="التخصص / المادة التعليمية (اختياري)" 
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:border-[#0f4c4c] outline-none" 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 block">اختر الوظيفة التعليمية / التكليف المسند:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {rolesConfig.map((item) => (
                      <button 
                        key={item.role} 
                        type="button" 
                        onClick={() => setRole(item.role)} 
                        className={`flex flex-col text-right p-3 rounded-xl border transition-all ${
                          role === item.role 
                            ? 'border-[#0f4c4c] bg-[#0f4c4c]/5 text-[#0f4c4c] ring-2 ring-[#0f4c4c]/20 font-black' 
                            : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <item.icon className="w-4 h-4 text-[#0f4c4c]" />
                          <span className="text-xs font-bold">{item.label}</span>
                        </div>
                        <span className="text-[9px] text-slate-400">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="رقم الجوال (05xxxxxxxx)" 
                      required 
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-sans focus:border-[#0f4c4c] outline-none" 
                      value={mobile} 
                      onChange={(e) => setMobile(e.target.value)} 
                      dir="ltr" 
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      placeholder="كلمة المرور" 
                      required 
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:border-[#0f4c4c] outline-none" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="رقم الجوال (05xxxxxxxx)" 
                    required 
                    className="w-full pr-10 pl-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-sans focus:border-[#0f4c4c] outline-none text-left" 
                    value={mobile} 
                    onChange={(e) => setMobile(e.target.value)} 
                    dir="ltr" 
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password" 
                    placeholder="كلمة المرور" 
                    required 
                    className="w-full pr-10 pl-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm focus:border-[#0f4c4c] outline-none" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
              </div>
            )}

            <button 
              disabled={loading} 
              type="submit" 
              className="w-full bg-[#0f4c4c] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#0d3d3d] transition-all flex items-center justify-center gap-3 active:scale-95 text-base mt-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'إنشاء الحساب وإرسال الطلب' : 'تسجيل الدخول'}
            </button>
          </form>

          <button 
            onClick={() => setIsRegistering(!isRegistering)} 
            className="w-full mt-6 text-[#0f4c4c] font-bold text-xs hover:underline font-cairo block text-center"
          >
            {isRegistering ? 'لديك حساب بالفعل؟ سجل دخولك الآن' : 'معلم جديد بالمدرسة؟ سجل بياناتك وانضم للنظام'}
          </button>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="text-slate-500 hover:text-[#0f4c4c] text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Smartphone className="w-4 h-4 text-[#00a18e]" />
              تثبيت التطبيق على الشاشة الرئيسية للجوال
            </button>
          </div>
        </div>
      </div>

      <MobileInstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
};

export default Login;
