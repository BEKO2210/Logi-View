"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  FileDown,
  Gauge,
  GitBranch,
  Layers3,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Booking = {
  code: string;
  label: string;
  system: string;
  kind: "Pflicht" | "Optional" | "Automatisch";
};

type ProcessData = {
  title: string;
  area: string;
  duration: number;
  utilization: number;
  queue: number;
  bookings: Booking[];
  tone: "normal" | "warning" | "critical";
};

type ProcessNode = Node<ProcessData, "process">;

const processData: ProcessData[] = [
  {
    title: "Kundenauftrag",
    area: "Vertrieb",
    duration: 8,
    utilization: 42,
    queue: 3,
    tone: "normal",
    bookings: [
      { code: "VA01", label: "Auftrag anlegen", system: "SAP", kind: "Pflicht" },
      { code: "ATP", label: "Verfügbarkeit prüfen", system: "SAP", kind: "Automatisch" },
    ],
  },
  {
    title: "Materialprüfung",
    area: "Disposition",
    duration: 24,
    utilization: 71,
    queue: 12,
    tone: "warning",
    bookings: [
      { code: "MD04", label: "Bedarf prüfen", system: "SAP", kind: "Pflicht" },
      { code: "BANF", label: "Fehlteil anfordern", system: "SAP", kind: "Optional" },
      { code: "RES", label: "Material reservieren", system: "SAP", kind: "Pflicht" },
    ],
  },
  {
    title: "Kommissionierung",
    area: "Logistik",
    duration: 38,
    utilization: 94,
    queue: 27,
    tone: "critical",
    bookings: [
      { code: "WM01", label: "Transportauftrag", system: "WMS", kind: "Pflicht" },
      { code: "PICK", label: "Entnahme bestätigen", system: "WMS", kind: "Pflicht" },
      { code: "311", label: "Umbuchung", system: "SAP", kind: "Pflicht" },
      { code: "SCAN", label: "Behälter scannen", system: "MDE", kind: "Pflicht" },
    ],
  },
  {
    title: "Vormontage",
    area: "Produktion",
    duration: 52,
    utilization: 86,
    queue: 18,
    tone: "warning",
    bookings: [
      { code: "RÜCK", label: "Arbeitsgang rückmelden", system: "MES", kind: "Pflicht" },
      { code: "261", label: "Komponentenverbrauch", system: "SAP", kind: "Automatisch" },
      { code: "QG", label: "Qualitätsfreigabe", system: "QMS", kind: "Pflicht" },
    ],
  },
  {
    title: "Endmontage",
    area: "Produktion",
    duration: 44,
    utilization: 78,
    queue: 9,
    tone: "normal",
    bookings: [
      { code: "CONF", label: "Fertigmeldung", system: "MES", kind: "Pflicht" },
      { code: "101", label: "Wareneingang Produkt", system: "SAP", kind: "Automatisch" },
    ],
  },
  {
    title: "Versandfreigabe",
    area: "Outbound",
    duration: 16,
    utilization: 55,
    queue: 5,
    tone: "normal",
    bookings: [
      { code: "VL02N", label: "Lieferung buchen", system: "SAP", kind: "Pflicht" },
      { code: "GI", label: "Warenausgang", system: "SAP", kind: "Pflicht" },
    ],
  },
];

function ProcessCard({ data, selected }: NodeProps<ProcessNode>) {
  const tone = {
    normal: "border-slate-200 before:bg-emerald-500",
    warning: "border-amber-300 before:bg-amber-500",
    critical: "border-rose-400 before:bg-rose-500",
  }[data.tone];

  return (
    <div className={cn("relative w-[220px] overflow-hidden rounded-xl border bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)] before:absolute before:inset-y-0 before:left-0 before:w-1", tone, selected && "ring-2 ring-blue-500 ring-offset-2")}>
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" />
      <div className="p-4 pl-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-slate-400">{data.area}</p>
            <h3 className="mt-1 text-[15px] font-semibold text-slate-900">{data.title}</h3>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{data.bookings.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
          <div><span className="block text-slate-400">Zeit</span><b className="mt-0.5 block text-slate-700">{data.duration}m</b></div>
          <div><span className="block text-slate-400">Last</span><b className="mt-0.5 block text-slate-700">{data.utilization}%</b></div>
          <div><span className="block text-slate-400">Queue</span><b className={cn("mt-0.5 block", data.queue > 20 ? "text-rose-600" : "text-slate-700")}>{data.queue}</b></div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-blue-600" />
    </div>
  );
}

const nodeTypes = { process: ProcessCard };

function makeNodes(): ProcessNode[] {
  return processData.map((data, index) => ({
    id: `step-${index + 1}`,
    type: "process",
    position: { x: index * 285, y: index % 2 === 0 ? 130 : 280 },
    data,
  }));
}

const initialEdges: Edge[] = processData.slice(0, -1).map((_, index) => ({
  id: `edge-${index + 1}`,
  source: `step-${index + 1}`,
  target: `step-${index + 2}`,
  type: "smoothstep",
  animated: index === 1,
  style: { stroke: index === 1 ? "#e11d48" : "#64748b", strokeWidth: index === 1 ? 2.5 : 1.6 },
  markerEnd: { type: MarkerType.ArrowClosed, color: index === 1 ? "#e11d48" : "#64748b" },
}));

const navItems = [
  { icon: GitBranch, label: "Prozess", active: true },
  { icon: ChartNoAxesCombined, label: "Analyse" },
  { icon: Database, label: "Daten" },
  { icon: Warehouse, label: "Ressourcen" },
];

export function LogisticsStudio() {
  const [selectedId, setSelectedId] = useState("step-3");
  const [scenario, setScenario] = useState("baseline");
  const selected = processData[Number(selectedId.split("-")[1]) - 1] ?? processData[2];
  const nodes = useMemo(() => makeNodes(), []);
  const onNodeClick = useCallback((_: React.MouseEvent, node: ProcessNode) => setSelectedId(node.id), []);
  const optimized = scenario === "optimized";

  return (
    <main className="app-shell min-h-screen bg-[#f3f6fa] text-slate-950">
      <aside className="side-rail">
        <div className="brand-mark" aria-label="Logi-View"><Boxes size={21} strokeWidth={2.2} /></div>
        <nav aria-label="Hauptnavigation" className="mt-7 flex flex-1 flex-col gap-2">
          {navItems.map(({ icon: Icon, label, active }) => (
            <button key={label} className={cn("rail-button", active && "rail-button-active")} title={label} aria-label={label}><Icon size={20} /></button>
          ))}
        </nav>
        <button className="rail-button" title="Hilfe" aria-label="Hilfe"><CircleHelp size={20} /></button>
        <button className="rail-button" title="Einstellungen" aria-label="Einstellungen"><Settings2 size={20} /></button>
      </aside>

      <section className="min-w-0">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-[-.02em]">Auftrag bis Versand</h1>
                <Badge variant="outline" className="hidden border-slate-200 bg-slate-50 text-slate-500 sm:inline-flex">Entwurf</Badge>
              </div>
              <p className="hidden text-xs text-slate-500 sm:block">Werk Ludwigsburg · Modell 04</p>
            </div>
            <button className="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Prozess auswählen"><ChevronDown size={17} /></button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden bg-white md:inline-flex"><FileDown /> Export</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Play fill="currentColor" /> Simulation</Button>
            <button className="rounded-full bg-[#0c1f3d] px-3 py-2 text-xs font-semibold text-white" aria-label="Benutzerprofil">BA</button>
          </div>
        </header>

        <div className="workspace">
          <section className="canvas-panel">
            <div className="canvas-toolbar">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
                <input aria-label="Prozess durchsuchen" placeholder="Schritt oder Buchung suchen" className="h-9 w-64 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <Tabs value={scenario} onValueChange={setScenario}>
                <TabsList className="h-9 rounded-md bg-slate-100">
                  <TabsTrigger value="baseline" className="px-3 text-xs">Ist-Prozess</TabsTrigger>
                  <TabsTrigger value="optimized" className="px-3 text-xs"><Sparkles size={13} /> Optimiert</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="bg-white"><Plus /> Schritt</Button>
                <Button variant="ghost" size="icon-sm" aria-label="Weitere Optionen"><MoreHorizontal /></Button>
              </div>
            </div>

            <div className="kpi-strip">
              <div className="kpi"><Clock3 /><span><small>Durchlaufzeit</small><strong>{optimized ? "2 h 21 m" : "3 h 02 m"}</strong></span><em className={optimized ? "positive" : "negative"}>{optimized ? "−23%" : "+18%"}</em></div>
              <div className="kpi"><Layers3 /><span><small>Buchungen</small><strong>{optimized ? 13 : 16}</strong></span><em>{optimized ? "−3" : "5 Systeme"}</em></div>
              <div className="kpi"><Gauge /><span><small>Engpässe</small><strong>{optimized ? 1 : 2}</strong></span><em className={optimized ? "positive" : "negative"}>{optimized ? "Beobachten" : "Kritisch"}</em></div>
              <div className="kpi hidden xl:flex"><ShieldCheck /><span><small>Prozessqualität</small><strong>{optimized ? "91%" : "76%"}</strong></span><em className="positive">+8 Pkt.</em></div>
            </div>

            <div className="flow-stage">
              <ReactFlow nodes={nodes} edges={initialEdges} nodeTypes={nodeTypes} onNodeClick={onNodeClick} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.35} maxZoom={1.5} nodesDraggable proOptions={{ hideAttribution: false }} aria-label="Logistischer Prozessfluss">
                <Background color="#cbd5e1" gap={24} size={1} />
                <Controls position="bottom-left" showInteractive={false} />
              </ReactFlow>
              <div className="bottleneck-note">
                <Activity size={16} />
                <span><b>Engpass erkannt</b><small>Kommissionierung · 27 Aufträge warten</small></span>
                <ArrowUpRight size={15} />
              </div>
            </div>
          </section>

          <aside className="inspector">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-blue-600">Ausgewählter Schritt</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-[-.02em]">{selected.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{selected.area}</p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Schrittoptionen"><MoreHorizontal /></Button>
              </div>
            </div>

            <div className="inspector-scroll">
              <section className="inspector-section">
                <div className="mb-3 flex items-center justify-between"><h3>Kapazität</h3><span className={cn("text-sm font-semibold", selected.utilization > 90 ? "text-rose-600" : "text-amber-600")}>{selected.utilization}%</span></div>
                <Progress value={selected.utilization} className={cn("h-2 bg-slate-100", selected.utilization > 90 ? "[&_[data-slot=progress-indicator]]:bg-rose-500" : "[&_[data-slot=progress-indicator]]:bg-amber-500")} />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="metric-box"><small>Bearbeitung</small><strong>{selected.duration} Min.</strong></div>
                  <div className="metric-box"><small>Warteschlange</small><strong>{selected.queue} Aufträge</strong></div>
                </div>
              </section>

              <section className="inspector-section border-t border-slate-200">
                <div className="mb-3 flex items-center justify-between"><h3>Buchungen</h3><Badge variant="secondary" className="bg-blue-50 text-blue-700">{selected.bookings.length}</Badge></div>
                <div className="space-y-2">
                  {selected.bookings.map((booking) => (
                    <button key={booking.code} className="booking-row">
                      <span className="booking-code">{booking.code}</span>
                      <span className="min-w-0 flex-1 text-left"><b>{booking.label}</b><small>{booking.system}</small></span>
                      <span className={cn("booking-kind", booking.kind === "Pflicht" && "required", booking.kind === "Automatisch" && "auto")}>{booking.kind}</span>
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full border-dashed bg-white text-slate-600"><Plus /> Buchung hinzufügen</Button>
              </section>

              <section className="inspector-section border-t border-slate-200">
                <h3 className="mb-3">Analysehinweis</h3>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <b className="block">Doppelerfassung möglich</b>
                  <p className="mt-1 leading-5 text-amber-800">Transportauftrag und Umbuchung verwenden dieselben Materialdaten. Automatisierung prüfen.</p>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
