
import React, { useState, useEffect } from 'react';
import { supabase, safeSignOut } from './supabase';
import { Profile, UserRole } from './types';
import { withTimeout } from './lib/taskHelpers';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PrincipalDashboard from './components/PrincipalDashboard';
import { Loader2, WifiOff, RefreshCw, Clock, ShieldAlert, LogOut, ArrowRight, UserCheck } from 'lucide-react';

// ملف App.tsx مع حماية كاملة من التعليق وإمكانية الدخول التجريبي السريع
const DEMO_PRINCIPAL: Profile = {
  id: 'demo-principal-01',
  full_name: 'أ. فهد بن عبدالله الشهري (مدير المدرسة)',
  role: UserRole.PRINCIPAL,
  mobile: '0500000001',
  is_approved: true,
  drive_link: 'https://drive.google.com/drive/folders/demo-principal',
  created_at: new Date().toISOString()
};

const DEMO_TEACHER: Profile = {
  id: 'demo-teacher-01',
  full_name: 'أ. خالد بن محمد الحربي (معلم رياضيات)',
  role: UserRole.TEACHER,
  subject: 'الرياضيات',
  mobile: '0555555555',
  is_approved: true,
  drive_link: 'https://drive.google.com/drive/folders/demo-teacher',
  created_at: new Date().toISOString()
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const handleGlobalLogout = async () => {
    // 1. إعادة ضبط الحالة فوراً (0 ملي ثانية) لتظهر شاشة الدخول بلا أدنى تأخير
    setSession(null);
    setProfile(null);
    setLoading(false);
    setConnectionError(false);

    // 2. مسح فوري لكافة بيانات الجلسة المحلية
    try {
      localStorage.removeItem('itqan_active_profile_1448');
      sessionStorage.removeItem('itqan_demo_user');
    } catch (e) {}

    // 3. إنهاء الجلسة في Supabase في الخلفية دون تعطيل الواجهة
    try {
      await safeSignOut();
    } catch (e) {
      console.warn('Logout non-blocking notice:', e);
    }
  };

  const handleDemoLogin = (type: 'principal' | 'teacher') => {
    const chosen = type === 'principal' ? DEMO_PRINCIPAL : DEMO_TEACHER;
    sessionStorage.setItem('itqan_demo_user', type);
    setProfile(chosen);
    setSession({ user: { id: chosen.id, email: `${chosen.mobile}@school.local` } });
    setLoading(false);
    setConnectionError(false);
  };

  const handleLoginSuccess = (newSession: any, newProfile?: Profile) => {
    if (newProfile) {
      setProfile(newProfile);
      try {
        localStorage.setItem('itqan_active_profile_1448', JSON.stringify(newProfile));
      } catch (e) {}
    }
    if (newSession) {
      setSession(newSession);
    }
    setLoading(false);
    setConnectionError(false);
  };

  const [showLoadingBypass, setShowLoadingBypass] = useState(false);

  const initApp = async () => {
    setConnectionError(false);

    // 1. التحقق أولاً من وجود جلسة تجريبية نشطة
    const activeDemo = sessionStorage.getItem('itqan_demo_user');
    if (activeDemo === 'principal') {
      handleDemoLogin('principal');
      return;
    } else if (activeDemo === 'teacher') {
      handleDemoLogin('teacher');
      return;
    }

    // 2. التحقق فوراً من البروفايل المحفوظ محلياً (يضمن بقاء الحساب مفتوحاً عند الضغط على F5 دون أي خروج)
    try {
      const cached = localStorage.getItem('itqan_active_profile_1448');
      if (cached) {
        const parsed: Profile = JSON.parse(cached);
        if (parsed && parsed.id && parsed.role) {
          setProfile(parsed);
          setSession({ user: { id: parsed.id, email: `${parsed.mobile || parsed.id}@school.local` } });
          setLoading(false);

          // مزامنة صامتة في الخلفية لتحديث البيانات دون أي تأثير على واجهة المستخدم
          withTimeout(supabase.auth.getSession(), 2500).then(({ data }) => {
            if (data?.session) {
              setSession(data.session);
              withTimeout(supabase.from('profiles').select('*').eq('id', parsed.id).maybeSingle(), 2500)
                .then(({ data: updatedProf }) => {
                  if (updatedProf) {
                    setProfile(updatedProf);
                    localStorage.setItem('itqan_active_profile_1448', JSON.stringify(updatedProf));
                  }
                }).catch(() => {});
            }
          }).catch(() => {});
          return;
        }
      }
    } catch (e) {
      console.warn('Cache parse notice:', e);
    }

    // 3. في حال عدم وجود جلسة محلية، نفحص Supabase Auth مع حد أقصى للانتظار 2.5 ثانية
    setLoading(true);
    try {
      const { data, error } = await withTimeout(supabase.auth.getSession(), 2500);
      if (error) {
        console.warn('Session check returned notice:', error.message);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (data?.session) {
        setSession(data.session);
        await fetchProfile(data.session.user.id);
      } else {
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    } catch (err: any) {
      console.warn('initApp caught error/timeout:', err);
      setSession(null);
      setProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();

    // مؤقت حماية إضافي يمنع بقاء الشاشة معلقة نهائياً لأكثر من ثانيتين ونصف
    const bypassTimer = setTimeout(() => {
      setShowLoadingBypass(true);
    }, 1500);

    const safetyTimeout = setTimeout(() => {
      setLoading((curr) => {
        if (curr) {
          console.warn('Safety timeout: forced loading to false');
          return false;
        }
        return false;
      });
    }, 2800);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      try {
        if (event === 'SIGNED_OUT' || !currentSession) {
          const cached = localStorage.getItem('itqan_active_profile_1448');
          if (!cached) {
            setSession(null);
            setProfile(null);
            setLoading(false);
          }
        } else if (currentSession) {
          setSession(currentSession);
          await fetchProfile(currentSession.user.id);
        }
      } catch (err: any) {
        console.warn('onAuthStateChange handler notice:', err);
      }
    });

    return () => {
      clearTimeout(bypassTimer);
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        2500
      );

      if (error) {
        console.warn('fetchProfile table notice:', error.message);
      }
      
      if (data) {
        setProfile(data);
        try {
          localStorage.setItem('itqan_active_profile_1448', JSON.stringify(data));
        } catch (e) {}
      } else {
        try {
          const { data: userData } = await withTimeout(supabase.auth.getUser(), 2000);
          const meta = userData?.user?.user_metadata || {};
          const userEmail = userData?.user?.email || '';
          const phoneFromEmail = userEmail.includes('@') ? userEmail.split('@')[0] : '';

          const recoveredProfile: Profile = {
            id: userId,
            full_name: meta.full_name || (phoneFromEmail ? `مستخدم (${phoneFromEmail})` : 'مستخدم المنظومة'),
            mobile: meta.mobile || phoneFromEmail || '',
            role: meta.role || UserRole.TEACHER,
            subject: meta.subject || '',
            is_approved: meta.role === UserRole.PRINCIPAL,
            drive_link: meta.drive_link || '',
            drive_link_v2: meta.drive_link_v2 || '',
            created_at: new Date().toISOString()
          };

          setProfile(recoveredProfile);
          try {
            localStorage.setItem('itqan_active_profile_1448', JSON.stringify(recoveredProfile));
          } catch (e) {}

          supabase.from('profiles').upsert(recoveredProfile).then(() => {});
        } catch (uErr) {
          console.warn('Error reading user metadata notice:', uErr);
        }
      }
    } catch (error: any) {
      console.warn('fetchProfile caught error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 gap-4 font-cairo text-right" dir="rtl">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-slate-600 font-bold text-sm animate-pulse">جاري التحقق من الجلسة وسجل الدخول...</p>
        
        {showLoadingBypass && (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
            <button
              onClick={() => { setLoading(false); }}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-emerald-600" />
              المتابعة لصفحة تسجيل الدخول فوراً
            </button>
            <button
              onClick={() => handleDemoLogin('principal')}
              className="bg-[#0f4c4c] hover:bg-[#134e4a] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-300" />
              دخول مباشر كمدير مدرسة 👑
            </button>
          </div>
        )}
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 font-cairo text-right" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <WifiOff className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">تعذر الاتصال بالخادم</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-bold">
            يمكنك تجربة المعاينة الفورية بكافة الميزات دون انتظار الاتصال بالخادم:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => handleDemoLogin('principal')}
              className="bg-[#0f4c4c] text-white py-3 rounded-xl font-black text-xs hover:bg-[#134e4a] transition shadow-xs"
            >
              معاينة كمدير مدرسة 👑
            </button>
            <button
              onClick={() => handleDemoLogin('teacher')}
              className="bg-emerald-600 text-white py-3 rounded-xl font-black text-xs hover:bg-emerald-700 transition shadow-xs"
            >
              معاينة كمعلم 🎓
            </button>
          </div>
          <button 
            onClick={initApp} 
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> إعادة محاولة الاتصال
          </button>
        </div>
      </div>
    );
  }

  if (!session) return <Login onLogin={handleLoginSuccess} />;

  if (profile && !profile.is_approved && profile.role !== UserRole.PRINCIPAL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-cairo text-right" dir="rtl">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-amber-100 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
           <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/50">
              <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
           </div>
           <h2 className="text-2xl font-black text-slate-800 mb-4">طلبك قيد المراجعة</h2>
           <p className="text-slate-500 font-bold mb-8 leading-relaxed">
              مرحباً <span className="text-[#0f4c4c]">{profile.full_name}</span>، لقد تم استلام طلب انضمامك للنظام بنجاح. يرجى الانتظار حتى يتم اعتماد حسابك من قبل مدير المدرسة.
           </p>
           <div className="space-y-3">
             <button onClick={initApp} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition shadow-lg">
                <RefreshCw className="w-4 h-4" /> تحديث حالة الطلب
             </button>
             <button onClick={handleGlobalLogout} className="w-full text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition">
                <LogOut className="w-4 h-4" /> تسجيل الخروج
             </button>
           </div>
        </div>
      </div>
    );
  }

  if (!profile && session) {
    // لمنع بقاء المستخدم معلقاً في هذه الشاشة، نعيده فوراً لتسجيل الدخول النظيف
    return <Login onLogin={handleLoginSuccess} />;
  }

  return profile?.role === UserRole.PRINCIPAL ? (
    <PrincipalDashboard userProfile={profile} onLogout={handleGlobalLogout} />
  ) : (
    <Dashboard userProfile={profile!} onLogout={handleGlobalLogout} />
  );
}

export default App;
