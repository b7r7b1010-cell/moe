
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Profile, UserRole } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PrincipalDashboard from './components/PrincipalDashboard';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const initApp = async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      if (err.message?.includes('fetch')) {
        setConnectionError(true);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
           // السجل غير موجود بعد، قد يكون هناك تأخير في الإضافة
           console.warn('Profile not found yet');
           setProfile(null);
        } else if (error.message.includes('fetch')) {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 font-cairo">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">جاري التحميل...</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 font-cairo">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">فشل الاتصال</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            حدث خطأ أثناء محاولة الوصول لقاعدة البيانات.
          </p>
          <button 
            onClick={initApp}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> تحديث الصفحة
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  // في حالة كان هناك جلسة ولكن لم يتم جلب البروفايل بعد (لحظة انتقالية)
  if (!profile && session) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-cairo">
         <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
         <p className="text-slate-600">جاري جلب بيانات ملفك الشخصي...</p>
         <button onClick={() => fetchProfile(session.user.id)} className="mt-4 text-emerald-600 underline">اضغط هنا إذا استمر الانتظار</button>
       </div>
     );
  }

  return profile?.role === UserRole.PRINCIPAL ? (
    <PrincipalDashboard userProfile={profile} />
  ) : (
    <Dashboard userProfile={profile!} />
  );
}

export default App;
