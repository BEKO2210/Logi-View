"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  Download,
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
  Upload,
  Warehouse,
  X,
  Trash2,
  Pencil,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type BookingKind = "Pflicht" | "Optional" | "Automatisch";
type Booking = { id: string; code: string; label: string; system: string; kind: BookingKind };
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
type BookingDraft = Omit<Booking, "id">;

const STORAGE_KEY = "logi-view-process-v1";
const starter: ProcessData[] = [
  { title: "Kundenauftrag", area: "Vertrieb", duration: 8, utilization: 42, queue: 3, tone: "normal", bookings: [
    { id: "b-1", code: "VA01", label: "Auftrag anlegen", system: "SAP", kind: "Pflicht" },
    { id: "b-2", code: "ATP", label: "Verfügbarkeit prüfen", system: "SAP", kind: "Automatisch" },
  ] },
  { title: "Materialprüfung", area: "Disposition", duration: 24, utilization: 71, queue: 12, tone: "warning", bookings: [
    { id: "b-3", code: "MD04", label: "Bedarf prüfen", system: "SAP", kind: "Pflicht" },
    { id: "b-4", code: "BANF", label: "Fehlteil anfordern", system: "SAP", kind: "Optional" },
    { id: "b-5", code: "RES", label: "Material reservieren", system: "SAP", kind: "Pflicht" },
  ] },
  { title: "Kommissionierung", area: "Logistik", duration: 38, utilization: 94, queue: 27, tone: "critical", bookings: [
    { id: "b-6", code: "WM01", label: "Transportauftrag", system: "WMS", kind: "Pflicht" },
    { id: "b-7", code: "PICK", label: "Entnahme bestätigen", system: "WMS", kind: "Pflicht" },
    { id: "b-8", code: "311", label: "Umbuchung", system: "SAP", kind: "Pflicht" },
    { id: "b-9", code: "SCAN", label: "Behälter scannen", system: "MDE", kind: "Pflicht" },
  ] },
  { title: "Vormontage", area: "Produktion", duration: 52, utilization: 86, queue: 18, tone: "warning", bookings: [
    { id: "b-10", code: "RÜCK", label: "Arbeitsgang rückmelden", system: "MES", kind: "Pflicht" },
    { id: "b-11", code: "261", label: "Komponentenverbrauch", system: "SAP", kind: "Automatisch" },
    { id: "b-12", code: "QG", label: "Qualitätsfreigabe", system: "QMS", kind: "Pflicht" },
  ] },
  { title: "Endmontage", area: "Produktion", duration: 44, utilization: 78, queue: 9, tone: "normal", bookings: [
    { id: "b-13", code: "CONF", label: "Fertigmeldung", system: "MES", kind: "Pflicht" },
    { id: "b-14", code: "101", label: "Wareneingang Produkt", system: "SAP", kind: "Automatisch" },
  ] },
  { title: "Versandfreigabe", area: "Outbound", duration: 16, utilization: 55, queue: 5, tone: "normal", bookings: [
    { id: "b-15", code: "VL02N", label: "Lieferung buchen", system: "SAP", kind: "Pflicht" },
    { id: "b-16", code: "GI", label: "Warenausgang", system: "SAP", kind: "Pflicht" },
  ] },
];

function makeNodes(data: ProcessData[] = starter): ProcessNode[] {
  return data.map((item, index) => ({
    id: `step-${index + 1}`,
    type: "process",
    position: { x: index * 285, y: index % 2 === 0 ? 130 : 280 },
    data: item,
  }));
}

function getEdges(nodes: ProcessNode[]): Edge[] {
  return nodes.slice(0, -1).map((node, index) => ({
    id: `edge-${node.id}-${nodes[index + 1].id}`,
    source: node.id,
    target: nodes[index + 1].id,
    type: "smoothstep",
    animated: node.data.utilization >= 85 || node.data.queue >= 15,
    style: { stroke: node.data.utilization >= 85 || node.data.queue >= 15 ? "#e11d48" : "#64748b", strokeWidth: node.data.utilization >= 85 || node.data.queue >= 15 ? 2.5 : 1.6 },
    markerEnd: { type: MarkerType.ArrowClosed, color: node.data.utilization >= 85 || node.data.queue >= 15 ? "#e11d48" : "#64748b" },
  }));
}

function isProcessData(value: unknown): value is ProcessData[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return false;
  return value.every((step) => step && typeof step.title === "string" && typeof step.area === "string" &&
    Number.isFinite(step.duration) && step.duration > 0 && step.duration <= 480 &&
    Number.isFinite(step.utilization) && step.utilization >= 0 && step.utilization <= 100 &&
    Number.isFinite(step.queue) && step.queue >= 0 && Array.isArray(step.bookings) &&
    step.bookings.every((booking: Booking) => booking && typeof booking.code === "string" && typeof booking.label === "string" && typeof booking.system === "string" && ["Pflicht", "Optional", "Automatisch"].includes(booking.kind)));
}

function ProcessCard({ data, selected }: NodeProps<ProcessNode>) {
  const tone = data.utilization >= 90 || data.queue >= 25
    ? "border-rose-400 before:bg-rose-500"
    : data.utilization >= 80 || data.queue >= 15
      ? "border-amber-300 before:bg-amber-500"
      : "border-slate-200 before:bg-emerald-500";
  return (
    <div className={cn("relative w-[220px] overflow-hidden rounded-xl border bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)] before:absolute before:inset-y-0 before:left-0 before:w-1", tone, selected && "ring-2 ring-blue-500 ring-offset-2")}>
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-slate-400" />
      <div className="p-4 pl-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[.07em] text-slate-500">{data.area}</p><h3 className="mt-1 text-base font-semibold text-slate-900">{data.title}</h3></div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">{data.bookings.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-sm">
          <div><span className="block text-slate-500">Zeit</span><b className="mt-0.5 block text-slate-700">{data.duration}m</b></div>
          <div><span className="block text-slate-500">Last</span><b className="mt-0.5 block text-slate-700">{data.utilization}%</b></div>
          <div><span className="block text-slate-500">Queue</span><b className={cn("mt-0.5 block", data.queue >= 25 ? "text-rose-600" : "text-slate-700")}>{data.queue}</b></div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-blue-600" />
    </div>
  );
}

const nodeTypes = { process: ProcessCard };
const navItems = [
  { icon: GitBranch, label: "Prozess", active: true },
  { icon: ChartNoAxesCombined, label: "Analyse" },
  { icon: Database, label: "Daten" },
  { icon: Warehouse, label: "Ressourcen" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}{children}</label>;
}

function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={cn("h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100", props.className)} />;
}

export function LogisticsStudio() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ProcessNode>(makeNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(getEdges(makeNodes()));
  const [selectedId, setSelectedId] = useState("step-3");
  const [processTitle, setProcessTitle] = useState("Auftrag bis Versand");
  const [scenario, setScenario] = useState<"baseline" | "optimized">("baseline");
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Lade lokale Daten …");
  const [dialog, setDialog] = useState<"step" | "booking" | null>(null);
  const [bookingEditId, setBookingEditId] = useState<string | null>(null);
  const [stepDraft, setStepDraft] = useState({ title: "", area: "", duration: 15, utilization: 50, queue: 0 });
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>({ code: "", label: "", system: "SAP", kind: "Pflicht" });
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const selectedData = selected?.data;
  const allBookings = nodes.flatMap((node) => node.data.bookings);
  const duplicateCodes = useMemo(() => {
    const seen = new Set<string>();
    const repeated = new Set<string>();
    allBookings.forEach((booking) => {
      const code = booking.code.trim().toLowerCase();
      if (seen.has(code)) repeated.add(code);
      seen.add(code);
    });
    return repeated;
  }, [nodes]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { title?: unknown; steps?: unknown };
        if (typeof parsed.title === "string" && isProcessData(parsed.steps)) {
          const priorPositions = (() => { try { return JSON.parse(saved).positions as Record<string, { x: number; y: number }>; } catch { return undefined; } })();
          const hydratedNodes = makeNodes(parsed.steps).map((node, i) => ({ ...node, position: priorPositions?.[node.id] ?? { x: i * 285, y: i % 2 === 0 ? 130 : 280 } }));
          setProcessTitle(parsed.title);
          setNodes(hydratedNodes);
          setEdges(getEdges(hydratedNodes));
          setSelectedId(hydratedNodes[0]?.id ?? "");
        }
      }
      setStorageStatus("Lokal gespeichert · nur auf diesem Gerät");
    } catch {
      setStorageStatus("Lokales Speichern nicht verfügbar");
    }
    setHydrated(true);
  }, [setEdges, setNodes]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          title: processTitle,
          steps: nodes.map((node) => node.data),
          positions: Object.fromEntries(nodes.map((node) => [node.id, node.position])),
        }));
        setStorageStatus("Lokal gespeichert · nur auf diesem Gerät");
      } catch {
        setStorageStatus("Speichern fehlgeschlagen · bitte JSON exportieren");
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [hydrated, nodes, processTitle]);

  useEffect(() => { setEdges(getEdges(nodes)); }, [nodes, setEdges]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const exportSteps = () => nodes.map(({ id, position, data }) => ({ id, position, ...data }));
    void Promise.resolve(context.registerTool({
      name: "read_logistics_process",
      title: "Read logistics process",
      description: "Return the current visible Logi-View process and its booking steps.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({ title: processTitle, steps: exportSteps() }),
    }, { signal: controller.signal })).catch(() => undefined);
    void Promise.resolve(context.registerTool({
      name: "analyze_logistics_process",
      title: "Analyze logistics process",
      description: "Calculate total lead time and flag process steps with utilization at least 85% or queue at least 15.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        totalLeadTimeMinutes: nodes.reduce((sum, node) => sum + node.data.duration, 0),
        bookingCount: allBookings.length,
        duplicateBookingCodes: [...duplicateCodes],
        bottlenecks: nodes.filter((node) => node.data.utilization >= 85 || node.data.queue >= 15).map((node) => ({ step: node.data.title, utilizationPercent: node.data.utilization, queue: node.data.queue })),
      }),
    }, { signal: controller.signal })).catch(() => undefined);
    return () => controller.abort();
  }, [allBookings.length, duplicateCodes, nodes, processTitle]);

  const totalMinutes = nodes.reduce((sum, node) => sum + node.data.duration, 0);
  const optionalCount = allBookings.filter((booking) => booking.kind === "Optional").length;
  const visibleNodes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de-DE");
    return nodes.map((node) => {
      const data = scenario === "optimized" ? { ...node.data, duration: Math.max(0, node.data.duration - node.data.bookings.filter((booking) => booking.kind === "Optional").length * 5), bookings: node.data.bookings.filter((booking) => booking.kind !== "Optional") } : node.data;
      return { ...node, data, hidden: Boolean(needle) && ![data.title, data.area, ...data.bookings.flatMap((booking) => [booking.code, booking.label, booking.system])].join(" ").toLocaleLowerCase("de-DE").includes(needle) };
    });
  }, [nodes, query, scenario]);
  const totalDisplayedMinutes = scenario === "optimized" ? Math.max(0, totalMinutes - optionalCount * 5) : totalMinutes;
  const displayedBookings = scenario === "optimized" ? allBookings.filter((booking) => booking.kind !== "Optional") : allBookings;
  const bottlenecks = nodes.filter((node) => node.data.utilization >= 85 || node.data.queue >= 15);
  const hotNodeIds = new Set(bottlenecks.map((node) => node.id));
  const savedPercent = totalMinutes ? Math.round((totalMinutes - totalDisplayedMinutes) / totalMinutes * 100) : 0;

  const updateSelected = (patch: Partial<ProcessData>) => {
    if (!selected) return;
    setNodes((current) => current.map((node) => node.id === selected.id ? { ...node, data: { ...node.data, ...patch } } : node));
  };

  const addStep = () => {
    const id = `step-${crypto.randomUUID()}`;
    const data: ProcessData = { ...stepDraft, title: stepDraft.title.trim() || "Neuer Prozessschritt", area: stepDraft.area.trim() || "Neuer Bereich", tone: "normal", bookings: [] };
    const last = nodes[nodes.length - 1];
    const next = [...nodes, { id, type: "process" as const, position: last ? { x: last.position.x + 285, y: last.position.y === 130 ? 280 : 130 } : { x: 0, y: 130 }, data }];
    setNodes(next);
    setSelectedId(id);
    setScenario("baseline");
    setDialog(null);
  };

  const openBooking = (booking?: Booking) => {
    setBookingEditId(booking?.id ?? null);
    setBookingDraft(booking ? { code: booking.code, label: booking.label, system: booking.system, kind: booking.kind } : { code: "", label: "", system: "SAP", kind: "Pflicht" });
    setDialog("booking");
  };

  const saveBooking = () => {
    if (!selected || !bookingDraft.code.trim() || !bookingDraft.label.trim() || !bookingDraft.system.trim()) return;
    const nextBooking: Booking = { ...bookingDraft, code: bookingDraft.code.trim().toUpperCase(), label: bookingDraft.label.trim(), system: bookingDraft.system.trim(), id: bookingEditId ?? `booking-${crypto.randomUUID()}` };
    const bookings = bookingEditId
      ? selected.data.bookings.map((booking) => booking.id === bookingEditId ? nextBooking : booking)
      : [...selected.data.bookings, nextBooking];
    updateSelected({ bookings });
    setDialog(null);
  };

  const deleteBooking = (id: string) => updateSelected({ bookings: selected.data.bookings.filter((booking) => booking.id !== id) });
  const removeStep = () => {
    if (!selected || nodes.length <= 1) return;
    const next = nodes.filter((node) => node.id !== selected.id);
    setNodes(next);
    setSelectedId(next[0]?.id ?? "");
  };

  const exportJson = () => {
    const file = new Blob([JSON.stringify({ format: "logi-view-process", version: 1, title: processTitle, steps: nodes.map((node) => node.data), positions: Object.fromEntries(nodes.map((node) => [node.id, node.position])) }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "logi-view-prozess.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file?: File) => {
    if (!file || file.size > 2_000_000) return;
    try {
      const parsed = JSON.parse(await file.text()) as { format?: unknown; title?: unknown; steps?: unknown };
      if (parsed.format !== "logi-view-process" || typeof parsed.title !== "string" || !isProcessData(parsed.steps)) throw new Error("Ungültiges Prozessformat.");
      const next = makeNodes(parsed.steps);
      setNodes(next);
      setEdges(getEdges(next));
      setProcessTitle(parsed.title.slice(0, 100));
      setSelectedId(next[0].id);
      setScenario("baseline");
      setStorageStatus("Importiert · lokal gespeichert");
    } catch {
      setStorageStatus("Import fehlgeschlagen · ungültige JSON-Datei");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setStepNumber = (key: "duration" | "utilization" | "queue", value: string) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    const limits = key === "duration" ? [1, 480] : key === "utilization" ? [0, 100] : [0, 10000];
    updateSelected({ [key]: Math.min(limits[1], Math.max(limits[0], Math.round(number))) });
  };

  return (
    <main className="app-shell min-h-screen bg-[#f3f6fa] text-slate-950">
      <aside className="side-rail">
        <div className="brand-mark" aria-label="Logi-View"><Boxes size={21} strokeWidth={2.2} /></div>
        <nav aria-label="Hauptnavigation" className="mt-7 flex flex-1 flex-col gap-2">
          {navItems.map(({ icon: Icon, label, active }) => <button key={label} className={cn("rail-button", active && "rail-button-active")} title={label} aria-label={label}><Icon size={20} /></button>)}
        </nav>
        <button className="rail-button" title="Hilfe" aria-label="Hilfe"><CircleHelp size={20} /></button>
        <button className="rail-button" title="Einstellungen" aria-label="Einstellungen"><Settings2 size={20} /></button>
      </aside>

      <section className="min-w-0">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-3">
            <div><div className="flex items-center gap-2"><input aria-label="Prozessname" value={processTitle} maxLength={100} onChange={(event) => setProcessTitle(event.target.value)} className="w-full max-w-[260px] border-0 bg-transparent p-0 text-lg font-semibold tracking-[-.02em] outline-none focus:ring-0" /><Badge variant="outline" className="hidden border-slate-200 bg-slate-50 text-slate-600 sm:inline-flex">{storageStatus.startsWith("Speichern fehlgeschlagen") ? "Nicht gespeichert" : "Entwurf"}</Badge></div><p className="hidden text-sm text-slate-600 sm:block">Logistikmodell · Änderungen werden automatisch lokal gespeichert</p></div>
            <button className="ml-1 rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Prozess auswählen"><ChevronDown size={17} /></button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden bg-white md:inline-flex" onClick={exportJson}><Download /> Export</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setScenario((value) => value === "baseline" ? "optimized" : "baseline")}><Play fill="currentColor" /> {scenario === "optimized" ? "Ist-Prozess" : "Simulation"}</Button>
            <span className="rounded-full bg-[#0c1f3d] px-3 py-2 text-xs font-semibold text-white" aria-label="Anonyme lokale Sitzung">LV</span>
          </div>
        </header>

        <div className="workspace">
          <section className="canvas-panel">
            <div className="canvas-toolbar">
              <div className="relative hidden md:block"><Search className="pointer-events-none absolute left-3 top-2.5 text-slate-500" size={16} /><input aria-label="Prozess durchsuchen" placeholder="Schritt oder Buchung suchen" value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-64 rounded-md border border-slate-300 bg-white pl-9 pr-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
              <Tabs value={scenario} onValueChange={(value) => setScenario(value as "baseline" | "optimized")}><TabsList className="h-10 rounded-md bg-slate-100"><TabsTrigger value="baseline" className="px-3 text-sm">Ist-Prozess</TabsTrigger><TabsTrigger value="optimized" className="px-3 text-sm"><Sparkles size={15} /> Potenzial</TabsTrigger></TabsList></Tabs>
              <div className="ml-auto flex items-center gap-2">
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Prozessdatei importieren" onChange={(event) => void importJson(event.target.files?.[0])} />
                <Button variant="outline" size="sm" className="hidden bg-white lg:inline-flex" onClick={() => fileRef.current?.click()}><Upload /> Import</Button>
                <Button variant="outline" size="sm" className="bg-white" onClick={() => { setStepDraft({ title: "", area: "", duration: 15, utilization: 50, queue: 0 }); setDialog("step"); }}><Plus /> Schritt</Button>
                <Button variant="ghost" size="icon-sm" aria-label="Prozess als JSON exportieren" onClick={exportJson}><MoreHorizontal /></Button>
              </div>
            </div>

            <div className="kpi-strip">
              <div className="kpi"><Clock3 /><span><small>Durchlaufzeit</small><strong>{Math.floor(totalDisplayedMinutes / 60)} h {String(totalDisplayedMinutes % 60).padStart(2, "0")} m</strong></span><em className={scenario === "optimized" && savedPercent ? "positive" : "neutral"}>{scenario === "optimized" ? `−${savedPercent}%*` : "Summe Schritte"}</em></div>
              <div className="kpi"><Layers3 /><span><small>Buchungen</small><strong>{scenario === "optimized" ? displayedBookings.length : allBookings.length}</strong></span><em>{scenario === "optimized" ? `−${allBookings.length - displayedBookings.length} optionale` : `${new Set(allBookings.map((booking) => booking.system)).size} Systeme`}</em></div>
              <div className="kpi"><Gauge /><span><small>Engpässe</small><strong>{bottlenecks.length}</strong></span><em className={bottlenecks.length ? "negative" : "positive"}>{bottlenecks.length ? "Prüfen" : "Keine erkannt"}</em></div>
              <div className="kpi hidden xl:flex"><ShieldCheck /><span><small>Schritte</small><strong>{nodes.length}</strong></span><em className="neutral">{duplicateCodes.size ? `${duplicateCodes.size} Doppelcodes` : "Keine Doppelcodes"}</em></div>
            </div>

            <div className="flow-stage">
              <ReactFlow nodes={visibleNodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_, node) => setSelectedId(node.id)} onConnect={(connection) => { if (!connection.source || !connection.target) return; setEdges((current) => [...current, { ...connection, id: `edge-${crypto.randomUUID()}`, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } } as Edge]); }} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.3} maxZoom={1.5} nodesDraggable proOptions={{ hideAttribution: false }} aria-label="Logistischer Prozessfluss">
                <Background color="#cbd5e1" gap={24} size={1} /><Controls position="bottom-left" showInteractive={false} />
              </ReactFlow>
              {bottlenecks.length > 0 && <button className="bottleneck-note" onClick={() => setSelectedId(bottlenecks[0].id)}><Activity size={17} /><span><b>{bottlenecks.length} Engpässe erkannt</b><small>{bottlenecks[0].data.title} · {bottlenecks[0].data.utilization}% Auslastung, {bottlenecks[0].data.queue} warten</small></span></button>}
              {query.trim() && visibleNodes.every((node) => node.hidden) && <div className="search-empty">Kein passender Schritt oder Buchungscode. <button onClick={() => setQuery("")}>Suche löschen</button></div>}
              {scenario === "optimized" && <div className="scenario-note"><Sparkles size={15} /><span>Potenzialschätzung: optionale Buchungen entfallen; pauschal 5 Minuten je optionaler Buchung. Keine Messdaten.</span></div>}
            </div>
          </section>

          <aside className="inspector">
            {!selectedData ? <div className="p-6 text-base text-slate-600">Wähle einen Prozessschritt aus.</div> : <>
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[.07em] text-blue-700">Ausgewählter Schritt</p><h2 className="mt-1 text-lg font-semibold tracking-[-.02em]">{selectedData.title}</h2><p className="mt-1 text-base text-slate-600">{selectedData.area}</p></div><Button variant="ghost" size="icon-sm" aria-label="Schritt löschen" onClick={removeStep} disabled={nodes.length <= 1}><Trash2 /></Button></div>
              </div>
              <div className="inspector-scroll">
                <section className="inspector-section">
                  <div className="mb-3 flex items-center justify-between"><h3>Kapazität</h3><span className={cn("text-base font-semibold", selectedData.utilization >= 85 ? "text-rose-700" : "text-slate-700")}>{selectedData.utilization}%</span></div>
                  <Progress value={selectedData.utilization} className={cn("h-2 bg-slate-100", selectedData.utilization >= 85 ? "[&_[data-slot=progress-indicator]]:bg-rose-500" : "[&_[data-slot=progress-indicator]]:bg-blue-500")} />
                  <div className="mt-3 grid grid-cols-2 gap-3"><Field label="Bearbeitung (Min.)"><TextInput type="number" min={1} max={480} value={scenario === "optimized" ? Math.max(0, selectedData.duration - selectedData.bookings.filter((booking) => booking.kind === "Optional").length * 5) : selectedData.duration} onChange={(event) => setStepNumber("duration", event.target.value)} /></Field><Field label="Auslastung (%)"><TextInput type="number" min={0} max={100} value={selectedData.utilization} onChange={(event) => setStepNumber("utilization", event.target.value)} /></Field><Field label="Warteschlange"><TextInput type="number" min={0} value={selectedData.queue} onChange={(event) => setStepNumber("queue", event.target.value)} /></Field></div>
                </section>
                <section className="inspector-section border-t border-slate-200">
                  <div className="mb-3 flex items-center justify-between"><h3>Buchungen</h3><Badge variant="secondary" className="bg-blue-50 text-blue-800">{scenario === "optimized" ? selectedData.bookings.filter((booking) => booking.kind !== "Optional").length : selectedData.bookings.length}</Badge></div>
                  <div className="space-y-2">{selectedData.bookings.filter((booking) => scenario !== "optimized" || booking.kind !== "Optional").map((booking) => <div key={booking.id} className="booking-row">
                    <span className="booking-code">{booking.code}</span><span className="min-w-0 flex-1 text-left"><b>{booking.label}</b><small>{booking.system}</small></span><span className={cn("booking-kind", booking.kind === "Pflicht" && "required", booking.kind === "Automatisch" && "auto")}>{booking.kind}</span>
                    <button className="icon-action" aria-label={`${booking.code} bearbeiten`} onClick={() => openBooking(booking)}><Pencil size={15} /></button><button className="icon-action" aria-label={`${booking.code} entfernen`} onClick={() => deleteBooking(booking.id)}><X size={15} /></button>
                  </div>)}</div>
                  <Button variant="outline" size="sm" className="mt-3 w-full border-dashed bg-white text-slate-700" onClick={() => openBooking()}><Plus /> Buchung hinzufügen</Button>
                </section>
                <section className="inspector-section border-t border-slate-200">
                  <h3 className="mb-3">Prozessprüfung</h3>
                  <div className={cn("rounded-lg border p-3 text-base", duplicateCodes.size ? "border-rose-200 bg-rose-50 text-rose-950" : "border-blue-200 bg-blue-50 text-blue-950")}>
                    <b className="block">{duplicateCodes.size ? "Gleiche Buchungscodes gefunden" : "Keine doppelten Buchungscodes"}</b>
                    <p className="mt-1 leading-6">{duplicateCodes.size ? [...duplicateCodes].join(", ") : `Prüfe Übergaben zwischen ${[...new Set(selectedData.bookings.map((booking) => booking.system))].join(", ") || "den angebundenen Systemen"}. Der Code erkennt gleiche Codes, keine fachliche Doppelarbeit.`}</p>
                  </div>
                  {hotNodeIds.has(selected.id) && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-base text-amber-950"><b className="block">Kapazität prüfen</b><p className="mt-1 leading-6">Mindestens ein Grenzwert ist erreicht: Auslastung ≥ 85 % oder Warteschlange ≥ 15 Aufträge.</p></div>}
                </section>
                <p className="px-5 pb-5 text-sm leading-5 text-slate-600">{storageStatus}. Daten werden nicht an einen Server übertragen. Für gemeinsame oder vertrauliche Firmendaten ist ein geschütztes Konto-Backend erforderlich.</p>
              </div>
            </>}
          </aside>
        </div>
      </section>

      {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="modal-card">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 id="dialog-title" className="text-lg font-semibold">{dialog === "step" ? "Prozessschritt hinzufügen" : bookingEditId ? "Buchung bearbeiten" : "Buchung hinzufügen"}</h2><button className="icon-action" aria-label="Dialog schließen" onClick={() => setDialog(null)}><X /></button></header>
          {dialog === "step" ? <form className="grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); addStep(); }}>
            <Field label="Schrittname"><TextInput autoFocus maxLength={80} value={stepDraft.title} onChange={(event) => setStepDraft((value) => ({ ...value, title: event.target.value }))} placeholder="z. B. Wareneingang" /></Field>
            <Field label="Bereich"><TextInput maxLength={60} value={stepDraft.area} onChange={(event) => setStepDraft((value) => ({ ...value, area: event.target.value }))} placeholder="z. B. Lager" /></Field>
            <div className="grid grid-cols-3 gap-3"><Field label="Minuten"><TextInput type="number" min={1} max={480} value={stepDraft.duration} onChange={(event) => setStepDraft((value) => ({ ...value, duration: Math.max(1, Math.min(480, Number(event.target.value))) }))} /></Field><Field label="Auslastung %"><TextInput type="number" min={0} max={100} value={stepDraft.utilization} onChange={(event) => setStepDraft((value) => ({ ...value, utilization: Math.max(0, Math.min(100, Number(event.target.value))) }))} /></Field><Field label="Wartende"><TextInput type="number" min={0} value={stepDraft.queue} onChange={(event) => setStepDraft((value) => ({ ...value, queue: Math.max(0, Number(event.target.value)) }))} /></Field></div>
            <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Abbrechen</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700">Schritt anlegen</Button></div>
          </form> : <form className="grid gap-4 p-5" onSubmit={(event) => { event.preventDefault(); saveBooking(); }}>
            <div className="grid grid-cols-[1fr_1fr] gap-3"><Field label="Buchungscode"><TextInput autoFocus maxLength={20} value={bookingDraft.code} onChange={(event) => setBookingDraft((value) => ({ ...value, code: event.target.value }))} placeholder="z. B. 261" /></Field><Field label="System"><TextInput maxLength={30} value={bookingDraft.system} onChange={(event) => setBookingDraft((value) => ({ ...value, system: event.target.value }))} placeholder="z. B. SAP" /></Field></div>
            <Field label="Buchung"><TextInput maxLength={100} value={bookingDraft.label} onChange={(event) => setBookingDraft((value) => ({ ...value, label: event.target.value }))} placeholder="z. B. Materialverbrauch buchen" /></Field>
            <Field label="Art"><select value={bookingDraft.kind} onChange={(event) => setBookingDraft((value) => ({ ...value, kind: event.target.value as BookingKind }))} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option>Pflicht</option><option>Optional</option><option>Automatisch</option></select></Field>
            <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Abbrechen</Button><Button type="submit" disabled={!bookingDraft.code.trim() || !bookingDraft.label.trim() || !bookingDraft.system.trim()} className="bg-blue-600 hover:bg-blue-700">Speichern</Button></div>
          </form>}
        </section>
      </div>}
    </main>
  );
}
