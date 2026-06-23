import { useMemo, useState, useEffect } from "react";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import PageHeader from "@/components/shared/PageHeader";
import EnhancedKpiCard from "@/components/shared/EnhancedKpiCard";
import StatusPipeline from "@/components/shared/StatusPipeline";
import Drawer from "@/components/shared/Drawer";
import { BeginnerHint, SkeletonPage } from "@/components/shared/States";
import { useIsBeginner } from "@/state/CopilotContext";
import type { MAP, MapStatus } from "@/lib/types";
import { Calendar, User, Lock, Loader2, ShieldCheck, CheckSquare, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useOrgProfile } from "@/state/OrgProfileContext";

const COLUMNS: MapStatus[] = ["Pending", "Assigned", "In Progress", "Review", "Completed"];

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

function Card({ map }: { map: MAP }) {
  const isCompleted = map.status === "Completed";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: map.id,
    disabled: isCompleted,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  
  let sevBorder = "border-l-rose-500";
  if (map.severity === "Medium") sevBorder = "border-l-amber-500";
  else if (map.severity === "Low") sevBorder = "border-l-emerald-500";

  const initials = map.owner 
    ? map.owner.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() 
    : "—";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isCompleted ? listeners : {})}
      {...(!isCompleted ? attributes : {})}
      className={`bg-card border border-border rounded-lg p-3.5 shadow-sm transition-all border-l-4 ${sevBorder} ${
        isCompleted
          ? "cursor-default opacity-75"
          : "cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5"
      } ${isDragging ? "opacity-45 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono font-bold text-muted-foreground flex items-center gap-1 uppercase">
          {map.id.substring(0, 8)}
          {isCompleted && <Lock className="h-3 w-3 text-muted-foreground/80" />}
        </span>
        <RiskBadge risk={map.severity} />
      </div>
      <div className="text-xs font-bold text-foreground leading-snug mb-2.5">{map.title}</div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
        <span className="flex items-center gap-1.5" title={map.owner || "Unowned"}><User className="h-3 w-3" />{initials}</span>
        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{map.dueDate}</span>
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-2 pt-1 border-t border-border/40">
        {map.department || "Compliance"}
      </div>
    </div>
  );
}

function Column({ status, cards, onOpen }: { status: MapStatus; cards: MAP[]; onOpen: (m: MAP) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div 
      ref={setNodeRef} 
      className={`bg-muted/10 border border-border rounded-xl flex flex-col min-h-[460px] transition-all overflow-hidden ${
        isOver ? "ring-2 ring-primary/30 bg-primary/5 border-primary/40" : ""
      }`}
    >
      <div className="px-3.5 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">{status}</span>
        <span className="text-[10px] font-extrabold bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>
      <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
        {cards.map((c) => (
          <div key={c.id} onDoubleClick={() => onOpen(c)}>
            <Card map={c} />
          </div>
        ))}
        {cards.length === 0 && (
          <div className="h-full flex items-center justify-center py-10 text-center">
            <span className="text-[10px] text-muted-foreground font-semibold italic">No active tasks</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Maps() {
  const { orgProfile } = useOrgProfile();
  const [items, setItems] = useState<MAP[]>([]);
  const [open, setOpen] = useState<MAP | null>(null);
  const isBeginner = useIsBeginner();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [loading, setLoading] = useState(true);

  // Evidence state variables
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const loadMaps = () => {
    api.listMaps()
      .then((res) => {
        const mapped = (res || []).map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          owner: m.owner || "Compliance Team",
          ownerInitials: m.owner ? m.owner.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "CT",
          department: m.owner ? m.owner.replace(" Team", "") : "Compliance",
          dueDate: m.deadline || new Date().toISOString().slice(0, 10),
          severity: m.severity,
          status: m.status as MapStatus,
          regulationId: m.clause_ref || "Circular",
          evidenceRequired: m.severity === "Critical" ? ["QA Validation", "Security Log Scan"] : ["Verification Record"],
          impact: m.description
        }));
        
        setItems(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load maps", err);
        setItems([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMaps();
  }, [orgProfile.services]);

  useEffect(() => {
    if (open?.id) {
      if (open.id.startsWith("MAP-")) {
        setEvidenceList([]);
        return;
      }
      setEvidenceLoading(true);
      api.listEvidence(open.id)
        .then((res) => {
          setEvidenceList(res || []);
          setEvidenceLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load evidence files", err);
          setEvidenceLoading(false);
        });
    }
  }, [open?.id]);

  const handleEvidenceUpload = async (file: File) => {
    if (!open?.id) return;
    
    setUploadingEvidence(true);
    let currentMapId = open.id;
    let currentMap = open;

    if (open.id.startsWith("MAP-")) {
      try {
        const created = await api.createMap({
          title: open.title,
          description: open.description,
          owner: open.owner,
          severity: open.severity,
          deadline: open.dueDate,
          clause_ref: open.regulationId,
        });
        currentMapId = created.id;
        currentMap = {
          ...open,
          id: created.id,
        };
        setItems(prev => prev.map(item => item.id === open.id ? { ...item, id: created.id } : item));
        setOpen(currentMap);
      } catch (err: any) {
        toast({ title: "Upload failed", description: "Failed to initialize MAP task: " + err.message, variant: "destructive" });
        setUploadingEvidence(false);
        return;
      }
    }

    try {
      const res = await api.uploadEvidence(currentMapId, file);
      toast({ 
        title: "Evidence submitted", 
        description: `AI Review: ${res.validation_status}. ${res.ai_notes || ""}`,
        variant: res.validation_status === "Passed" ? "default" : "destructive"
      });
      const updatedList = await api.listEvidence(currentMapId);
      setEvidenceList(updatedList || []);
      
      loadMaps();
      if (res.validation_status === "Passed") {
        setOpen(null);
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const filteredItems = useMemo(() => {
    const selectedDepts = orgProfile.departments || [];
    if (selectedDepts.length === 0) return items;
    return items.filter(item => selectedDepts.includes(item.department));
  }, [items, orgProfile.departments]);

  const kpis = useMemo(() => ({
    total: filteredItems.length,
    pending: filteredItems.filter((m) => m.status === "Pending").length,
    assigned: filteredItems.filter((m) => m.status === "Assigned").length,
    inProgress: filteredItems.filter((m) => m.status === "In Progress").length,
    completed: filteredItems.filter((m) => m.status === "Completed").length,
    overdue: filteredItems.filter((m) => m.status !== "Completed" && new Date(m.dueDate) < new Date()).length,
  }), [filteredItems]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const target = over.id as MapStatus;
    const card = items.find((m) => m.id === active.id);
    if (!card) return;

    if (card.status === "Completed") {
      toast({
        title: "Workflow Locked",
        description: "Completed MAPs cannot be moved.",
        variant: "destructive",
      });
      return;
    }

    const sourceIndex = COLUMNS.indexOf(card.status);
    const targetIndex = COLUMNS.indexOf(target);

    if (Math.abs(targetIndex - sourceIndex) > 1) {
      toast({
        title: "Workflow Violation",
        description: `Cannot move MAP from "${card.status}" directly to "${target}". Transitions must be sequential.`,
        variant: "destructive",
      });
      return;
    }

    const previousItems = [...items];
    setItems((arr) => arr.map((m) => (m.id === active.id ? { ...m, status: target } : m)));

    try {
      let currentMapId = card.id;
      if (card.id.startsWith("MAP-")) {
        const created = await api.createMap({
          title: card.title,
          description: card.description,
          owner: card.owner,
          severity: card.severity,
          deadline: card.dueDate,
          clause_ref: card.regulationId,
        });
        currentMapId = created.id;
        setItems((arr) => arr.map((m) => (m.id === active.id ? { ...m, id: created.id, status: target } : m)));
      }

      await api.updateMapStatus(currentMapId, target);
      toast({
        title: "MAP status updated",
        description: `"${card.title}" moved to "${target}".`,
      });
    } catch (err: any) {
      setItems(previousItems);
      toast({
        title: "Failed to update MAP",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    }
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Action Points Management</h1>
          <p className="text-xs text-muted-foreground mt-1">Measurable Action Points (MAP) generated from circular audits</p>
        </div>
      </div>

      {isBeginner && (
        <BeginnerHint>Drag cards across the pipeline stages to update accountability progress. Double click any card to upload proofs.</BeginnerHint>
      )}

      {/* Bento KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <EnhancedKpiCard
          label="Total MAPs"
          value={kpis.total}
          progress={{ current: kpis.completed, target: kpis.total, label: "Completion" }}
        />
        <EnhancedKpiCard
          label="Pending"
          value={kpis.pending}
          tone="warning"
          subMetrics={[{ label: "Avg Age", value: "4.1 days" }]}
        />
        <EnhancedKpiCard
          label="Assigned"
          value={kpis.assigned}
          tone="info"
          subMetrics={[{ label: "Owners", value: `${new Set(filteredItems.map(m => m.department)).size} depts` }]}
        />
        <EnhancedKpiCard
          label="In Progress"
          value={kpis.inProgress}
          tone="info"
          subMetrics={[{ label: "Active", value: `${new Set(filteredItems.filter(m => m.status === "In Progress").map(m => m.owner)).size} owners` }]}
        />
        <EnhancedKpiCard
          label="Completed"
          value={kpis.completed}
          tone="success"
          trend={{ value: 14, label: "this week" }}
        />
        <EnhancedKpiCard
          label="Overdue"
          value={kpis.overdue}
          tone="danger"
          trend={{ value: -25, suffix: "%", label: "vs Q1", inverse: true }}
        />
      </div>

      {/* Workflow pipeline graphic wrapper */}
      <div className="glass-card p-4">
        <StatusPipeline
          title="Workflow Pipeline Progress"
          steps={[
            { label: "Pending", count: kpis.pending, tone: "warning" },
            { label: "Assigned", count: kpis.assigned, tone: "info" },
            { label: "In Progress", count: kpis.inProgress, tone: "info" },
            { label: "Review", count: filteredItems.filter((m) => m.status === "Review").length, tone: "warning" },
            { label: "Completed", count: kpis.completed, tone: "success" },
          ]}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
        <span className="mr-1 mt-0.5">Priority Level:</span>
        {[
          { label: "Critical Priority", c: "bg-rose-500" },
          { label: "High Priority", c: "bg-rose-400" },
          { label: "Medium Priority", c: "bg-amber-500" },
          { label: "Low Priority", c: "bg-emerald-500" },
        ].map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded bg-card text-foreground">
            <span className={`w-1.5 h-1.5 rounded-sm ${s.c}`} /> {s.label}
          </span>
        ))}
      </div>

      {/* DND Board */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map((c) => (
            <Column key={c} status={c} cards={filteredItems.filter((m) => m.status === c)} onOpen={setOpen} />
          ))}
        </div>
      </DndContext>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open && (
          <div className="space-y-5 text-sm text-foreground py-2">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="font-mono text-xs font-bold text-primary">{open.id.substring(0, 8)}</span>
              <RiskBadge risk={open.severity} />
              <span className="badge badge-info uppercase tracking-wider text-[10px]">{open.department}</span>
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Obligation Action</h4>
              <p className="text-foreground leading-relaxed font-semibold bg-muted/20 border border-border p-3.5 rounded-lg">{open.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-border py-4 text-xs font-semibold text-foreground">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Assigned Owner</span>
                <span className="flex items-center gap-1.5 text-primary"><User className="h-3.5 w-3.5" />{open.owner}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Compliance Due Date</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{open.dueDate}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Linked Clause Ref</span>
                <span className="font-mono text-primary">{open.regulationId}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Pipeline Stage</span>
                <span className="badge bg-muted text-foreground border-border uppercase text-[9px] tracking-wider font-extrabold">{open.status}</span>
              </div>
            </div>
            
            {open.evidenceRequired && open.evidenceRequired.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Evidence Required</h4>
                <ul className="list-disc ml-5 text-muted-foreground font-semibold space-y-1">
                  {open.evidenceRequired.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}

            {/* E2E Evidence Proof Management Panel */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Compliance Evidence Proof</h4>
              
              {evidenceLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading audit history...
                </div>
              ) : (
                <div className="space-y-2">
                  {evidenceList.map((ev) => (
                    <div key={ev.id} className="border border-border p-3 rounded-lg bg-muted/20 text-xs">
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="truncate max-w-[70%] text-foreground">{ev.filename}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          ev.validation_status === "Passed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : ev.validation_status === "Failed" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>{ev.validation_status}</span>
                      </div>
                      <p className="text-muted-foreground font-semibold leading-relaxed mt-1.5">{ev.ai_notes || "Verified by AI Audit trail."}</p>
                    </div>
                  ))}
                  
                  {evidenceList.length === 0 && (
                    <p className="text-xs text-muted-foreground italic font-semibold text-center py-4 bg-muted/10 border border-dashed border-border rounded-lg">
                      No compliance evidence documents uploaded yet
                    </p>
                  )}
                </div>
              )}

              {open.status !== "Completed" && (
                <div className="pt-2">
                  <label className="border border-dashed border-border hover:border-primary/50 hover:bg-muted/10 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-card">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Upload Verification Evidence</span>
                    <span className="text-[10px] text-muted-foreground mt-1">PDF or TXT accepted · Real-time AI validation check</span>
                    <input 
                      type="file" 
                      accept=".pdf,.txt" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEvidenceUpload(file);
                      }}
                      disabled={uploadingEvidence}
                    />
                  </label>
                  {uploadingEvidence && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 justify-center font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Running automated AI evidence validation...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}