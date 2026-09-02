import React, { useEffect, useState } from 'react';
import { Smartphone, Share, PlusSquare, Check, X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const MobileInstallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 max-w-md w-full p-6 text-right relative overflow-hidden">
        {/* Header decoration */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-[#0f4c4c] via-[#00a18e] to-[#fcd34d]" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#0f4c4c] flex items-center justify-center p-2 shadow-md border border-[#00a18e]">
            <img src="/icon.svg" alt="إتقان" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">تثبيت تطبيق إتقان على الجوال</h3>
            <p className="text-xs font-bold text-slate-500">لوصول فوري من الشاشة الرئيسية بدون متصفح</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>التطبيق مثبت ويعمل بالفعل كنسخة تطبيق أصيل (App) على جهازك.</span>
          </div>
        ) : isIOS ? (
          /* iOS Instructions */
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-medium text-amber-900 leading-relaxed">
              <span className="font-black block mb-2 text-amber-950 flex items-center gap-1.5">
                <Share className="w-4 h-4 text-blue-600" /> خطوات الإضافة على هواتف آيفون (iOS Safari):
              </span>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 font-bold">
                <li>
                  اضغط على زر <strong className="text-blue-600">المشاركة (Share)</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> في أسفل شاشة سفاري.
                </li>
                <li>
                  مرر القائمة لأسفل واختر <strong className="text-slate-900">«إضافة إلى الصفحة الرئيسية» (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-700" />.
                </li>
                <li>
                  اضغط على كلمة <strong className="text-emerald-700">«إضافة» (Add)</strong> في أعلى الزاوية.
                </li>
              </ol>
            </div>
            <p className="text-[11px] text-slate-400 text-center font-bold">
              ستظهر أيقونة المنصة الرسمية على شاشتك الرئيسية فوراً.
            </p>
          </div>
        ) : (
          /* Android / Chrome Flow */
          <div className="space-y-4">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#0f4c4c] hover:bg-black text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                <Download className="w-5 h-5 text-[#fcd34d]" />
                تثبيت التطبيق على الشاشة الرئيسية الآن
              </button>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium text-slate-700 space-y-2">
                <span className="font-black block text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#00a18e]" /> التثبيت على أندرويد (Google Chrome):
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 font-bold">
                  <li>اضغط على قائمة الثلاث نقاط <strong className="text-slate-900">⋮</strong> أعلى متصفح كروم.</li>
                  <li>اختر <strong className="text-slate-900">«تثبيت التطبيق»</strong> أو <strong className="text-slate-900">«إضافة إلى الشاشة الرئيسية»</strong>.</li>
                  <li>تأكيد الإضافة.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
