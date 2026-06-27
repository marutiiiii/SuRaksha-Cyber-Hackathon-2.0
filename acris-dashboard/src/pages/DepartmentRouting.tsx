import { AnyObject } from "@/types";
import { useEffect, useState, useMemo, Fragment } from "react";
import PageHeader from "@/components/shared/PageHeader";
import EnhancedKpiCard from "@/components/shared/EnhancedKpiCard";
import { BeginnerHint, SkeletonPage } from "@/components/shared/States";
import { api } from "@/lib/api";
import { ChevronDown, ChevronUp, Users, Clock, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MAP {
  id: string;
  title: string;
  description: string;
  owner: string;
  department: string;
  dueDate: string;
  severity: string;
  status: string;
  regulationId: string;
  impact: string;
}

const DEPARTMENTS = [
  { name: "Compliance", color: "#3B82F6", hoverColor: "rgba(59,130,246,0.08)", activeBg: "bg-blue-500/10 border-blue-500/25" },
  { name: "Legal", color: "#8B5CF6", hoverColor: "rgba(139,92,246,0.08)", activeBg: "bg-purple-500/10 border-purple-500/25" },
  { name: "IT", color: "#F59E0B", hoverColor: "rgba(245,158,11,0.08)", activeBg: "bg-amber-500/10 border-amber-500/25" },
  { name: "Cybersecurity", color: "#EF4444", hoverColor: "rgba(239,68,68,0.08)", activeBg: "bg-red-500/10 border-red-500/25" },
  { name: "Operations", color: "#06B6D4", hoverColor: "rgba(6,182,212,0.08)", activeBg: "bg-cyan-500/10 border-cyan-500/25" },
  { name: "Audit", color: "#10B981", hoverColor: "rgba(16,185,129,0.08)", activeBg: "bg-emerald-500/10 border-emerald-500/25" },
  { name: "Risk Management", color: "#EC4899", hoverColor: "rgba(236,72,153,0.08)", activeBg: "bg-pink-500/10 border-pink-500/25" }
];

function RiskBadge({ risk }: { risk: string }) {
  let badgeClass = "badge-medium";
  if (risk === "High" || risk === "Critical") badgeClass = "badge-high";
  if (risk === "Low") badgeClass = "badge-low";
  return (
    <span className={`badge ${badgeClass} text-[9px] font-bold`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {risk}
    </span>
  );
}

export default function DepartmentRouting() {
  const [maps, setMaps] = useState<MAP[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    api.listMaps()
      .then((res) => {
        const mapped = (res || []).map((m: AnyObject) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          owner: m.owner || "Compliance Team",
          department: m.owner ? m.owner.replace(" Team", "") : "Compliance",
          dueDate: m.deadline || new Date().toISOString().slice(0, 10),
          severity: m.severity,
          status: m.status,
          regulationId: m.clause_ref || "Circular",
          impact: m.description
        }));
        setMaps(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load department maps:", err);
        toast({ title: "Load error", description: "Failed to load tasks from backend.", variant: "destructive" });
        setLoading(false);
      });
  }, []);

  const deptMetrics = useMemo(() => {
    const today = new Date();
    return DEPARTMENTS.map((dept) => {
      const deptMaps = maps.filter((m) => m.department.toLowerCase() === dept.name.toLowerCase());
      const total = deptMaps.length;
      const completed = deptMaps.filter((m) => m.status === "Completed").length;
      const score = total > 0 ? Math.round((completed / total) * 100) : 100;
      const overdue = deptMaps.filter((m) => m.status !== "Completed" && new Date(m.dueDate) < today).length;
      const open = total - completed;
      return {
        ...dept,
        total,
        completed,
        open,
        overdue,
        score
      };
    });
  }, [maps]);

  const activeDeptMetrics = useMemo(() => {
    if (selectedDept === "All") {
      const total = maps.length;
      const completed = maps.filter((m) => m.status === "Completed").length;
      const score = total > 0 ? Math.round((completed / total) * 100) : 100;
      const open = total - completed;
      const today = new Date();
      const overdue = maps.filter((m) => m.status !== "Completed" && new Date(m.dueDate) < today).length;
      return {
        name: "All Departments",
        score,
        total,
        completed,
        open,
        overdue,
        color: "#3B82F6",
        activeBg: "bg-primary/10 border-primary/25"
      };
    }
    const found = deptMetrics.find((d) => d.name === selectedDept);
    return found ? {
      name: found.name,
      score: found.score,
      total: found.total,
      completed: found.completed,
      open: found.open,
      overdue: found.overdue,
      color: found.color,
      activeBg: found.activeBg
    } : {
      name: selectedDept,
      total: 0,
      completed: 0,
      open: 0,
      overdue: 0,
      score: 100,
      color: "#3B82F6",
      activeBg: "bg-primary/10 border-primary/25"
    };
  }, [deptMetrics, selectedDept, maps]);

  const filteredTasks = useMemo(() => {
    if (selectedDept === "All") return maps;
    return maps.filter((m) => m.department.toLowerCase() === selectedDept.toLowerCase());
  }, [maps, selectedDept]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDept]);

  const rowsPerPage = 10;
  const totalPages = Math.ceil(filteredTasks.length / rowsPerPage);
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredTasks.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredTasks, currentPage]);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Department Routing Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage and trace compliance tasks dynamically routed to operational segments</p>
        </div>
      </div>

      {/* Grid of Department Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        {/* All Departments Card */}
        <div
          onClick={() => {
            setSelectedDept("All");
            setExpandedTaskId(null);
          }}
          className={`glass-card p-3 flex flex-col justify-between cursor-pointer border transition-all duration-200 ${
            selectedDept === "All" ? "border-primary bg-primary/5 shadow-sm shadow-primary/5" : ""
          }`}
          style={{ borderTop: "4px solid #3B82F6" }}
        >
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate">All Departments</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-foreground">
                {maps.length > 0 ? Math.round((maps.filter(m => m.status === "Completed").length / maps.length) * 100) : 100}%
              </span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase">Ready</span>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-[10px] font-semibold text-muted-foreground pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span>Tasks</span>
              <span className="text-foreground font-bold">{maps.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Open</span>
              <span className="text-foreground font-bold">{maps.filter(m => m.status !== "Completed").length}</span>
            </div>
          </div>
        </div>

        {deptMetrics.map((dept) => {
          const isSelected = selectedDept === dept.name;
          return (
            <div
              key={dept.name}
              onClick={() => {
                setSelectedDept(dept.name);
                setExpandedTaskId(null);
              }}
              className={`glass-card p-3 flex flex-col justify-between cursor-pointer border transition-all duration-200 ${
                isSelected ? "border-primary bg-primary/5 shadow-sm shadow-primary/5" : ""
              }`}
              style={{ borderTop: `4px solid ${dept.color}` }}
            >
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate">{dept.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-extrabold text-foreground">{dept.score}%</span>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase">Ready</span>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-[10px] font-semibold text-muted-foreground pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span>Tasks</span>
                  <span className="text-foreground font-bold">{dept.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Open</span>
                  <span className="text-foreground font-bold">{dept.open}</span>
                </div>
                {dept.overdue > 0 && (
                  <div className="flex items-center justify-between text-rose-500 font-extrabold">
                    <span>Overdue</span>
                    <span>{dept.overdue}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Department KPI Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <EnhancedKpiCard
          label={`${selectedDept} Readiness`}
          value={`${activeDeptMetrics.score}%`}
          progress={{ current: activeDeptMetrics.completed, target: activeDeptMetrics.total, label: "Closed Tasks" }}
        />
        <EnhancedKpiCard
          label="Total Mapped Tasks"
          value={activeDeptMetrics.total}
          tone="info"
          subMetrics={[{ label: "Open Items", value: `${activeDeptMetrics.open} pending` }]}
        />
        <EnhancedKpiCard
          label="Overdue / Critical"
          value={activeDeptMetrics.overdue}
          tone={activeDeptMetrics.overdue > 0 ? "danger" : "success"}
          subMetrics={[{ label: "Action Status", value: activeDeptMetrics.overdue > 0 ? "Immediate Action Required" : "All Tasks Safe" }]}
        />
        <div className="glass-card p-4 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Assigned Group</div>
              <div className="text-xs font-bold leading-tight">{selectedDept} Team</div>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Primary owner for all matched regulations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border bg-muted/10">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            <span>{selectedDept} Routing Details ({filteredTasks.length} Mapped Actions)</span>
          </h3>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-semibold">
            No compliance tasks are currently routed to the {selectedDept} department.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>Department</th>
                    <th>Circular Task</th>
                    <th style={{ width: "110px" }}>Priority</th>
                    <th style={{ width: "160px" }}>Status</th>
                    <th>Action Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task) => {
                    const isExpanded = expandedTaskId === task.id;
                    const isOverdue = task.status !== "Completed" && new Date(task.dueDate) < new Date();
                    const deptColor = DEPARTMENTS.find(d => d.name.toLowerCase() === task.department.toLowerCase())?.color || "#64748B";
                    const statusColor = 
                      task.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : task.status === "Awaiting Validation" ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      : task.status === "In Progress" ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-muted text-muted-foreground border-border";

                    return (
                      <Fragment key={task.id}>
                        <tr 
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        >
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: deptColor }} />
                              <span className="font-bold text-xs text-foreground truncate">{task.department}</span>
                            </div>
                          </td>
                          <td>
                            <div className="space-y-0.5">
                              <div className="font-semibold text-xs text-foreground">{task.title}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{task.regulationId}</div>
                            </div>
                          </td>
                          <td>
                            <RiskBadge risk={task.severity} />
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] border px-2 py-0.5 rounded font-extrabold uppercase tracking-wider ${statusColor}`}>
                                {task.status}
                              </span>
                              {isOverdue && (
                                <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded font-extrabold tracking-wide">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="text-xs text-muted-foreground truncate max-w-xs font-semibold" title={task.description}>
                              {task.description}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${task.id}-expanded`} className="bg-muted/10 border-t border-border/60">
                            <td colSpan={5} className="p-4 text-xs font-semibold text-muted-foreground">
                              <div className="space-y-3">
                                <div>
                                  <div className="font-bold text-[9px] uppercase tracking-wider text-foreground mb-1">Obligation Summary & Target Impact</div>
                                  <p className="leading-relaxed text-foreground text-xs">{task.description}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border/40">
                                  <div>
                                    <span className="font-mono text-[9px] uppercase text-muted-foreground mr-1">Owner:</span>
                                    <span className="font-bold text-foreground">{task.owner}</span>
                                  </div>
                                  <div>
                                    <span className="font-mono text-[9px] uppercase text-muted-foreground mr-1">Due Date:</span>
                                    <span className="font-bold text-foreground">{task.dueDate}</span>
                                  </div>
                                  <div>
                                    <span className="font-mono text-[9px] uppercase text-muted-foreground mr-1">Action Task ID:</span>
                                    <span className="font-mono text-[9px] font-bold text-primary">{task.id}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
                <span>
                  Showing <span className="text-foreground">{Math.min(filteredTasks.length, (currentPage - 1) * rowsPerPage + 1)}</span> to{" "}
                  <span className="text-foreground">{Math.min(filteredTasks.length, currentPage * rowsPerPage)}</span> of{" "}
                  <span className="text-foreground">{filteredTasks.length}</span> entries
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <span className="text-muted-foreground">
                    Page <span className="text-foreground font-bold">{currentPage}</span> of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
