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

const StatCard = ({ title, value, prefix = '', diff, icon: Icon, gradient, iconBg }) => (
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
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
              diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}
          >
            {diff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {diff >= 0 ? '+' : ''}
            {diff.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const SimpleStatCard = ({ title, value, icon: Icon, iconBg, textColor = 'text-gray-900', subtitle, onClick }) => (
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
        <Icon size={20} />
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

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl mb-8 bg-linear-to-r from-[#1e3a8a] via-[#2563eb] to-[#4f46e5] p-6 sm:p-8 text-white shadow-xl shadow-blue-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.25),transparent_55%)]" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-xs font-semibold mb-4">
              <Printer size={14} className="text-orange-300" />
              Print - Design - Deliver
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
              Your print business, fully under control
            </h2>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Job cards, invoices, challans, and paper stock - manage everything from one dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/invoice/add')}
              className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-md"
            >
              Add Invoice
            </button>
            <button
              type="button"
              onClick={() => navigate('/paper-stock')}
              className="bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-sm px-5 py-2.5 rounded-xl font-bold text-sm transition"
            >
              Paper Stock
            </button>
          </div>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatCard
          title="Monthly Revenue"
          value={stats.monthlyRevenue}
          prefix="₹"
          diff={stats.monthlyDiff}
          icon={IndianRupee}
          gradient="from-blue-500 to-indigo-600"
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Yearly Revenue"
          value={stats.yearlyRevenue}
          prefix="₹"
          diff={stats.yearlyDiff}
          icon={CalendarDays}
          gradient="from-indigo-500 to-purple-600"
          iconBg="bg-indigo-50 text-indigo-600"
        />
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
                    onClick={() => navigate('/job-card-list')}
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
