import { useState, useEffect, useMemo, useRef } from "react";
import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Server,
  Database,
  Boxes,
  Activity,
  AlertTriangle,
  Search,
  Play,
  Pause,
  ChevronRight,
  Plus,
  Download,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
} from "./components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "./components/ui/table";

interface Cluster {
  clusterId: string;
  brokers: number;
  controllerId: number;
}

interface RegisteredCluster extends Cluster {
  baseUrl: string;
}

interface StatProps {
  label: string;
  value: any;
  icon: LucideIcon;
  tone?: string;
}

const consumerLagSeries = Array.from({ length: 14 }).map((_, i) => ({
  ts: `T-${14 - i}m`,
  lag: Math.round(200 + Math.random() * 1200),
}));

const brokerMetrics = [
  { broker: "0", cpu: 22, net: 210, disk: 58 },
  { broker: "1", cpu: 33, net: 180, disk: 72 },
  { broker: "2", cpu: 18, net: 240, disk: 61 },
  { broker: "3", cpu: 22, net: 210, disk: 58 },
  { broker: "4", cpu: 33, net: 180, disk: 72 },
  { broker: "5", cpu: 18, net: 240, disk: 61 },
  { broker: "6", cpu: 22, net: 210, disk: 58 },
  { broker: "7", cpu: 33, net: 180, disk: 72 },
  { broker: "8", cpu: 18, net: 240, disk: 61 },
];

const topicRows = Array.from({ length: 12 }).map((_, i) => ({
  name: `orders.v${i % 3}`,
  partitions: 12 + (i % 5),
  replication: 3,
  retention: "7d",
  throughput: Math.round(500 + Math.random() * 1500), // msgs/s
  lag: Math.round(Math.random() * 1200),
}));

const Stat: FC<StatProps> = ({ label, value, icon: Icon, tone = "" }) => (
  <Card className="shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-xl bg-muted`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-semibold ${tone}`}>{value}</div>
      </div>
    </CardContent>
  </Card>
);

const SectionTitle = ({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
    <div className="flex items-center gap-2">{right}</div>
  </div>
);

export default function App() {
  const [q, setQ] = useState("");
  const [clusters, setClusters] = useState<RegisteredCluster[]>([]);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("topics");
  // Settings state
  const [settings, setSettings] = useState({
    theme: "system" as "system" | "light" | "dark",
    refreshInterval: 5,
    autoRefresh: true,
    window: "5m" as "1m" | "5m" | "15m",
    highContrast: false,
  });
  const [saved, setSaved] = useState(false);
  // Settings > Clusters form state
  const [newClusterUrl, setNewClusterUrl] = useState("");
  const [clusterOpsBusy, setClusterOpsBusy] = useState(false);
  const [clusterOpsError, setClusterOpsError] = useState<string | null>(null);

  // Topic Messages Viewer state (frontend-only mock for now)
  interface TopicMessage {
    ts: number; // epoch ms
    partition: number;
    offset: number;
    key: string | null;
    value: any;
    headers?: Record<string, string> | undefined;
  }
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTopic, setViewerTopic] = useState<string | null>(null);
  const [viewerMessages, setViewerMessages] = useState<TopicMessage[]>([]);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerLimit, setViewerLimit] = useState(50);
  const [viewerPaused, setViewerPaused] = useState(false);
  const [viewerFilter, setViewerFilter] = useState("");
  const viewerFilterRef = useRef<HTMLInputElement | null>(null);

  // Helper to highlight case-insensitive matches of needle within a string
  const highlightPartsCI = (text: string, needle: string) => {
    if (!needle) return [text];
    const parts: React.ReactNode[] = [];
    const lower = text.toLowerCase();
    const n = needle.toLowerCase();
    let start = 0;
    let idx = lower.indexOf(n, start);
    let k = 0;
    while (idx !== -1) {
      if (idx > start) parts.push(text.slice(start, idx));
      parts.push(
        <mark
          key={`h-${k++}-${idx}`}
          className="bg-yellow-300/60 dark:bg-yellow-500/40 rounded px-0.5"
        >
          {text.slice(idx, idx + needle.length)}
        </mark>
      );
      start = idx + needle.length;
      idx = lower.indexOf(n, start);
    }
    if (start < text.length) parts.push(text.slice(start));
    return parts;
  };

  // Mock generator: creates N messages for a topic
  function generateMockMessages(topic: string, count: number): TopicMessage[] {
    const now = Date.now();
    const arr: TopicMessage[] = [];
    const baseOffset = Math.floor(Math.random() * 10_000);
    for (let i = 0; i < count; i++) {
      const partition = Math.floor(Math.random() * 3);
      const offset = baseOffset + i;
      const payload = {
        id: `${topic}-${offset}`,
        type: ["created", "updated", "deleted"][i % 3],
        amount: Math.round(10 + Math.random() * 5000) / 100,
        currency: "USD",
        customerId: `cust_${1000 + (i % 200)}`,
      };
      arr.push({
        ts: now - i * 750,
        partition,
        offset,
        key: Math.random() > 0.2 ? `key-${partition}-${offset}` : null,
        value: payload,
        headers: {
          "content-type": "application/json",
          source: ["api", "batch", "cron"][i % 3],
        },
      });
    }
    // newest first
    return arr.sort((a, b) => b.offset - a.offset);
  }

  async function loadViewerMessages(topic: string) {
    setViewerLoading(true);
    setViewerError(null);
    try {
      // Frontend-only: use mock messages for now
      const msgs = generateMockMessages(topic, viewerLimit);
      setViewerMessages(msgs);
    } catch (e) {
      setViewerError(
        e instanceof Error ? e.message : "Failed to load messages"
      );
    } finally {
      setViewerLoading(false);
    }
  }

  const filteredTopics = useMemo(() => {
    return topicRows.filter((t) =>
      t.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [q]);

  useEffect(() => {
    // Load settings from localStorage once
    try {
      const raw = localStorage.getItem("kv_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}

    const loadRegistered = async () => {
      setLoading(true);
      try {
        const raw = localStorage.getItem("kv_clusters");
        const saved: { baseUrl: string }[] = raw ? JSON.parse(raw) : [];
        if (saved.length === 0) {
          // Fallback: attempt default localhost for convenience
          try {
            const r = await fetch("http://localhost:8080/api/v1/cluster");
            if (r.ok) {
              const info: Cluster = await r.json();
              setClusters([{ ...info, baseUrl: "http://localhost:8080" }]);
              setActiveCluster(info.clusterId);
            }
          } catch {}
          setLoading(false);
          return;
        }
        const list: RegisteredCluster[] = [];
        for (const { baseUrl } of saved) {
          try {
            const url = `${baseUrl.replace(/\/$/, "")}/api/v1/cluster`;
            const r = await fetch(url);
            if (!r.ok) throw new Error(`Failed ${url}`);
            const info: Cluster = await r.json();
            list.push({ ...info, baseUrl });
          } catch (e) {
            console.warn("Cluster fetch failed", baseUrl, e);
          }
        }
        setClusters(list);
        if (list.length && !activeCluster) setActiveCluster(list[0].clusterId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed loading clusters");
      } finally {
        setLoading(false);
      }
    };
    loadRegistered();
  }, []);

  // Apply dark + contrast classes based on settings
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      settings.theme === "dark" ||
      (settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    root.classList.toggle("contrast", settings.highContrast);
  }, [settings.theme, settings.highContrast]);

  // Auto-refresh viewer
  useEffect(() => {
    if (!viewerOpen || !viewerTopic || viewerPaused || !settings.autoRefresh)
      return;
    const id = setInterval(() => {
      loadViewerMessages(viewerTopic);
    }, Math.max(1, settings.refreshInterval) * 1000);
    return () => clearInterval(id);
  }, [
    viewerOpen,
    viewerTopic,
    viewerPaused,
    settings.autoRefresh,
    settings.refreshInterval,
    viewerLimit,
  ]);

  // Focus filter when viewer opens and handle Cmd/Ctrl+F to focus it
  useEffect(() => {
    if (!viewerOpen) return;
    const t = setTimeout(() => viewerFilterRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      const isF = e.key?.toLowerCase?.() === "f";
      if ((e.metaKey || e.ctrlKey) && isF) {
        e.preventDefault();
        viewerFilterRef.current?.focus();
        viewerFilterRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [viewerOpen]);

  // Derived: filtered and shown messages counts
  const { totalCount, matchedCount, shownMessages } = useMemo(() => {
    const total = viewerMessages.length;
    let filtered = viewerMessages;
    if (viewerFilter) {
      const needle = viewerFilter.toLowerCase();
      filtered = viewerMessages.filter((m) => {
        const inKey = (m.key ?? "").toLowerCase().includes(needle);
        const inVal = JSON.stringify(m.value).toLowerCase().includes(needle);
        const inHeaders = m.headers
          ? Object.entries(m.headers).some(
              ([hk, hv]) =>
                hk.toLowerCase().includes(needle) ||
                String(hv).toLowerCase().includes(needle)
            )
          : false;
        return inKey || inVal || inHeaders;
      });
    }
    const matched = filtered.length;
    return {
      totalCount: total,
      matchedCount: matched,
      shownMessages: filtered.slice(0, viewerLimit),
    };
  }, [viewerMessages, viewerFilter, viewerLimit]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground grid grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="border-r p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Boxes className="h-5 w-5" />
            <div className="font-semibold">Kafka Visualiser</div>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clusters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && (
                <div className="text-xs text-muted-foreground px-2">
                  Loading clusters...
                </div>
              )}
              {error && !loading && (
                <div className="text-xs text-destructive px-2">{error}</div>
              )}
              {clusters.map((c) => (
                <button
                  key={c.clusterId}
                  onClick={() => setActiveCluster(c.clusterId)}
                  className={`w-full text-left px-3 py-2 rounded-xl border hover:bg-accent hover:text-accent-foreground transition ${
                    activeCluster === c.clusterId
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  <div className="text-sm font-medium">{c.clusterId}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.brokers} brokers
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="mt-auto text-xs text-muted-foreground px-2">
            <div>
              Cluster: <span className="font-medium">{activeCluster}</span>
            </div>
            <div>
              Mode:{" "}
              <Badge variant="outline" className="ml-1">
                Read-only
              </Badge>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="p-4 md:p-6 space-y-6">
          <header className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <span className="font-semibold">Cluster Dashboard</span>
              <Badge variant="secondary">
                {clusters.find((c) => c.clusterId === activeCluster)
                  ?.clusterId ?? "-"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search topics, consumers…"
                className="w-64"
              />
              <Select
                value={settings.theme}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, theme: v as any }))
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={settings.highContrast ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    highContrast: !s.highContrast,
                  }))
                }
              >
                {settings.highContrast ? "HC On" : "HC Off"}
              </Button>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> New Topic
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Create Topic</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Input placeholder="Topic Name" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Partitions" type="number" />
                      <Input placeholder="Replication" type="number" />
                    </div>
                    <Button>Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Top stats */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Brokers" value="3" icon={Server} />
            <Stat label="Topics" value="128" icon={Database} />
            <Stat label="Avg Lag" value="423" icon={Activity} />
            <Stat
              label="Alerts"
              value={
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />2
                </span>
              }
              icon={AlertTriangle}
              tone="text-destructive"
            />
          </section>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="consumers">Consumers</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="pt-4 space-y-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Consumer Lag (last 15 min)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={consumerLagSeries}
                        margin={{ left: 16, right: 8, top: 8, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id="lag" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor="currentColor"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="currentColor"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ts" />
                        <YAxis />
                        <RTooltip />
                        <Area
                          type="monotone"
                          dataKey="lag"
                          stroke="currentColor"
                          fillOpacity={1}
                          fill="url(#lag)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Broker Utilization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brokerMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="broker" />
                        <YAxis />
                        <Legend />
                        <Bar dataKey="cpu" name="CPU %" />
                        <Bar dataKey="net" name="Net MB/s" />
                        <Bar dataKey="disk" name="Disk %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li>
                      • consumer-group <code>payment-cg</code> rebalanced
                    </li>
                    <li>
                      • topic <code>orders.v1</code> created (12 partitions)
                    </li>
                    <li>• broker 1 ISR changed (2 → 3)</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TOPICS */}
            <TabsContent value="topics" className="pt-4 space-y-4">
              {viewerOpen && viewerTopic ? (
                <>
                  <SectionTitle
                    right={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewerOpen(false);
                          setViewerTopic(null);
                          setViewerMessages([]);
                          setViewerError(null);
                          setViewerPaused(false);
                          setViewerFilter("");
                        }}
                      >
                        Back
                      </Button>
                    }
                  >
                    Messages: {viewerTopic}
                  </SectionTitle>

                  <Card>
                    <CardContent className="space-y-3">
                      {/* Produce Message Panel */}
                      <div
                        id="producer-panel"
                        className="border rounded-xl p-4 space-y-3 bg-muted/30"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="text-sm font-semibold tracking-wide">
                            Produce Message
                          </h4>
                          <div className="text-xs text-muted-foreground">
                            Topic: <code>{viewerTopic}</code>
                          </div>
                        </div>
                        <ProducePanel
                          topic={viewerTopic}
                          onProduced={(msg) => {
                            setViewerMessages((prev) => [msg, ...prev]);
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-between flex-wrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setViewerPaused((p) => !p)}
                            title={viewerPaused ? "Resume" : "Pause"}
                          >
                            {viewerPaused ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              viewerTopic && loadViewerMessages(viewerTopic)
                            }
                          >
                            Refresh
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Input
                              ref={viewerFilterRef}
                              placeholder="Search messages (⌘/Ctrl+F)"
                              className={`w-[260px] ${
                                viewerFilter ? "ring-1 ring-border" : ""
                              }`}
                              value={viewerFilter}
                              onChange={(e) => setViewerFilter(e.target.value)}
                            />
                            {viewerFilter && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Clear search"
                                onClick={() => setViewerFilter("")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <Select
                            value={String(viewerLimit)}
                            onValueChange={(v) => setViewerLimit(Number(v))}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                              <SelectItem value="200">200</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-muted-foreground">
                            {viewerFilter ? (
                              <span>
                                Showing {shownMessages.length} of {matchedCount}{" "}
                                matches • Total {totalCount}
                              </span>
                            ) : (
                              <span>
                                Showing {shownMessages.length} of {totalCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-40">Time</TableHead>
                              <TableHead className="w-24">Partition</TableHead>
                              <TableHead className="w-32">Offset</TableHead>
                              <TableHead className="w-40">Key</TableHead>
                              <TableHead className="w-40">Headers</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewerLoading ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-muted-foreground"
                                >
                                  Loading messages…
                                </TableCell>
                              </TableRow>
                            ) : viewerError ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-destructive"
                                >
                                  {viewerError}
                                </TableCell>
                              </TableRow>
                            ) : shownMessages.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-muted-foreground"
                                >
                                  {viewerFilter
                                    ? "No messages match your search. Try a different term."
                                    : "No messages to display."}
                                </TableCell>
                              </TableRow>
                            ) : (
                              shownMessages.map((m, i) => (
                                <TableRow
                                  key={`${m.partition}-${m.offset}-${i}`}
                                >
                                  <TableCell className="font-mono text-xs">
                                    {new Date(m.ts).toLocaleTimeString()}
                                  </TableCell>
                                  <TableCell>{m.partition}</TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {m.offset}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs break-all">
                                    {m.key ? (
                                      <>
                                        {highlightPartsCI(m.key, viewerFilter)}
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        null
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-[10px] whitespace-pre-wrap break-words max-w-[180px]">
                                    {m.headers &&
                                    Object.keys(m.headers).length ? (
                                      <details>
                                        <summary className="cursor-pointer select-none text-xs opacity-80 hover:opacity-100">
                                          {Object.keys(m.headers).length} hdrs
                                        </summary>
                                        <div className="mt-1 space-y-0.5">
                                          {Object.entries(m.headers).map(
                                            ([hk, hv]) => (
                                              <div
                                                key={hk}
                                                className="truncate"
                                              >
                                                <span className="text-muted-foreground">
                                                  {hk}:
                                                </span>{" "}
                                                {highlightPartsCI(
                                                  String(hv),
                                                  viewerFilter
                                                )}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </details>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        -
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <pre className="font-mono text-xs whitespace-pre-wrap break-words">
                                      {(() => {
                                        try {
                                          const s = JSON.stringify(
                                            m.value,
                                            null,
                                            2
                                          );
                                          return highlightPartsCI(
                                            s,
                                            viewerFilter
                                          );
                                        } catch {
                                          return highlightPartsCI(
                                            String(m.value ?? ""),
                                            viewerFilter
                                          );
                                        }
                                      })()}
                                    </pre>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <SectionTitle
                    right={
                      <>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button size="sm">
                          <ChevronRight className="h-4 w-4 mr-1" />
                          Inspect
                        </Button>
                      </>
                    }
                  >
                    Topics
                  </SectionTitle>

                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-28">Partitions</TableHead>
                            <TableHead className="w-28">Repl</TableHead>
                            <TableHead className="w-28">Retention</TableHead>
                            <TableHead className="w-40">
                              Throughput (msg/s)
                            </TableHead>
                            <TableHead className="w-32">Lag</TableHead>
                            <TableHead className="w-36 text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTopics.map((t, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                {t.name}
                              </TableCell>
                              <TableCell>{t.partitions}</TableCell>
                              <TableCell>{t.replication}</TableCell>
                              <TableCell>{t.retention}</TableCell>
                              <TableCell>
                                {t.throughput.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    t.lag > 800 ? "destructive" : "secondary"
                                  }
                                >
                                  {t.lag}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setViewerTopic(t.name);
                                    setViewerOpen(true);
                                    setViewerPaused(false);
                                    loadViewerMessages(t.name);
                                  }}
                                >
                                  Consume
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setViewerTopic(t.name);
                                    setViewerOpen(true);
                                    setViewerPaused(true);
                                    loadViewerMessages(t.name);
                                    setTimeout(() => {
                                      document
                                        .getElementById("producer-panel")
                                        ?.scrollIntoView({
                                          behavior: "smooth",
                                        });
                                    }, 50);
                                  }}
                                >
                                  Produce
                                </Button>
                                <Button variant="ghost" size="sm">
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* CONSUMERS */}
            <TabsContent value="consumers" className="pt-4 space-y-4">
              <SectionTitle
                right={
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Pause className="h-4 w-4" />
                    </Button>
                    <Select defaultValue="5m">
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">Last 1m</SelectItem>
                        <SelectItem value="5m">Last 5m</SelectItem>
                        <SelectItem value="15m">Last 15m</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                }
              >
                Consumer Groups
              </SectionTitle>

              <Card>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={consumerLagSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ts" />
                      <YAxis />
                      <RTooltip />
                      <Line
                        type="monotone"
                        dataKey="lag"
                        stroke="currentColor"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Groups</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Assigned Partitions</TableHead>
                        <TableHead>Lag</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {["billing-cg", "shipping-cg", "email-cg"].map((g, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{g}</TableCell>
                          <TableCell>{3 + i}</TableCell>
                          <TableCell>{12 + i * 2}</TableCell>
                          <TableCell>
                            <Badge
                              variant={i === 0 ? "destructive" : "secondary"}
                            >
                              {i === 0 ? 1240 : 210 - i * 20}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              Offsets
                            </Button>
                            <Button variant="ghost" size="sm">
                              Reset
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/*Settings*/}
            </TabsContent>
            {/* SETTINGS */}
            <TabsContent value="settings" className="pt-4 space-y-4">
              <SectionTitle
                right={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const defaults = {
                          theme: "system" as const,
                          refreshInterval: 5,
                          autoRefresh: true,
                          window: "5m" as const,
                          highContrast: false,
                        };
                        setSettings(defaults);
                        localStorage.setItem(
                          "kv_settings",
                          JSON.stringify(defaults)
                        );
                        setSaved(true);
                        setTimeout(() => setSaved(false), 1500);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        localStorage.setItem(
                          "kv_settings",
                          JSON.stringify(settings)
                        );
                        setSaved(true);
                        setTimeout(() => setSaved(false), 1500);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                }
              >
                Settings
              </SectionTitle>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Theme</div>
                      <Select
                        value={settings.theme}
                        onValueChange={(v) =>
                          setSettings((s) => ({ ...s, theme: v as any }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        Applies to UI components (requires app-level theme
                        handling).
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Refresh Interval (s)
                      </div>
                      <Input
                        type="number"
                        min={1}
                        value={settings.refreshInterval}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            refreshInterval: Number(e.target.value || 1),
                          }))
                        }
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">
                        Frequency for polling metrics and lists when
                        auto-refresh is on.
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Auto Refresh</div>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={settings.autoRefresh}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              autoRefresh: e.target.checked,
                            }))
                          }
                        />
                        <span>Enable periodic updates</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Data Window</div>
                      <Select
                        value={settings.window}
                        onValueChange={(v) =>
                          setSettings((s) => ({ ...s, window: v as any }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1m">Last 1m</SelectItem>
                          <SelectItem value="5m">Last 5m</SelectItem>
                          <SelectItem value="15m">Last 15m</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {saved && (
                    <div className="text-xs text-emerald-600">Saved ✓</div>
                  )}
                </CardContent>
              </Card>

              {/* Clusters management */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Clusters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">API Base URL</div>
                      <Input
                        placeholder="http://localhost:8080"
                        value={newClusterUrl}
                        onChange={(e) => setNewClusterUrl(e.target.value)}
                      />
                      <div className="text-xs text-muted-foreground">
                        We’ll validate by calling <code>/api/v1/cluster</code>.
                      </div>
                    </div>
                    <Button
                      disabled={clusterOpsBusy || !newClusterUrl}
                      onClick={async () => {
                        setClusterOpsError(null);
                        const base = newClusterUrl.trim().replace(/\/$/, "");
                        if (!/^https?:\/\//i.test(base)) {
                          setClusterOpsError("Enter a valid http(s) URL");
                          return;
                        }
                        setClusterOpsBusy(true);
                        try {
                          const res = await fetch(`${base}/api/v1/cluster`);
                          if (!res.ok)
                            throw new Error(`Failed to reach ${base}`);
                          const info: Cluster = await res.json();
                          // persist
                          const raw = localStorage.getItem("kv_clusters");
                          const saved: { baseUrl: string }[] = raw
                            ? JSON.parse(raw)
                            : [];
                          if (!saved.find((s) => s.baseUrl === base)) {
                            saved.push({ baseUrl: base });
                            localStorage.setItem(
                              "kv_clusters",
                              JSON.stringify(saved)
                            );
                          }
                          // update state (avoid duplicate)
                          setClusters((prev) =>
                            prev.find((c) => c.baseUrl === base)
                              ? prev
                              : [...prev, { ...info, baseUrl: base }]
                          );
                          if (!activeCluster) setActiveCluster(info.clusterId);
                          setNewClusterUrl("");
                        } catch (e) {
                          setClusterOpsError(
                            e instanceof Error
                              ? e.message
                              : "Could not add cluster"
                          );
                        } finally {
                          setClusterOpsBusy(false);
                        }
                      }}
                    >
                      {clusterOpsBusy ? "Adding…" : "Add"}
                    </Button>
                  </div>
                  {clusterOpsError && (
                    <div className="text-xs text-destructive">
                      {clusterOpsError}
                    </div>
                  )}

                  <div className="mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cluster ID</TableHead>
                          <TableHead>Base URL</TableHead>
                          <TableHead className="w-28">Brokers</TableHead>
                          <TableHead className="text-right w-40">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clusters.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-muted-foreground"
                            >
                              No clusters registered.
                            </TableCell>
                          </TableRow>
                        ) : (
                          clusters.map((c) => (
                            <TableRow key={c.baseUrl}>
                              <TableCell className="font-medium">
                                {c.clusterId}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {c.baseUrl}
                              </TableCell>
                              <TableCell>{c.brokers}</TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setActiveCluster(c.clusterId)}
                                >
                                  Use
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const base = c.baseUrl;
                                    // remove from storage
                                    const raw =
                                      localStorage.getItem("kv_clusters");
                                    const saved: { baseUrl: string }[] = raw
                                      ? JSON.parse(raw)
                                      : [];
                                    const next = saved.filter(
                                      (s) => s.baseUrl !== base
                                    );
                                    localStorage.setItem(
                                      "kv_clusters",
                                      JSON.stringify(next)
                                    );
                                    // update state
                                    setClusters((prev) =>
                                      prev.filter((x) => x.baseUrl !== base)
                                    );
                                    if (activeCluster === c.clusterId) {
                                      setActiveCluster(
                                        next.length ? null : null
                                      );
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      {/* Topic Messages Viewer moved inline within the Topics tab */}
    </TooltipProvider>
  );
}

// Lightweight produce panel component (client-side + backend call)
function ProducePanel({
  topic,
  onProduced,
}: {
  topic: string | null;
  onProduced: (msg: {
    ts: number;
    partition: number;
    offset: number;
    key: string | null;
    value: any;
    headers?: Record<string, string>;
  }) => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState('{\n  "example": true\n}');
  const [partition, setPartition] = useState<string>("");
  const [headersText, setHeadersText] = useState(
    '{\n  "content-type": "application/json"\n}'
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleProduce() {
    if (!topic) return;
    setErr(null);
    setSuccess(null);
    let parsed: any;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      setErr("Invalid JSON payload");
      return;
    }
    setBusy(true);
    try {
      const url = `/api/v1/topics/${encodeURIComponent(topic)}/produce${
        partition ? `?partition=${encodeURIComponent(partition)}` : ""
      }`;
      let headersObj: Record<string, string> | undefined = undefined;
      if (headersText.trim()) {
        try {
          const parsed = JSON.parse(headersText);
          if (parsed && typeof parsed === "object") {
            headersObj = Object.fromEntries(
              Object.entries(parsed).map(([k, v]) => [k, String(v)])
            );
          }
        } catch (e) {
          setErr("Invalid headers JSON");
          setBusy(false);
          return;
        }
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key || null,
          value: parsed,
          headers: headersObj,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || `HTTP ${res.status}`);
      }
      const meta = (await res.json()) as {
        topic: string;
        partition: number;
        offset: number;
        timestamp: number;
      };
      setSuccess(`Sent • partition ${meta.partition} offset ${meta.offset}`);
      onProduced({
        ts: Date.now(),
        partition: meta.partition,
        offset: meta.offset,
        key: key || null,
        value: parsed,
        headers: headersObj,
      });
    } catch (e: any) {
      setErr(e.message || "Failed to produce");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-5 gap-3">
        <div className="space-y-1 md:col-span-1">
          <div className="text-xs font-medium uppercase tracking-wide">
            Key (optional)
          </div>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="key"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <div className="text-xs font-medium uppercase tracking-wide">
            Partition (optional)
          </div>
          <Input
            value={partition}
            onChange={(e) => setPartition(e.target.value)}
            placeholder="auto"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <div className="text-xs font-medium uppercase tracking-wide flex items-center justify-between">
            <span>Headers (JSON)</span>
            <button
              type="button"
              onClick={() =>
                setHeadersText((h) => {
                  try {
                    return JSON.stringify(JSON.parse(h), null, 2);
                  } catch {
                    return h;
                  }
                })
              }
              className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/70"
            >
              Format
            </button>
          </div>
          <textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            rows={5}
            className="w-full font-mono text-xs rounded-md border bg-background p-2 resize-y"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide flex items-center justify-between">
            <span>Value (JSON)</span>
            <button
              type="button"
              onClick={() =>
                setValue((v) => {
                  try {
                    return JSON.stringify(JSON.parse(v), null, 2);
                  } catch {
                    return v;
                  }
                })
              }
              className="text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-muted/70"
            >
              Format
            </button>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={5}
            className="w-full font-mono text-xs rounded-md border bg-background p-2 resize-y"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handleProduce} disabled={busy || !topic}>
          {busy ? "Producing…" : "Produce"}
        </Button>
        {success && <span className="text-xs text-emerald-600">{success}</span>}
        {err && <span className="text-xs text-destructive">{err}</span>}
      </div>
    </div>
  );
}
