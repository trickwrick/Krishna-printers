import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  FileText,
  Truck,
  Layers,
  PlusSquare,
  ArrowRight,
  IndianRupee,
  CalendarDays,
  Printer,
  CheckCircle2,
  Clock3,
  RotateCcw,
} from 'lucide-react';
import { API_BASE_URL } from './utils/apiBase';
import { mergeWithLocalJobCards } from './utils/localJobCards';

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
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full`} />
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

const QuickAction = ({ icon: Icon, label, desc, onClick, color }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-4 w-full p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-all text-left"
  >
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
      <Icon size={18} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-gray-900 text-sm">{label}</p>
      <p className="text-xs text-gray-500 truncate">{desc}</p>
    </div>
    <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
  </button>
);

const WorkflowStepper = ({ jobCards = [] }) => {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [progressByJob, setProgressByJob] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('krishnaJobWorkflowProgress') || '{}');
    } catch {
      return {};
    }
  });

  const steps = [
    { title: 'Design & Proof', desc: 'Artwork, design & client approval', owner: 'Super Admin 1' },
    { title: 'Printing', desc: 'Plate making & print production', owner: 'Super Admin 2' },
    { title: 'Binding & Finish', desc: 'Cutting, folding, lamination & dispatch prep', owner: 'Admin 1' },
    { title: 'QC & Delivery', desc: 'Quality check, packing & dispatch', owner: 'Admin 2' },
  ];

  useEffect(() => {
    if (!selectedJobId && jobCards.length) {
      setSelectedJobId(jobCards[0]._id || jobCards[0].jobNumber || '');
    }
  }, [jobCards, selectedJobId]);

  useEffect(() => {
    localStorage.setItem('krishnaJobWorkflowProgress', JSON.stringify(progressByJob));
  }, [progressByJob]);

  const selectedJob = jobCards.find((card) => (card._id || card.jobNumber) === selectedJobId) || jobCards[0];
  const jobKey = selectedJob?._id || selectedJob?.jobNumber || '';
  const currentStep = progressByJob[jobKey] || 0;

  const completeNextStep = () => {
    if (!jobKey) return;
    setProgressByJob((prev) => ({
      ...prev,
      [jobKey]: Math.min(steps.length, (prev[jobKey] || 0) + 1),
    }));
  };

  const resetProgress = () => {
    if (!jobKey) return;
    setProgressByJob((prev) => ({ ...prev, [jobKey]: 0 }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-gray-900">Job Workflow Progress</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Update each step in order. When one step is done, the next step starts.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={jobKey}
            onChange={(event) => setSelectedJobId(event.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {jobCards.length === 0 ? (
              <option value="">No job cards</option>
            ) : (
              jobCards.map((card) => {
                const key = card._id || card.jobNumber;
                return (
                  <option key={key} value={key}>
                    {card.jobNumber || 'LOCAL'} - {card.partyName || card.jobName || 'Job'}
                  </option>
                );
              })
            )}
          </select>
          <button
            type="button"
            onClick={resetProgress}
            disabled={!jobKey}
            className="h-10 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {selectedJob ? (
        <>
          <div className="px-5 sm:px-6 py-4 bg-blue-50/50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-black text-blue-700">{selectedJob.jobNumber || 'LOCAL JOB'}</span>
              <span className="text-sm font-semibold text-gray-800">{selectedJob.partyName || '-'}</span>
              <span className="text-xs text-gray-500">{selectedJob.jobName || ''}</span>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black text-blue-700 shadow-sm">
              {currentStep} / {steps.length} steps done
            </span>
          </div>

          <div className="px-5 sm:px-6 py-8">
            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="hidden md:block absolute left-[12.5%] right-[12.5%] top-5 h-0.5 bg-gray-200" />
              <div
                className="hidden md:block absolute left-[12.5%] top-5 h-0.5 bg-blue-500 transition-all"
                style={{ width: `${Math.max(0, (currentStep - 1) / (steps.length - 1)) * 75}%` }}
              />
              {steps.map((step, index) => {
                const number = index + 1;
                const done = currentStep >= number;
                const active = currentStep + 1 === number;
                return (
                  <div key={step.title} className="relative z-10 flex flex-col items-center text-center">
                    <div
                      className={`w-11 h-11 rounded-full border-4 flex items-center justify-center text-sm font-black shadow-sm ${
                        done
                          ? 'bg-emerald-500 border-emerald-100 text-white'
                          : active
                          ? 'bg-blue-600 border-blue-100 text-white'
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}
                    >
                      {done ? <CheckCircle2 size={18} /> : number}
                    </div>
                    <p className="mt-4 text-sm font-black text-gray-900">{step.title}</p>
                    <p className="mt-1 text-[11px] text-gray-400 max-w-40">{step.desc}</p>
                    <span
                      className={`mt-3 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        done ? 'bg-emerald-50 text-emerald-600' : active ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {done ? 'Done' : active ? 'In Progress' : step.owner}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-gray-500">
              {currentStep >= steps.length
                ? 'All workflow steps completed.'
                : `Step ${currentStep + 1} is in progress.`}
            </p>
            <button
              type="button"
              onClick={completeNextStep}
              disabled={currentStep >= steps.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {currentStep >= steps.length ? 'Completed' : `Step ${currentStep + 1} Complete`}
            </button>
          </div>
        </>
      ) : (
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          Save a job card to start workflow tracking.
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [latestJobCards, setLatestJobCards] = useState([]);
  const [allJobCards, setAllJobCards] = useState([]);
  const [loadingJobCards, setLoadingJobCards] = useState(true);
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    monthlyDiff: 0,
    yearlyRevenue: 0,
    yearlyDiff: 0,
    totalJobs: 0,
    monthJobs: 0,
    chartData: [],
  });

  useEffect(() => {
    const applyDashboardData = (cards) => {
      const safeData = Array.isArray(cards) ? cards : [];
        const sorted = [...safeData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllJobCards(sorted);
        setLatestJobCards(sorted.slice(0, 5));

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let curMonthSum = 0;
        let prevMonthSum = 0;
        let curYearSum = 0;
        let prevYearSum = 0;
        let monthJobs = 0;

        const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTotals = Array(12).fill(0);

        safeData.forEach((card) => {
          const cardDate = new Date(card.jobDate || card.createdAt);
          const amt = Number(card.totalAmount) || 0;
          const cardYear = cardDate.getFullYear();
          const cardMonth = cardDate.getMonth();

          if (cardYear === currentYear) {
            curYearSum += amt;
            monthlyTotals[cardMonth] += amt;
            if (cardMonth === currentMonth) monthJobs += 1;
          }
          if (cardYear === currentYear - 1) prevYearSum += amt;
          if (cardYear === currentYear && cardMonth === currentMonth) curMonthSum += amt;

          const isPrevMonth =
            currentMonth === 0
              ? cardYear === currentYear - 1 && cardMonth === 11
              : cardYear === currentYear && cardMonth === currentMonth - 1;
          if (isPrevMonth) prevMonthSum += amt;
        });

        let monthlyDiff = 0;
        if (prevMonthSum > 0) monthlyDiff = ((curMonthSum - prevMonthSum) / prevMonthSum) * 100;
        else if (curMonthSum > 0) monthlyDiff = 100;

        let yearlyDiff = 0;
        if (prevYearSum > 0) yearlyDiff = ((curYearSum - prevYearSum) / prevYearSum) * 100;
        else if (curYearSum > 0) yearlyDiff = 100;

        let cumulativeYearly = 0;
        const chartData = monthsNames.map((name, idx) => {
          cumulativeYearly += monthlyTotals[idx];
          return {
            name,
            'Monthly Revenue': monthlyTotals[idx],
            'Yearly Revenue': cumulativeYearly,
          };
        });

        setStats({
          monthlyRevenue: curMonthSum,
          monthlyDiff,
          yearlyRevenue: curYearSum,
          yearlyDiff,
          totalJobs: safeData.length,
          monthJobs,
          chartData,
        });
    };

    const loadDashboardData = async () => {
      setLoadingJobCards(true);
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
      } finally {
        setLoadingJobCards(false);
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

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl border border-gray-700">
          <p className="font-bold text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs font-medium opacity-90" style={{ color: entry.color }}>
              {entry.name}: ₹{Number(entry.value).toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getInitials = (name) =>
    (name || 'NA')
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="py-6 sm:py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-blue-600 mb-1">{today}</p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{greeting}!</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/job-card')}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] shrink-0"
        >
          <PlusSquare size={18} />
          New Job Card
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#4f46e5] p-6 sm:p-8 text-white shadow-xl shadow-blue-900/20">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Monthly Revenue"
          value={stats.monthlyRevenue}
          prefix="₹"
          diff={stats.monthlyDiff}
          icon={IndianRupee}
          gradient="from-orange-400 to-amber-500"
          iconBg="bg-orange-50 text-orange-500"
        />
        <StatCard
          title="Yearly Revenue"
          value={stats.yearlyRevenue}
          prefix="₹"
          diff={stats.yearlyDiff}
          icon={TrendingUp}
          gradient="from-emerald-400 to-teal-500"
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Total Job Cards"
          value={stats.totalJobs}
          diff={0}
          icon={Briefcase}
          gradient="from-blue-400 to-indigo-500"
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Jobs This Month"
          value={stats.monthJobs}
          diff={0}
          icon={CalendarDays}
          gradient="from-violet-400 to-purple-500"
          iconBg="bg-violet-50 text-violet-600"
        />
      </div>

      <WorkflowStepper jobCards={allJobCards} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-gray-900">Revenue Overview</h3>
              <p className="text-xs text-gray-400 mt-0.5">Monthly and cumulative yearly revenue</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Month</p>
                <p className="text-lg font-black text-teal-600">
                  <CountUp end={stats.monthlyRevenue} prefix="₹" />
                </p>
              </div>
              <div className="border-l pl-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">This Year</p>
                <p className="text-lg font-black text-orange-500">
                  <CountUp end={stats.yearlyRevenue} prefix="₹" />
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                  dx={-5}
                />
                <Tooltip content={customTooltip} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Monthly Revenue"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Yearly Revenue"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-lg font-black text-gray-900 mb-1">Quick Actions</h3>
          <p className="text-xs text-gray-400 mb-5">Frequently used modules</p>
          <div className="space-y-3">
            <QuickAction
              icon={Briefcase}
              label="Job Cards"
              desc="Create and manage print jobs"
              onClick={() => navigate('/job-card-list')}
              color="bg-blue-600"
            />
            <QuickAction
              icon={FileText}
              label="Invoices"
              desc="Billing and payments"
              onClick={() => navigate('/invoice/list')}
              color="bg-indigo-600"
            />
            <QuickAction
              icon={Truck}
              label="Challans"
              desc="Delivery notes"
              onClick={() => navigate('/challan/list')}
              color="bg-violet-600"
            />
            <QuickAction
              icon={Layers}
              label="Paper Stock"
              desc="Inventory tracking"
              onClick={() => navigate('/paper-stock')}
              color="bg-teal-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">Latest Job Cards</h3>
            <p className="text-xs text-gray-400 mt-0.5">Recently added print jobs</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/job-card-list')}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-gray-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-6 font-bold">Client</th>
                <th className="py-3 px-4 font-bold">Job Name</th>
                <th className="py-3 px-4 font-bold">Job No.</th>
                <th className="py-3 px-4 font-bold">Qty</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-6 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {loadingJobCards ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400 animate-pulse font-medium">
                    Loading job cards...
                  </td>
                </tr>
              ) : latestJobCards.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <p className="text-gray-400 italic mb-3">No job cards yet</p>
                    <button
                      type="button"
                      onClick={() => navigate('/job-card')}
                      className="text-blue-600 font-bold text-sm hover:underline"
                    >
                      Create your first job card
                    </button>
                  </td>
                </tr>
              ) : (
                latestJobCards.map((card, idx) => (
                  <tr
                    key={card._id || idx}
                    className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/job-card-list')}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                          {getInitials(card.partyName)}
                        </div>
                        <span className="font-bold text-gray-900">{card.partyName || '-'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700 font-medium">{card.jobName || '-'}</td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                        {card.jobNumber || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-800">
                      {Number(card.jobQty || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4 font-bold text-gray-900">
                      ₹{Number(card.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-gray-500 font-medium whitespace-nowrap">
                      {new Date(card.jobDate || card.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
