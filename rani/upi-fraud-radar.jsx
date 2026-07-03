import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ShieldAlert, ShieldCheck, ShieldX, Smartphone, RadioTower, KeyRound,
  Zap, Pause, Play, Search, ChevronDown, ChevronUp, Store, AlertTriangle,
  Activity, Ban,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#0A0E13",
  panel: "#11161D",
  panelAlt: "#161C24",
  line: "#232B36",
  text: "#E7EDF3",
  muted: "#7C8A9B",
  faint: "#4A5563",
  safe: "#2FD675",
  watch: "#F2B23C",
  high: "#FF7A45",
  critical: "#FF4757",
  brand: "#5B8CFF",
};

const RISK_META = {
  low:      { label: "LOW",      color: COLORS.safe,     glow: "rgba(47,214,117,0.18)" },
  medium:   { label: "WATCH",    color: COLORS.watch,    glow: "rgba(242,178,60,0.18)" },
  high:     { label: "HIGH",     color: COLORS.high,     glow: "rgba(255,122,69,0.18)" },
  critical: { label: "CRITICAL", color: COLORS.critical, glow: "rgba(255,71,87,0.20)" },
};

function riskLevel(score) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Synthetic NPCI-like data generation
// ---------------------------------------------------------------------------
const BANKS = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National Bank", "Bank of Baroda", "IndusInd Bank", "Paytm Payments Bank", "Yes Bank"];
const HANDLES = ["oksbi", "okhdfcbank", "okicici", "okaxis", "ybl", "paytm", "apl", "ibl"];
const CITIES = ["Bhopal", "Indore", "Mumbai", "Pune", "Bengaluru", "Delhi", "Lucknow", "Jaipur", "Ahmedabad", "Nagpur", "Patna", "Chennai"];
const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Ishaan", "Rohan", "Kabir", "Ananya", "Priya", "Sneha", "Neha", "Riya", "Kavya", "Arjun", "Karthik", "Meera", "Pooja", "Rahul", "Sanjay", "Divya", "Nikhil"];
const LAST_NAMES = ["Sharma", "Verma", "Gupta", "Reddy", "Iyer", "Nair", "Singh", "Rao", "Patel", "Mehta", "Joshi", "Kulkarni", "Chauhan", "Das", "Yadav"];

const VERIFIED_MERCHANTS = [
  { name: "Big Bazaar Retail", cat: "Grocery" },
  { name: "IRCTC e-Ticketing", cat: "Travel" },
  { name: "Zomato Foods", cat: "Food" },
  { name: "Reliance Digital", cat: "Electronics" },
  { name: "Apollo Pharmacy", cat: "Pharmacy" },
  { name: "BSES Electricity", cat: "Utilities" },
  { name: "Croma Retail", cat: "Electronics" },
  { name: "Domino's India", cat: "Food" },
];
const FAKE_MERCHANTS = [
  { name: "QuickCash Traders", cat: "Misc" },
  { name: "InstaRefund Services", cat: "Misc" },
  { name: "Shree Ganesh Enterprises", cat: "Misc" },
  { name: "Lucky Mobile Recharge Hub", cat: "Recharge" },
  { name: "Rapid Fund Transfer Co", cat: "Misc" },
  { name: "New Bharat Collections", cat: "Misc" },
];

let seq = 10000;
const rand = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const chance = (p) => Math.random() < p;

function makeVpa(name) {
  const clean = name.toLowerCase().replace(/\s+/g, "");
  return `${clean}${randInt(1, 99)}@${pick(HANDLES)}`;
}

function makeUser(id) {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  return {
    id,
    name,
    vpa: makeVpa(name),
    bank: pick(BANKS),
    city: pick(CITIES),
    deviceId: `DEV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    recentTimestamps: [],
    simSwapUntil: 0,
  };
}

// A rolling pool of "known" synthetic users so device/frequency history is coherent
const userPool = Array.from({ length: 26 }, (_, i) => makeUser(i + 1));

function generateTransaction(tick) {
  const now = Date.now();
  const fraudRoll = chance(0.30); // ~30% of stream carries at least one risk signal
  const user = chance(0.85) ? pick(userPool) : makeUser(1000 + tick);

  const isFakeMerchant = fraudRoll && chance(0.4);
  const merchant = isFakeMerchant ? pick(FAKE_MERCHANTS) : pick(VERIFIED_MERCHANTS);
  const merchantVerified = VERIFIED_MERCHANTS.includes(merchant);

  // Device change: small baseline chance, higher if this txn is a fraud-flagged one
  const deviceChanged = fraudRoll && chance(0.45);
  const usedDeviceId = deviceChanged ? `DEV-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : user.deviceId;

  // SIM swap: user recently reported a SIM swap (simulated 24h window)
  let simSwapActive = now < user.simSwapUntil;
  if (fraudRoll && chance(0.22) && !simSwapActive) {
    user.simSwapUntil = now + randInt(2, 8) * 60 * 1000; // stays "active" for a few sim-minutes
    simSwapActive = true;
  }

  // OTP attempts
  const otpFailed = fraudRoll ? randInt(1, 6) : chance(0.9) ? 0 : randInt(1, 2);

  // Frequency: track recent tx timestamps per user, count within a 90s rolling window
  user.recentTimestamps.push(now);
  user.recentTimestamps = user.recentTimestamps.filter((t) => now - t < 90 * 1000);
  if (fraudRoll && chance(0.35)) {
    // inject burst
    for (let i = 0; i < randInt(3, 6); i++) user.recentTimestamps.push(now - i * 1000);
  }
  const freqCount = user.recentTimestamps.length;

  const amount = fraudRoll && chance(0.5)
    ? Math.round(rand(8000, 95000))
    : Math.round(rand(50, 6000));

  const type = chance(0.6) ? "P2P" : "P2M";
  const receiverVpa = type === "P2M" ? `${merchant.name.toLowerCase().replace(/\s+/g, "")}@${pick(HANDLES)}` : makeVpa(pick(FIRST_NAMES) + " " + pick(LAST_NAMES));

  // --- Risk engine -----------------------------------------------------
  const flags = [];
  let score = 0;

  if (type === "P2M" && !merchantVerified) {
    flags.push({ key: "fake_merchant", label: "Unverified / fake merchant", weight: 30 });
    score += 30;
  }
  if (simSwapActive) {
    flags.push({ key: "sim_swap", label: "Recent SIM swap on account", weight: 35 });
    score += 35;
  }
  if (otpFailed >= 3) {
    flags.push({ key: "otp_fail", label: `${otpFailed} failed OTP attempts`, weight: 15 + (otpFailed - 3) * 5 });
    score += 15 + (otpFailed - 3) * 5;
  }
  if (deviceChanged) {
    flags.push({ key: "device_change", label: "New / unrecognized device", weight: 18 });
    score += 18;
  }
  if (freqCount >= 4) {
    flags.push({ key: "high_freq", label: `${freqCount} transfers in last 90s`, weight: 14 + Math.min(freqCount - 4, 6) * 3 });
    score += 14 + Math.min(freqCount - 4, 6) * 3;
  }
  if (amount > 20000 && (deviceChanged || simSwapActive)) {
    flags.push({ key: "high_value_new_device", label: "High-value transfer on new context", weight: 12 });
    score += 12;
  }

  score = Math.max(0, Math.min(100, Math.round(score + rand(-3, 3))));
  const level = riskLevel(score);
  const status = level === "critical" ? (chance(0.75) ? "Blocked" : "Declined")
    : level === "high" ? (chance(0.5) ? "Under review" : "Approved")
    : "Approved";

  seq += 1;
  return {
    id: `TXN${seq}`,
    tick,
    time: now,
    user,
    senderVpa: user.vpa,
    receiverVpa,
    bank: user.bank,
    merchant: merchant.name,
    merchantVerified,
    type,
    amount,
    city: user.city,
    deviceId: usedDeviceId,
    deviceChanged,
    simSwapActive,
    otpFailed,
    freqCount,
    score,
    level,
    status,
    flags,
  };
}

// ---------------------------------------------------------------------------
// Small presentational bits
// ---------------------------------------------------------------------------
function RiskBadge({ level }) {
  const m = RISK_META[level];
  return (
    <span
      style={{
        color: m.color,
        background: m.glow,
        border: `1px solid ${m.color}55`,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
      className="text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded"
    >
      {m.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div
      className="rounded-lg p-4 flex-1 min-w-[150px]"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} color={accent || COLORS.muted} />
        <span className="text-[11px] uppercase tracking-wider" style={{ color: COLORS.muted, fontFamily: "'IBM Plex Mono', monospace" }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-semibold" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
      {sub && <div className="text-[11px] mt-1" style={{ color: COLORS.faint }}>{sub}</div>}
    </div>
  );
}

// Signature element: sweeping radial risk gauge
function RiskGauge({ score }) {
  const level = riskLevel(score);
  const meta = RISK_META[level];
  const r = 70;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const dash = circ * pct;
  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative" style={{ width: 176, height: 176 }}>
        <svg width="176" height="176" viewBox="0 0 176 176">
          <circle cx="88" cy="88" r={r} fill="none" stroke={COLORS.line} strokeWidth="10" />
          <circle
            cx="88" cy="88" r={r} fill="none"
            stroke={meta.color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            transform="rotate(-90 88 88)"
            style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.6s ease" }}
          />
          <circle cx="88" cy="88" r={r - 18} fill="none" stroke={COLORS.line} strokeWidth="1" strokeDasharray="2 6" opacity="0.5">
            <animateTransform attributeName="transform" type="rotate" from="0 88 88" to="360 88 88" dur="6s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ color: meta.color, fontFamily: "'Space Grotesk', sans-serif" }} className="text-4xl font-bold">
            {score}
          </span>
          <span style={{ color: COLORS.muted, fontFamily: "'IBM Plex Mono', monospace" }} className="text-[10px] tracking-widest mt-0.5">
            NETWORK RISK
          </span>
        </div>
      </div>
      <div className="mt-2"><RiskBadge level={level} /></div>
    </div>
  );
}

function inr(n) {
  return "₹" + n.toLocaleString("en-IN");
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function UpiFraudRadar() {
  const [txns, setTxns] = useState(() => {
    const initial = [];
    for (let i = 0; i < 18; i++) initial.push(generateTransaction(i));
    return initial;
  });
  const [running, setRunning] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const tickRef = useRef(18);
  const [trend, setTrend] = useState(() => {
    const arr = [];
    for (let i = 0; i < 20; i++) arr.push({ t: i, avgRisk: randInt(15, 35), fraud: randInt(0, 2) });
    return arr;
  });

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      const t = generateTransaction(tickRef.current++);
      setTxns((prev) => [t, ...prev].slice(0, 160));
      setTrend((prev) => {
        const windowTxns = [t];
        const next = [...prev, {
          t: tickRef.current,
          avgRisk: t.score,
          fraud: t.level === "high" || t.level === "critical" ? 1 : 0,
        }];
        return next.slice(-24);
      });
    }, 1100);
    return () => clearInterval(iv);
  }, [running]);

  const stats = useMemo(() => {
    const total = txns.length;
    const flagged = txns.filter((t) => t.level === "high" || t.level === "critical").length;
    const blocked = txns.filter((t) => t.status === "Blocked" || t.status === "Declined").length;
    const avgRisk = total ? Math.round(txns.reduce((s, t) => s + t.score, 0) / total) : 0;
    return { total, flagged, blocked, avgRisk };
  }, [txns]);

  const patternData = useMemo(() => {
    const counts = {};
    txns.forEach((t) => t.flags.forEach((f) => { counts[f.label.split(" in last")[0]] = (counts[f.key] || 0) + 1; }));
    const byKey = {};
    txns.forEach((t) => t.flags.forEach((f) => { byKey[f.key] = (byKey[f.key] || 0) + 1; }));
    const NAMES = {
      fake_merchant: "Fake merchant",
      sim_swap: "SIM swap",
      otp_fail: "Failed OTPs",
      device_change: "Device change",
      high_freq: "High frequency",
      high_value_new_device: "High-value/new device",
    };
    return Object.entries(byKey).map(([k, v]) => ({ name: NAMES[k] || k, value: v, key: k }));
  }, [txns]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (filter !== "all" && t.level !== filter) return false;
      if (query && !(t.senderVpa.includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase()) || t.merchant.toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [txns, filter, query]);

  const flagColor = (key) => ({
    fake_merchant: COLORS.high,
    sim_swap: COLORS.critical,
    otp_fail: COLORS.watch,
    device_change: COLORS.brand,
    high_freq: COLORS.high,
    high_value_new_device: COLORS.critical,
  }[key] || COLORS.muted);

  return (
    <div
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif", minHeight: "100%" }}
      className="w-full p-4 md:p-6"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 4px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .rowfade { animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px);} to { opacity: 1; transform: translateY(0);} }
        .pulse-dot { animation: pulse 1.6s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: 1;} 50% { opacity: 0.35;} }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <RadioTower size={20} color={COLORS.brand} />
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl md:text-2xl font-semibold">
              UPI Fraud Radar
            </h1>
            <span className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded text-[10px] mono tracking-wider" style={{ background: running ? "rgba(47,214,117,0.12)" : "rgba(124,138,155,0.12)", color: running ? COLORS.safe : COLORS.muted, border: `1px solid ${running ? COLORS.safe + "44" : COLORS.line}` }}>
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: running ? COLORS.safe : COLORS.muted }} />
              {running ? "LIVE" : "PAUSED"}
            </span>
          </div>
          <p className="text-[13px] mt-1" style={{ color: COLORS.muted }}>Synthetic NPCI-style stream · rule-based risk scoring · not real transaction data</p>
        </div>
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium self-start md:self-auto"
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? "Pause stream" : "Resume stream"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="flex flex-wrap gap-3 mb-5">
        <StatCard icon={Activity} label="Transactions" value={stats.total} sub="rolling window · last 160" accent={COLORS.brand} />
        <StatCard icon={ShieldAlert} label="Flagged high/critical" value={stats.flagged} sub={`${stats.total ? Math.round((stats.flagged/stats.total)*100) : 0}% of stream`} accent={COLORS.high} />
        <StatCard icon={Ban} label="Blocked / declined" value={stats.blocked} sub="auto-actioned by engine" accent={COLORS.critical} />
        <StatCard icon={ShieldCheck} label="Avg risk score" value={stats.avgRisk} sub="0 (clean) – 100 (critical)" accent={COLORS.safe} />
      </div>

      {/* Middle row: gauge + trend + patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="rounded-lg p-4" style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}>
          <div className="text-[11px] uppercase tracking-wider mb-1 mono" style={{ color: COLORS.muted }}>Live risk gauge</div>
          <RiskGauge score={txns[0]?.score ?? 0} />
        </div>

        <div className="lg:col-span-1 rounded-lg p-4" style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}>
          <div className="text-[11px] uppercase tracking-wider mb-2 mono" style={{ color: COLORS.muted }}>Risk trend (rolling)</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.brand} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} tick={{ fill: COLORS.faint, fontSize: 10 }} width={26} />
              <Tooltip
                contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12 }}
                labelFormatter={() => ""}
                formatter={(v, n) => [v, n === "avgRisk" ? "Risk score" : "Flagged"]}
              />
              <Area type="monotone" dataKey="avgRisk" stroke={COLORS.brand} strokeWidth={2} fill="url(#riskFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg p-4" style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}>
          <div className="text-[11px] uppercase tracking-wider mb-2 mono" style={{ color: COLORS.muted }}>Fraud pattern mix</div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={patternData} layout="vertical" margin={{ left: 0, right: 12 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={110} tick={{ fill: COLORS.muted, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.line}`, borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {patternData.map((d, i) => <Cell key={i} fill={flagColor(d.key)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {["all", "critical", "high", "medium", "low"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium mono"
            style={{
              background: filter === f ? (f === "all" ? COLORS.brand + "22" : RISK_META[f]?.glow) : COLORS.panel,
              color: filter === f ? (f === "all" ? COLORS.brand : RISK_META[f]?.color) : COLORS.muted,
              border: `1px solid ${filter === f ? (f === "all" ? COLORS.brand + "55" : RISK_META[f]?.color + "55") : COLORS.line}`,
            }}
          >
            {f === "all" ? "All" : RISK_META[f].label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto px-3 py-1.5 rounded-md" style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}>
          <Search size={13} color={COLORS.muted} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search VPA, merchant, txn id"
            className="bg-transparent outline-none text-[12px] mono w-48"
            style={{ color: COLORS.text }}
          />
        </div>
      </div>

      {/* Live feed table */}
      <div className="rounded-lg overflow-hidden" style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }}>
        <div className="grid grid-cols-[100px_1fr_1fr_90px_70px_90px_70px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider mono" style={{ color: COLORS.faint, borderBottom: `1px solid ${COLORS.line}` }}>
          <span>Txn ID</span>
          <span>Sender</span>
          <span>Receiver / Merchant</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Risk</span>
          <span></span>
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: COLORS.muted }}>No transactions match this filter.</div>
          )}
          {filtered.slice(0, 60).map((t) => {
            const meta = RISK_META[t.level];
            const isOpen = expanded === t.id;
            return (
              <div key={t.id} className="rowfade" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                <div
                  className="grid grid-cols-[100px_1fr_1fr_90px_70px_90px_70px] gap-2 px-4 py-2.5 items-center cursor-pointer text-[12px]"
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  style={{ background: isOpen ? COLORS.panelAlt : "transparent" }}
                >
                  <span className="mono" style={{ color: COLORS.muted }}>{t.id}</span>
                  <span className="truncate mono" title={t.senderVpa}>{t.senderVpa}</span>
                  <span className="truncate flex items-center gap-1">
                    {t.type === "P2M" && <Store size={11} color={t.merchantVerified ? COLORS.muted : COLORS.high} />}
                    <span className="truncate" title={t.type === "P2M" ? t.merchant : t.receiverVpa}>{t.type === "P2M" ? t.merchant : t.receiverVpa}</span>
                  </span>
                  <span className="mono">{inr(t.amount)}</span>
                  <span style={{ color: t.status === "Approved" ? COLORS.safe : t.status === "Under review" ? COLORS.watch : COLORS.critical }} className="text-[11px]">{t.status}</span>
                  <div><RiskBadge level={t.level} /></div>
                  <div className="flex justify-end" style={{ color: COLORS.muted }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-3 pt-1 text-[12px]" style={{ background: COLORS.panelAlt }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <Detail label="Bank" value={t.bank} />
                      <Detail label="City" value={t.city} />
                      <Detail label="Device ID" value={t.deviceId} icon={Smartphone} />
                      <Detail label="Failed OTPs" value={t.otpFailed} icon={KeyRound} />
                    </div>
                    {t.flags.length > 0 ? (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider mb-1.5 mono" style={{ color: COLORS.faint }}>Triggered signals</div>
                        <div className="flex flex-wrap gap-1.5">
                          {t.flags.map((f) => (
                            <span key={f.key} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] mono" style={{ color: flagColor(f.key), background: flagColor(f.key) + "18", border: `1px solid ${flagColor(f.key)}44` }}>
                              <AlertTriangle size={11} /> {f.label} <span style={{ opacity: 0.7 }}>+{f.weight}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: COLORS.safe }}>
                        <ShieldCheck size={12} /> No fraud signals detected on this transaction.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-[11px]" style={{ color: COLORS.faint }}>
        All merchants, VPAs, devices and transactions are synthetically generated for demonstration. Risk scoring is a transparent rule engine (fake-merchant, SIM-swap, OTP-failure, device-change and velocity signals) — swap in a trained model or NPCI/bank feeds for production use.
      </div>
    </div>
  );
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mono flex items-center gap-1" style={{ color: COLORS.faint }}>
        {Icon && <Icon size={10} />} {label}
      </div>
      <div className="mono text-[12px]" style={{ color: COLORS.text }}>{value}</div>
    </div>
  );
}
