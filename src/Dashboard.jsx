import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  CalendarDays,
  Printer,
  PlusSquare,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Hash,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';
import { mergeWithLocalJobCards } from './utils/localJobCards';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100', dot: 'bg-amber-400', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100', dot: 'bg-blue-500', icon: AlertCircle },
  completed: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100', dot: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-100', dot: 'bg-red-400', icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
};

const CountUp = ({ end, duration = 2000, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      const easeOutQuad = (t) => t * (2 - t);
      setCount(Math.floor(easeOutQuad(percentage) * end));
      if (percentage < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
};

const StatCard = ({ title, value, prefix = '', diff, icon: IconComponent, gradient, iconBg }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-linear-to-br ${gradient} opacity-10 rounded-bl-full`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
        <p className="text-2xl sm:text-3xl font-black text-gray-900 truncate">
          <CountUp end={value} prefix={prefix} />
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
          >
            {diff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {diff >= 0 ? '+' : ''}
            {diff.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        {IconComponent && <IconComponent size={20} />}
      </div>
    </div>
  </div>
);

const SimpleStatCard = ({ title, value, icon: IconComponent, iconBg, textColor = 'text-gray-900', subtitle, onClick }) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
        <p className={`text-2xl sm:text-3xl font-black ${textColor} truncate`}>
          <CountUp end={value} />
        </p>
        {subtitle && <p className="text-xs text-gray-400 font-medium mt-2">{subtitle}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        {IconComponent && <IconComponent size={20} />}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    monthlyDiff: 0,
    yearlyRevenue: 0,
    yearlyDiff: 0,
    totalJobs: 0,
    monthJobs: 0,
    todayJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
  });
  const [recentCards, setRecentCards] = useState([]);

  useEffect(() => {
    const applyDashboardData = (cards) => {
      const safeData = Array.isArray(cards) ? cards : [];
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const todayStr = now.toDateString();

      let curMonthSum = 0;
      let prevMonthSum = 0;
      let curYearSum = 0;
      let prevYearSum = 0;
      let monthJobs = 0;
      let todayJobs = 0;
      let pendingJobs = 0;
      let completedJobs = 0;

      safeData.forEach((card) => {
        const cardDate = new Date(card.jobDate || card.createdAt);
        const amt = Number(card.totalAmount) || 0;
        const cardYear = cardDate.getFullYear();
        const cardMonth = cardDate.getMonth();

        if (cardYear === currentYear) {
          curYearSum += amt;
          if (cardMonth === currentMonth) monthJobs += 1;
        }
        if (cardYear === currentYear - 1) prevYearSum += amt;
        if (cardYear === currentYear && cardMonth === currentMonth) curMonthSum += amt;

        const isPrevMonth =
          currentMonth === 0
            ? cardYear === currentYear - 1 && cardMonth === 11
            : cardYear === currentYear && cardMonth === currentMonth - 1;
        if (isPrevMonth) prevMonthSum += amt;

        if (cardDate.toDateString() === todayStr) todayJobs += 1;

        const status = card.status || 'pending';
        if (status === 'pending' || status === 'in-progress') pendingJobs += 1;
        if (status === 'completed') completedJobs += 1;
      });

      let monthlyDiff = 0;
      if (prevMonthSum > 0) monthlyDiff = ((curMonthSum - prevMonthSum) / prevMonthSum) * 100;
      else if (curMonthSum > 0) monthlyDiff = 100;

      let yearlyDiff = 0;
      if (prevYearSum > 0) yearlyDiff = ((curYearSum - prevYearSum) / prevYearSum) * 100;
      else if (curYearSum > 0) yearlyDiff = 100;

      setStats({
        monthlyRevenue: curMonthSum,
        monthlyDiff,
        yearlyRevenue: curYearSum,
        yearlyDiff,
        totalJobs: safeData.length,
        monthJobs,
        todayJobs,
        pendingJobs,
        completedJobs,
      });

      // Most recent 10 cards for dashboard table
      const sorted = [...safeData].sort((a, b) => new Date(b.jobDate || b.createdAt) - new Date(a.jobDate || a.createdAt));
      setRecentCards(sorted.slice(0, 10));
    };

    const loadDashboardData = async () => {
      applyDashboardData(mergeWithLocalJobCards([]));

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(`${API_BASE_URL}/api/jobcard`, { signal: controller.signal });
          const data = res.ok ? await res.json() : [];
          applyDashboardData(mergeWithLocalJobCards(Array.isArray(data) ? data : []));
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        if (err?.name === 'AbortError') {
          applyDashboardData(mergeWithLocalJobCards([]));
          return;
        }
        console.error('Error fetching latest job cards:', err);
        applyDashboardData(mergeWithLocalJobCards([]));
      }
    };

    loadDashboardData();

    const onJobCardsUpdated = () => loadDashboardData();
    const onFocus = () => {
      if (document.visibilityState === 'visible') loadDashboardData();
    };

    window.addEventListener('jobCardsUpdated', onJobCardsUpdated);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('jobCardsUpdated', onJobCardsUpdated);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  const greeting =
    new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formatDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="py-6 sm:py-8">
      {/* Greeting Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-blue-600 mb-1">{today}</p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{greeting}!</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/job-card')}
          className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] shrink-0"
        >
          <PlusSquare size={18} />
          New Job Card
        </button>
      </div>

      {/* Diwali Festive Special Banner with Animated Fireworks, Rockets & Diya */}
      <div className="relative overflow-hidden rounded-3xl mb-8 p-6 sm:p-9 text-white shadow-2xl border border-amber-500/40 bg-gradient-to-r from-[#2e0510] via-[#520a18] to-[#420917]">
        {/* Decorative Golden Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-orange-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* --- DYNAMIC FIREWORKS / PATAKHE OVERLAYS --- */}
        {/* Firework Burst 1 (Top Left) */}
        <div className="absolute top-3 left-12 w-28 h-28 pointer-events-none firework-anim-1">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="3" fill="#fef08a" />
            <line x1="50" y1="50" x2="50" y2="10" stroke="#fde047" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="50" y1="50" x2="85" y2="20" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="50" y1="50" x2="90" y2="50" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="50" y1="50" x2="80" y2="80" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="50" y1="50" x2="50" y2="90" stroke="#ec4899" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="50" y1="50" x2="20" y2="80" stroke="#a855f7" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="50" y1="50" x2="10" y2="50" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 2" />
            <line x1="50" y1="50" x2="20" y2="20" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" />
            <circle cx="50" cy="8" r="2.5" fill="#fef08a" />
            <circle cx="87" cy="18" r="2.5" fill="#f59e0b" />
            <circle cx="92" cy="50" r="2.5" fill="#ef4444" />
            <circle cx="18" cy="18" r="2.5" fill="#10b981" />
          </svg>
        </div>

        {/* Firework Burst 2 (Center Top) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-36 h-36 pointer-events-none firework-anim-2">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="4" fill="#ffffff" />
            <line x1="50" y1="50" x2="50" y2="5" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 3" />
            <line x1="50" y1="50" x2="90" y2="25" stroke="#fb923c" strokeWidth="2.5" strokeDasharray="5 3" />
            <line x1="50" y1="50" x2="95" y2="60" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="5 3" />
            <line x1="50" y1="50" x2="70" y2="92" stroke="#e879f9" strokeWidth="2.5" strokeDasharray="5 3" />
            <line x1="50" y1="50" x2="30" y2="92" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5 3" />
            <line x1="50" y1="50" x2="5" y2="60" stroke="#4ade80" strokeWidth="2.5" strokeDasharray="5 3" />
            <line x1="50" y1="50" x2="10" y2="25" stroke="#facc15" strokeWidth="2.5" strokeDasharray="5 3" />
            <circle cx="50" cy="4" r="3" fill="#ffffff" />
            <circle cx="92" cy="23" r="3" fill="#fb923c" />
            <circle cx="97" cy="62" r="3" fill="#f43f5e" />
            <circle cx="8" cy="23" r="3" fill="#facc15" />
          </svg>
        </div>

        {/* Firework Burst 3 (Right Center behind Diya) */}
        <div className="absolute top-6 right-8 w-32 h-32 pointer-events-none firework-anim-3">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="3" fill="#fef08a" />
            <line x1="50" y1="50" x2="50" y2="12" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="50" y1="50" x2="80" y2="20" stroke="#ec4899" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="50" y1="50" x2="88" y2="50" stroke="#facc15" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="50" y1="50" x2="75" y2="80" stroke="#4ade80" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="50" y1="50" x2="25" y2="80" stroke="#fb923c" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="50" y1="50" x2="12" y2="50" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 2" />
            <line x1="50" y1="50" x2="20" y2="20" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 2" />
          </svg>
        </div>

        {/* Rising Real Diwali Rocket 1 (Patakha with Stick & Sparks) */}
        <div className="absolute bottom-1 left-1/4 pointer-events-none rocket-trail-1">
          <svg width="26" height="75" viewBox="0 0 26 75" fill="none" className="overflow-visible drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
            <polygon points="13,0 5,16 21,16" fill="#dc2626" stroke="#fef08a" strokeWidth="1" />
            <rect x="6" y="16" width="14" height="26" rx="2" fill="#f97316" stroke="#fde047" strokeWidth="1" />
            <rect x="6" y="21" width="14" height="4" fill="#facc15" />
            <rect x="6" y="32" width="14" height="4" fill="#16a34a" />
            {/* Wooden Stick */}
            <line x1="13" y1="30" x2="13" y2="70" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
            {/* Real Fire Tail & Smoke Glow */}
            <g className="real-rocket-sparks">
              <circle cx="13" cy="44" r="3" fill="#ffffff" />
              <path d="M 9,42 Q 13,56 17,42" fill="#ef4444" />
              <line x1="13" y1="42" x2="13" y2="58" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 1" />
            </g>
          </svg>
        </div>

        {/* Rising Real Diwali Rocket 2 (Patakha with Stick & Sparks) */}
        <div className="absolute bottom-2 right-1/4 pointer-events-none rocket-trail-2 hidden sm:block">
          <svg width="26" height="75" viewBox="0 0 26 75" fill="none" className="overflow-visible drop-shadow-[0_0_12px_rgba(234,88,12,0.8)]">
            <polygon points="13,0 5,16 21,16" fill="#7c3aed" stroke="#fef08a" strokeWidth="1" />
            <rect x="6" y="16" width="14" height="26" rx="2" fill="#ea580c" stroke="#fde047" strokeWidth="1" />
            <rect x="6" y="21" width="14" height="4" fill="#38bdf8" />
            <rect x="6" y="32" width="14" height="4" fill="#facc15" />
            {/* Wooden Stick */}
            <line x1="13" y1="30" x2="13" y2="70" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
            {/* Real Fire Tail & Smoke Glow */}
            <g className="real-rocket-sparks">
              <circle cx="13" cy="44" r="3" fill="#ffffff" />
              <path d="M 9,42 Q 13,56 17,42" fill="#f97316" />
              <line x1="13" y1="42" x2="13" y2="58" stroke="#eab308" strokeWidth="3" strokeDasharray="3 1" />
            </g>
          </svg>
        </div>

        {/* Anar Spark Sprays (Bottom left & right) */}
        <div className="absolute -bottom-2 left-6 pointer-events-none text-amber-300 text-xs anar-spray-1 select-none">
          ✨ 💥 ✨
        </div>
        <div className="absolute -bottom-2 right-44 pointer-events-none text-yellow-200 text-xs anar-spray-2 select-none hidden md:block">
          ⚡ 🌟 💥
        </div>

        {/* Floating Twinkling Stars & Sparklers */}
        <div className="absolute top-4 left-6 diwali-star-twinkle-1 text-amber-300 text-lg select-none pointer-events-none">✦</div>
        <div className="absolute top-8 left-1/3 diwali-star-twinkle-2 text-yellow-200 text-xs select-none pointer-events-none">✨</div>
        <div className="absolute bottom-6 left-1/2 diwali-star-twinkle-3 text-amber-300 text-sm select-none pointer-events-none">★</div>
        <div className="absolute top-5 right-1/3 diwali-star-twinkle-2 text-yellow-100 text-sm select-none pointer-events-none">✦</div>
        <div className="absolute bottom-5 right-20 diwali-star-twinkle-1 text-amber-200 text-base select-none pointer-events-none">✨</div>
        <div className="absolute top-1/2 right-12 sparkle-spinner text-yellow-300 text-xl select-none pointer-events-none">🎇</div>

        {/* Content Layout */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center lg:text-left">
            {/* Festive Badge with Patakha Emoji */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-red-500/25 border border-amber-400/50 rounded-full px-4 py-1.5 text-xs font-bold text-amber-200 shadow-lg shadow-amber-900/40 mb-3.5 backdrop-blur-md">
              <span className="text-base">🎆</span>
              <span>दीपावली महापर्व की हार्दिक शुभकामनाएं</span>
              <span className="text-base">🪔</span>
            </div>

            {/* Main Greeting Heading (Removed & Prosperous New Year) */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-3">
              <span className="diwali-gold-text drop-shadow-[0_2px_18px_rgba(245,158,11,0.6)]">
                Happy Diwali!
              </span>
            </h2>

            {/* Subtitle / Wish with printosync family */}
            <p className="text-amber-100/90 text-sm sm:text-base font-medium max-w-2xl leading-relaxed mb-4">
              भगवान श्री गणेश एवं माता लक्ष्मी जी की कृपा से आपके जीवन और व्यापार में सुख, समृद्धि और नई ऊंचाइयां आएं।
              <span className="block mt-1.5 font-bold text-amber-300 text-base">
                — printosync family
              </span>
            </p>

            {/* Quick Action / Festive Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs font-bold text-amber-200/90">
              <span className="px-3.5 py-1.5 rounded-xl bg-black/35 border border-amber-500/30 backdrop-blur-md shadow-sm flex items-center gap-1.5">
                <span>🪔</span> Light & Prosperity
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-black/35 border border-amber-500/30 backdrop-blur-md shadow-sm flex items-center gap-1.5">
                <span>💥</span> Festive Celebrations
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-black/35 border border-amber-500/30 backdrop-blur-md shadow-sm flex items-center gap-1.5">
                <span>✨</span> Quality Print Services
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-black/35 border border-amber-500/30 backdrop-blur-md shadow-sm flex items-center gap-1.5">
                <span>🤝</span> Trusted Partnership
              </span>
            </div>
          </div>

          {/* Right Visual: Glowing Traditional Brass Diya Illustration + Sparklers */}
          <div className="shrink-0 flex items-center justify-center relative p-3">
            {/* Radiant Diya Aura */}
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/40 via-yellow-500/25 to-transparent rounded-full blur-2xl" />

            <svg
              viewBox="0 0 240 180"
              className="w-48 sm:w-56 h-auto relative z-10 drop-shadow-[0_12px_28px_rgba(0,0,0,0.7)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Hanging Lantern Strings & Lanterns on Top */}
              <g className="diwali-lantern-swing">
                <line x1="45" y1="0" x2="45" y2="40" stroke="#fcd34d" strokeWidth="1.5" strokeDasharray="3 3" />
                <polygon points="45,40 55,54 35,54" fill="#f59e0b" />
                <polygon points="35,54 55,54 45,68" fill="#d97706" />
                <circle cx="45" cy="54" r="3" fill="#fef08a" />
              </g>

              <g className="diwali-lantern-swing" style={{ animationDelay: '0.8s' }}>
                <line x1="195" y1="0" x2="195" y2="35" stroke="#fcd34d" strokeWidth="1.5" strokeDasharray="3 3" />
                <polygon points="195,35 205,49 185,49" fill="#f59e0b" />
                <polygon points="185,49 205,49 195,63" fill="#d97706" />
                <circle cx="195" cy="49" r="3" fill="#fef08a" />
              </g>

              {/* Big Center Golden Diya Base / Oil Bowl */}
              <ellipse cx="120" cy="155" rx="70" ry="12" fill="rgba(0,0,0,0.35)" />
              <path
                d="M 45 130 C 52 165, 188 165, 195 130 C 182 142, 58 142, 45 130 Z"
                fill="url(#diyaBodyGrad)"
                stroke="#fef08a"
                strokeWidth="1.5"
              />
              <ellipse cx="120" cy="130" rx="75" ry="14" fill="url(#diyaRimGrad)" stroke="#fde047" strokeWidth="1" />
              <ellipse cx="120" cy="130" rx="66" ry="9" fill="url(#diyaOilGrad)" />

              {/* Diya Wick Tip */}
              <path d="M 118 126 C 117 115, 123 115, 122 126 Z" fill="#78350f" />

              {/* Glowing Dynamic Flames */}
              <g className="diwali-flame-glow">
                {/* Outer Flame (Orange) */}
                <path
                  d="M 120 48 C 100 85, 105 118, 120 125 C 135 118, 140 85, 120 48 Z"
                  fill="url(#outerFlameGrad)"
                />
                {/* Mid Flame (Yellow) */}
                <path
                  d="M 120 62 C 107 90, 110 115, 120 123 C 130 115, 133 90, 120 62 Z"
                  fill="url(#midFlameGrad)"
                />
                {/* Core Flame (Pure Bright Light) */}
                <path
                  d="M 120 78 C 113 95, 114 112, 120 120 C 126 112, 127 95, 120 78 Z"
                  fill="#ffffff"
                />
              </g>

              {/* Gradients */}
              <defs>
                <linearGradient id="diyaBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#b45309" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id="diyaRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b45309" />
                  <stop offset="30%" stopColor="#fef08a" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="diyaOilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#451a03" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <linearGradient id="outerFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="35%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id="midFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl mb-8 bg-white p-6 sm:p-8 text-gray-900 shadow-xl shadow-gray-200/50 border border-gray-100">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 text-xs font-semibold mb-4 text-blue-700">
              <Printer size={14} className="text-blue-600" />
              Print - Design - Deliver
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight mb-2 text-gray-900">
              Your print business, fully under control
            </h2>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Job cards, invoices, challans, and paper stock - manage everything from one dashboard.
            </p>
          </div>
          <div className="flex flex-1 justify-center shrink-0 -my-4 sm:-my-8 z-0">
            <img src="/machine.png" alt="Printing Machine" className="h-32 sm:h-44 object-contain mix-blend-multiply transition-all duration-500 scale-125 sm:scale-150 hover:scale-[1.6]" />
          </div>
          <div className="flex flex-wrap gap-3 shrink-0 relative z-20">
            {/* <button
              type="button"
              onClick={() => navigate('/invoice/add')}
              className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-md"
            >
              Add Invoice
            </button> */}
            <button
              type="button"
              onClick={() => navigate('/paper-stock')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-md"
            >
              Paper Stock
            </button>
          </div>
        </div>
      </div>



      {/* Job Status Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <SimpleStatCard
          title="Total Job Cards"
          value={stats.totalJobs}
          icon={Briefcase}
          iconBg="bg-gray-100 text-gray-600"
          subtitle="All time"
          onClick={() => navigate('/job-card-list')}
        />
        <SimpleStatCard
          title="Today's Jobs"
          value={stats.todayJobs}
          icon={Clock}
          iconBg="bg-amber-50 text-amber-500"
          textColor="text-amber-600"
          subtitle="Created today"
          onClick={() => navigate('/job-card-list')}
        />
        <SimpleStatCard
          title="Pending Jobs"
          value={stats.pendingJobs}
          icon={AlertCircle}
          iconBg="bg-orange-50 text-orange-500"
          textColor="text-orange-600"
          subtitle="Needs attention"
          onClick={() => navigate('/report')}
        />
        <SimpleStatCard
          title="Completed Jobs"
          value={stats.completedJobs}
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600"
          textColor="text-emerald-600"
          subtitle="Delivered"
          onClick={() => navigate('/report')}
        />
      </div>

      {/* Recent Job Cards Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h2 className="font-black text-gray-900 text-base">Recent Job Cards</h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Latest 10 job cards across all statuses</p>
          </div>
          <button
            onClick={() => navigate('/report')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-700 rounded-xl text-xs font-black hover:bg-violet-100 transition-all"
          >
            Full Report
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/60 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Job No.</th>
                <th className="px-5 py-3.5">Party Name</th>
                <th className="px-5 py-3.5">Job Name</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentCards.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-400 italic text-sm">
                    No job cards yet. Create your first job card!
                  </td>
                </tr>
              ) : (
                recentCards.map((card) => (
                  <tr
                    key={card._id}
                    onClick={() => navigate(`/job-card/${card._id}`)}
                    className="hover:bg-violet-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                        <Calendar size={12} className="text-gray-300" />
                        {formatDate(card.jobDate || card.createdAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-xs font-black text-violet-500">
                        <Hash size={11} />
                        {card.jobNumber || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <User size={11} className="text-blue-600" />
                        </div>
                        <p className="font-black text-gray-900 text-sm group-hover:text-violet-700 transition-colors">
                          {card.partyName || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-gray-600 max-w-48 truncate">{card.jobName || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-0.5 font-black text-gray-900 text-sm">
                        <IndianRupee size={12} className="text-gray-500" />
                        {(Number(card.totalAmount) || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={card.status || 'pending'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {recentCards.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-50 bg-gray-50/30">
            <button
              onClick={() => navigate('/report')}
              className="text-xs font-black text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
            >
              View all {stats.totalJobs} job cards in full report
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
