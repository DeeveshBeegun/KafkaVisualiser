import { useState } from "react";
import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Boxes, Server, Database, Activity, AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";

const clusters = [
  { id: "dev-1", name: "DEV CLUSTER", brokers: 3 },
  { id: "uat-1", name: "UAT CLUSTER", brokers: 5 },
  { id: "prod-1", name: "PROD CLUSTER", brokers: 10 },
];

interface StatProps {
  label: string;
  value: any;
  icon: LucideIcon;
  tone?: string;
}

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
export default function App() {
  const [q, setQ] = useState("");
  const [activeCluster, setActiveCluster] = useState(clusters[0].id);

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
              {clusters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCluster(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border hover:bg-accent hover:text-accent-foreground transition ${
                    activeCluster === c.id
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  <div className="text-sm font-medium">{c.name}</div>
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
                {clusters.find((c) => c.id === activeCluster)?.name}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search topics, consumers…"
                className="w-64"
              />
              {/* <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Topic
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader>
                    <DialogTitle>Create Topic</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Input placeholder="Topic name" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Partitions" type="number" />
                      <Input placeholder="Replication" type="number" />
                    </div>
                    <Button>Create</Button>
                  </div>
                </DialogContent>
              </Dialog> */}
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
        </main>
      </div>
    </TooltipProvider>
  );
}
