import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, FileDown, ShieldCheck, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { EmptyState, SkeletonPage } from "@/components/shared/States";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type TabType = "Pending" | "Passed" | "Failed" | "All";

export default function EvidenceManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [mapLookup, setMapLookup] = useState<Record<string, string>>({});
  const [memberLookup, setMemberLookup] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("Pending");
  
  // Rejection modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Authorization check
  useEffect(() => {
    const userType = user?.user_type || user?.user_metadata?.user_type || "admin";
    if (userType !== "admin") {
      toast({
        title: "Access Denied",
        description: "Evidence review is restricted to AI Compliance Officers.",
        variant: "destructive"
      });
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [evidences, maps, members] = await Promise.all([
        api.listAllEvidence(),
        api.listMaps(),
        api.listMembers()
      ]);

      // Create lookup maps
      const mapsMap: Record<string, string> = {};
      (maps || []).forEach((m: MapTask) => {
        mapsMap[m.id] = m.title;
      });

      const membersMap: Record<string, string> = {};
      (members || []).forEach((u: { id: string; user_metadata?: { name?: string } }) => {
        membersMap[u.id] = u.full_name;
      });

      setMapLookup(mapsMap);
      setMemberLookup(membersMap);
      setEvidenceList(evidences || []);
    } catch (err: unknown) {
      console.error("Failed to load evidence reviews", err);
      toast({
        title: "Error loading reviews",
        description: err.message || "Could not retrieve evidence records.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReview = async (id: string, status: "Passed" | "Failed", reason?: string) => {
    setSubmittingReview(true);
    try {
      await api.reviewEvidence(id, status, reason);
      toast({
        title: status === "Passed" ? "Evidence Approved" : "Evidence Rejected",
        description: status === "Passed" 
          ? "MAP has been successfully transitioned to the requested status."
          : "MAP has been reverted to its previous status."
      });
      setRejectingId(null);
      setRejectionReason("");
      await loadData();
    } catch (err: unknown) {
      toast({
        title: "Action failed",
        description: (err as Error).message || "Failed to submit review decisions.",
        variant: "destructive"
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Tab Filtering & Counts
  const counts = useMemo(() => {
    return {
      Pending: evidenceList.filter(e => e.validation_status === "Pending").length,
      Passed: evidenceList.filter(e => e.validation_status === "Passed").length,
      Failed: evidenceList.filter(e => e.validation_status === "Failed").length,
      All: evidenceList.length
    };
  }, [evidenceList]);

  const filteredEvidence = useMemo(() => {
    if (activeTab === "All") return evidenceList;
    return evidenceList.filter(e => e.validation_status === activeTab);
  }, [evidenceList, activeTab]);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <PageHeader 
        title="Evidence Validation Control" 
        subtitle="Manual authorization review panel for department transition requests"
      />

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-foreground">{counts.Pending}</div>
            <div className="text-xs text-muted-foreground font-semibold">Awaiting Verification</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-foreground">{counts.Passed}</div>
            <div className="text-xs text-muted-foreground font-semibold">Approved Submissions</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <AlertCircle className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-foreground">{counts.Failed}</div>
            <div className="text-xs text-muted-foreground font-semibold">Rejected Submissions</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground select-none pt-2">
        {(["Pending", "Passed", "Failed", "All"] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          const displayLabel = tab === "Passed" ? "Approved" : tab === "Failed" ? "Rejected" : tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 border-b-2 font-extrabold -mb-[2px] transition-all flex items-center gap-2 hover:text-foreground ${
                isActive ? "border-primary text-foreground bg-primary/5" : "border-transparent"
              }`}
            >
              {displayLabel}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table view */}
      <div className="glass-card overflow-hidden">
        {filteredEvidence.length === 0 ? (
          <EmptyState 
            title={`No ${activeTab === "Passed" ? "Approved" : activeTab === "Failed" ? "Rejected" : activeTab} Evidences`}
            description="There are currently no compliance records corresponding to this state."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">User Details</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">MAP Details</th>
                  <th className="p-3.5">Transition Request</th>
                  <th className="p-3.5">File Upload</th>
                  <th className="p-3.5">Submitted At</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEvidence.map((ev) => {
                  const uploader = memberLookup[ev.user_id] || "Unknown User";
                  const mapTitle = mapLookup[ev.map_id] || "Unknown MAP Task";
                  const submissionDate = new Date(ev.created_at || ev.submitted_at).toLocaleString();

                  return (
                    <tr key={ev.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3.5 font-semibold">
                        <div className="text-foreground font-bold">{uploader}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{ev.user_id.substring(0, 8)}...</div>
                      </td>
                      <td className="p-3.5 font-bold">
                        <span className="badge badge-info uppercase text-[9px] tracking-wider">{ev.department || "Compliance"}</span>
                      </td>
                      <td className="p-3.5 max-w-xs font-semibold">
                        <div className="text-foreground truncate font-bold" title={mapTitle}>{mapTitle}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{ev.map_id}</div>
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        <span className="text-muted-foreground">{ev.previous_status || "—"}</span>
                        <span className="mx-1 text-primary">→</span>
                        <span className="text-foreground font-extrabold uppercase">{ev.requested_status}</span>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => api.downloadEvidence(ev.id, ev.filename)}
                          className="flex items-center gap-1 text-primary hover:underline font-bold text-[11px]"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[120px]" title={ev.filename}>{ev.filename}</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-semibold">{submissionDate}</td>
                      <td className="p-3.5 font-bold">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          ev.validation_status === "Passed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : ev.validation_status === "Failed" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>{ev.validation_status === "Passed" ? "Approved" : ev.validation_status === "Failed" ? "Rejected" : "Pending"}</span>
                        
                        {ev.validation_status === "Failed" && ev.rejection_reason && (
                          <div className="mt-1 text-[10px] font-normal text-rose-400 max-w-[150px] leading-relaxed italic">
                            Reason: {ev.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {ev.validation_status === "Pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReview(ev.id, "Passed")}
                              className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-500 flex items-center justify-center transition-colors"
                              title="Approve Evidence"
                              disabled={submittingReview}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setRejectingId(ev.id)}
                              className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 text-rose-500 flex items-center justify-center transition-colors"
                              title="Reject Evidence"
                              disabled={submittingReview}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic font-semibold">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground">Reject Compliance Evidence</h3>
              <button 
                onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                Reason for Rejection
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Describe why this evidence is insufficient or rejected..."
                className="w-full bg-muted/20 border border-border rounded-lg p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 min-h-[100px] text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast({ title: "Reason required", description: "Please explain why the evidence is rejected.", variant: "destructive" });
                    return;
                  }
                  handleReview(rejectingId, "Failed", rejectionReason);
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-500 flex items-center gap-1.5"
                disabled={submittingReview || !rejectionReason.trim()}
              >
                {submittingReview && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
