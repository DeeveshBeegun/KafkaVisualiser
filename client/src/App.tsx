import { useState, useEffect, useMemo } from "react";
import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Server,
  Database,
  Boxes,
  Activity,
  Settings,
  AlertTriangle,
  Search,
  Play,
  Pause,
  ChevronRight,
  Plus,
  Download,
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
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("topics");

  const filteredTopics = useMemo(() => {
    return topicRows.filter((t) =>
      t.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [q]);

  useEffect(() => {
    const fetchClusters = async () => {
      setLoading(true);
      try {
        const response = await fetch("http://localhost:8080/api/v1/cluster");
        if (!response.ok) {
          throw new Error("Failed to fetch clusters");
        }
        const data: Cluster = await response.json();

        console.log(data);
        // The backend returns a single Cluster object, not an array.
        // Wrap it in an array to keep the rest of the UI logic (map, list) unchanged.
        setClusters([data]);
        setActiveCluster(data.clusterId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchClusters();
  }, []);

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
                          <TableCell>{t.throughput.toLocaleString()}</TableCell>
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
                            <Button variant="ghost" size="sm">
                              Consume
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
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}

function NavBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={`justify-start gap-2 rounded-xl ${
        active ? "font-semibold" : ""
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" /> {label}
    </Button>
  );
}
