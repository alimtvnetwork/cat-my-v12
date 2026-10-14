import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  FolderKanban,
  Maximize2,
  PlayCircle,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sliders,
  Tags,
  Zap,
} from "lucide-react";
import pcbImage from "@/assets/samples/pcb-assembly.jpg";

interface InspectionEvent {
  id: string;
  timestamp: string;
  unitId: string;
  result: "PASS" | "FAIL";
  inspector: string;
  confidence: number;
}

const RECENT_EVENTS: InspectionEvent[] = [
  { id: "1", timestamp: "15:34:06.393", unitId: "PCB-A4801", result: "PASS", inspector: "AI-Vision-01", confidence: 99.8 },
  { id: "2", timestamp: "15:34:03.493", unitId: "PCB-A4802", result: "PASS", inspector: "AI-Vision-01", confidence: 99.9 },
  { id: "3", timestamp: "15:34:00.120", unitId: "PCB-A4803", result: "FAIL", inspector: "AI-Vision-01", confidence: 94.2 },
  { id: "4", timestamp: "15:33:57.810", unitId: "PCB-A4804", result: "PASS", inspector: "AI-Vision-01", confidence: 99.7 },
  { id: "5", timestamp: "15:33:54.640", unitId: "PCB-A4805", result: "PASS", inspector: "AI-Vision-01", confidence: 100 },
  { id: "6", timestamp: "15:33:51.290", unitId: "PCB-A4806", result: "PASS", inspector: "AI-Vision-01", confidence: 99.6 },
  { id: "7", timestamp: "15:33:48.010", unitId: "PCB-A4807", result: "PASS", inspector: "AI-Vision-01", confidence: 99.8 },
  { id: "8", timestamp: "15:33:44.920", unitId: "PCB-A4808", result: "PASS", inspector: "AI-Vision-01", confidence: 99.5 },
];

export function MissionControlDashboard() {
  const [activeTab, setActiveTab] = useState<"inspection" | "models" | "analytics" | "settings">("inspection");
  const [cycleTime, setCycleTime] = useState(12.4);
  const [currentTime, setCurrentTime] = useState("15:34:02 GMT");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(" ")[0] + " GMT");
      setCycleTime(Number((12.1 + Math.random() * 0.6).toFixed(1)));
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto bg-[#080c14] text-[#e2e8f0] font-sans">
      {/* Top Telemetry Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#182338] bg-[#090e18]/95 pl-36 pr-5 backdrop-blur-2xl">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
            </span>
            <span className="font-mono text-sm font-black tracking-wider text-white">
              CONTROL AUTOMATION
            </span>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM OK
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              AI MODEL: ON
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-blue-400">
              NETWORK: STABLE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden w-64 lg:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              readOnly
              placeholder="Search inspection parameters..."
              className="w-full rounded-full border border-[#1e2d48] bg-[#0c1424] py-1.5 pl-9 pr-4 font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            SEED: ACTIVE
          </span>
        </div>
      </header>

      {/* Main Mission Control Grid */}
      <main className="flex-1 p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Left Column: Quick Action Cards (3 Cols) */}
          <div className="space-y-3 xl:col-span-3">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
                QUICK ACTION CARDS
              </span>
              <span className="font-mono text-[10px] text-slate-500">4 MODULES</span>
            </div>

            <QuickModuleCard
              title="Setup"
              desc="Status: Configure System"
              to="/setup"
              icon={Settings}
              tone="cyan"
            />
            <QuickModuleCard
              title="Projects"
              desc="Active: 14 Inspection Lines"
              to="/projects"
              icon={FolderKanban}
              tone="cyan"
            />
            <QuickModuleCard
              title="Trial Run"
              desc="Test Run #04 Armed"
              to="/run"
              icon={PlayCircle}
              tone="cyan"
            />
            <QuickModuleCard
              title="AI Testing"
              desc="Evaluate Model & Yield"
              to="/ai-testing"
              icon={Sparkles}
              tone="cyan"
            />
          </div>

          {/* Center Column: Live Camera Inspection Feed (6 Cols) */}
          <div className="space-y-3 xl:col-span-6">
            <div className="flex items-center justify-between border-b border-[#182338] pb-2">
              <div className="flex items-center gap-4">
                {(["inspection", "models", "analytics", "settings"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-cyan-400 text-cyan-400 pb-1 -mb-[9px]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                  <Radio size={11} className="text-cyan-400" />
                  Live Feed
                </span>
                <span className="rounded-full border border-[#1e2d48] bg-[#0c1424] px-2.5 py-0.5 font-mono text-[10px] text-slate-400">
                  {currentTime}
                </span>
              </div>
            </div>

            {/* Central High-Tech Camera Reticle Viewport */}
            <div className="group relative overflow-hidden rounded-2xl border-2 border-[#1c2c47] bg-[#04070e] shadow-[0_12px_40px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              {/* Camera Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={pcbImage}
                  alt="Live Camera Inspection"
                  className="h-full w-full object-cover filter contrast-125 brightness-90"
                />

                {/* CAD Reticle Grid Overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(34, 211, 238, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 211, 238, 0.3) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />

                {/* Bounding Box on Main Component (PASS 99.8%) */}
                <div className="absolute left-[34%] top-[24%] h-[48%] w-[32%] rounded-md border-2 border-emerald-400 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.5)]">
                  <div className="absolute -top-7 left-0 flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 font-mono text-[10px] font-black tracking-wider text-black shadow-lg">
                    <span>PASS 99.8%</span>
                    <span className="opacity-75">CONF: 100%</span>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 text-center">
                    <span className="inline-block rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-emerald-300 backdrop-blur-md">
                      IC-SOP8 // LEAD PIN VALIDATED
                    </span>
                  </div>
                </div>

                {/* Secondary Inspection Points */}
                <div className="absolute left-[20%] top-[40%] h-[20%] w-[12%] rounded border border-cyan-400/80 bg-cyan-400/10">
                  <span className="absolute -top-4 left-0 font-mono text-[8px] font-bold text-cyan-300">
                    C45: OK
                  </span>
                </div>

                {/* Optical Corner Brackets */}
                <div className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2 border-cyan-400" />
                <div className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2 border-cyan-400" />
                <div className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-cyan-400" />
                <div className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-cyan-400" />

                {/* Top Left Feed Metadata */}
                <div className="absolute left-4 top-4 rounded-lg border border-[#1e2d48]/80 bg-[#070c16]/85 p-2 font-mono text-[10px] backdrop-blur-md">
                  <div className="text-slate-400">RAW FDN PCB // CAM-01</div>
                  <div className="font-bold text-emerald-400">INSPECTION: PCB 14AR</div>
                  <div className="text-cyan-300">TOTAL INSPECTED: 45,809</div>
                </div>

                {/* Bottom Bar: Processing Animation */}
                <div className="absolute bottom-3 right-4 flex items-center gap-2 rounded-full border border-cyan-500/40 bg-[#090e18]/90 px-3 py-1 font-mono text-[10px] text-cyan-300 backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-block h-2 w-2 rounded-full bg-cyan-400" />
                  </span>
                  <span>PROCESSING // 60 FPS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Telemetry Widgets (3 Cols) */}
          <div className="space-y-4 xl:col-span-3">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
                TELEMETRY WIDGETS
              </span>
              <span className="font-mono text-[10px] text-slate-500">REALTIME</span>
            </div>

            {/* Cycle Time Gauge Card */}
            <div className="rounded-2xl border border-[#1b2a44] bg-[#0c1424]/90 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  Cycle Time (Gauge)
                </span>
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-400/40 bg-cyan-400/10">
                    <Cpu size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]">
                      {cycleTime}ms
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">Min 10ms · Max 18ms</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pass Rate Semi-Gauge */}
            <div className="rounded-2xl border border-[#1b2a44] bg-[#0c1424]/90 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pass Rate
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">LIVE METRIC</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-400/10">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                      99.98%
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      Total Inspected: 45,809
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Defect Types Breakdown */}
            <div className="rounded-2xl border border-[#1b2a44] bg-[#0c1424]/90 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                Defect Types Breakdown
              </span>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-[#1e2d48] bg-[#080d18] p-2.5">
                  <div className="font-mono text-xl font-black text-cyan-300">6</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Solder</div>
                </div>
                <div className="rounded-xl border border-[#1e2d48] bg-[#080d18] p-2.5">
                  <div className="font-mono text-xl font-black text-cyan-300">3</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Component</div>
                </div>
                <div className="rounded-xl border border-[#1e2d48] bg-[#080d18] p-2.5">
                  <div className="font-mono text-xl font-black text-emerald-400">2</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">SMT</div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-[#182338] pt-2 font-mono text-[10px]">
                <span className="text-slate-400">Model F1-Score</span>
                <span className="font-bold text-emerald-400">0.998</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Inspection Timeline */}
        <div className="mt-5 rounded-2xl border border-[#1b2a44] bg-[#090f1c]/90 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182338] pb-3">
            <div className="flex items-center gap-3">
              <Activity size={16} className="text-cyan-400" />
              <span className="font-mono text-xs font-black uppercase tracking-wider text-white">
                RECENT INSPECTION TIMELINE
              </span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300">
                PASS/FAIL EVENTS (LAST 100 UNITS)
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-slate-400">{currentTime}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e2d48] bg-[#0c1424] px-3 py-1 text-slate-300 hover:border-cyan-400/50 hover:text-white transition-colors"
              >
                <Download size={12} />
                Export Data
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#182338] text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Unit ID</th>
                  <th className="py-2">Result</th>
                  <th className="py-2">Inspector</th>
                  <th className="py-2">Confidence</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151f33]">
                {RECENT_EVENTS.map((event) => (
                  <tr key={event.id} className="hover:bg-[#0e1628]/80 transition-colors">
                    <td className="py-2.5 text-slate-400">{event.timestamp}</td>
                    <td className="py-2.5 font-bold text-white">{event.unitId}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          event.result === "PASS"
                            ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                            : "border border-rose-500/50 bg-rose-500/15 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                        }`}
                      >
                        {event.result}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">{event.inspector}</td>
                    <td className="py-2.5 text-cyan-300">{event.confidence}%</td>
                    <td className="py-2.5 text-right">
                      <Link
                        to="/run"
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function QuickModuleCard({
  title,
  desc,
  to,
  icon: Icon,
  tone,
}: {
  title: string;
  desc: string;
  to: string;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <Link
      to={to as any}
      className="group relative block overflow-hidden rounded-2xl border-2 border-[#1c2c47] bg-[#0c1424]/90 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-200 hover:border-cyan-400 hover:shadow-[0_0_24px_rgba(34,211,238,0.35),inset_0_1px_0_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.25)] transition-transform duration-200 group-hover:scale-110">
            <Icon size={24} />
          </div>
          <div>
            <h3 className="font-display text-base font-black uppercase tracking-wider text-white group-hover:text-cyan-300 transition-colors">
              {title}
            </h3>
            <p className="font-mono text-[11px] text-slate-400">{desc}</p>
          </div>
        </div>

        <span className="flex h-3 w-3 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] transition-transform duration-200 group-hover:scale-125" />
        </span>
      </div>
    </Link>
  );
}
