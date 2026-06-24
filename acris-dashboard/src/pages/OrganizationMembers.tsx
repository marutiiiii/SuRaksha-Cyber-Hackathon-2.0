import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, UserX, Users, ShieldAlert, CheckCircle, Shield, Calendar, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { EmptyState, SkeletonPage } from "@/components/shared/States";
import { useAuth } from "@/state/AuthContext";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function OrganizationMembers() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Authorization check
  useEffect(() => {
    const userType = user?.user_type || user?.user_metadata?.user_type || "admin";
    if (userType !== "admin") {
      toast({
        title: "Access Denied",
        description: "User management is restricted to AI Compliance Officers.",
        variant: "destructive"
      });
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loadMembers = async () => {
    try {
      const res = await api.listMembers();
      setMembers(res || []);
    } catch (err: any) {
      console.error("Failed to load organization members", err);
      toast({
        title: "Failed to load members",
        description: err.message || "Could not retrieve organization members list.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleApprove = async (userId: string) => {
    setUpdatingId(userId);
    try {
      await api.approveMember(userId);
      toast({
        title: "Member Approved",
        description: "The user has been approved and is now active."
      });
      await loadMembers();
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err.message || "Could not approve the member.",
        variant: "destructive"
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBlock = async (userId: string) => {
    setUpdatingId(userId);
    try {
      await api.blockMember(userId);
      toast({
        title: "Member Blocked",
        description: "The user has been blocked from accessing the system."
      });
      await loadMembers();
    } catch (err: any) {
      toast({
        title: "Block action failed",
        description: err.message || "Could not block the member.",
        variant: "destructive"
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(m => 
      m.full_name?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term) ||
      m.department?.toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: members.length,
      pending: members.filter(m => m.status === "Pending Approval").length,
      active: members.filter(m => m.status === "Active").length,
      blocked: members.filter(m => m.status === "Blocked").length
    };
  }, [members]);

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <PageHeader 
        title="Organization Members" 
        subtitle="Manage and authorize access credentials for your departmental officers"
      />

      {/* Member stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Users className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground font-semibold">Total Members</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-foreground">{stats.pending}</div>
            <div className="text-[10px] text-muted-foreground font-semibold">Pending Approval</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-foreground">{stats.active}</div>
            <div className="text-[10px] text-muted-foreground font-semibold">Active Members</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <UserX className="h-4.5 w-4.5 text-rose-500" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-foreground">{stats.blocked}</div>
            <div className="text-[10px] text-muted-foreground font-semibold">Blocked Members</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 relative w-full sm:w-80">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
        <input
          type="text"
          placeholder="Search members..."
          className="premium-input pl-9 h-10 w-full focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table grid */}
      <div className="glass-card overflow-hidden">
        {filteredMembers.length === 0 ? (
          <EmptyState 
            title={searchTerm ? "No search results" : "No members found"}
            description={searchTerm ? "Try search with another name, email or department." : "No team members have registered yet."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Assigned Department</th>
                  <th className="p-3.5">Role Type</th>
                  <th className="p-3.5">Joined Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredMembers.map((m) => {
                  const isSelf = m.id === user?.id;
                  const initials = m.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "??";
                  const roleLabel = m.user_type === "admin" ? "AI Compliance Officer" : "Department Officer";
                  
                  return (
                    <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3.5 font-semibold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-extrabold text-[10px]">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold text-foreground">{m.full_name}</span>
                            {isSelf && <span className="ml-1.5 badge bg-primary/15 text-primary text-[8px] tracking-wider uppercase font-extrabold">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-mono font-semibold">{m.email}</td>
                      <td className="p-3.5 font-bold">
                        {m.department ? (
                          <span className="badge badge-info uppercase text-[9px] tracking-wider">{m.department}</span>
                        ) : (
                          <span className="text-muted-foreground italic font-semibold">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-foreground font-semibold flex items-center gap-1 mt-2.5">
                        <Shield className={`h-3.5 w-3.5 ${m.user_type === "admin" ? "text-primary" : "text-muted-foreground"}`} />
                        <span>{roleLabel}</span>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(m.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="p-3.5 font-bold">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          m.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                          : m.status === "Blocked" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>{m.status}</span>
                      </td>
                      <td className="p-3.5 text-right">
                        {isSelf ? (
                          <span className="text-muted-foreground font-semibold italic text-[10px]">Locked</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {(m.status === "Pending Approval" || m.status === "Blocked") && (
                              <button
                                onClick={() => handleApprove(m.id)}
                                className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-500 font-extrabold text-[10px] tracking-wide flex items-center gap-1 transition-colors"
                                disabled={updatingId !== null}
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Approve
                              </button>
                            )}
                            {m.status === "Active" && (
                              <button
                                onClick={() => handleBlock(m.id)}
                                className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 font-extrabold text-[10px] tracking-wide flex items-center gap-1 transition-colors"
                                disabled={updatingId !== null}
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Block
                              </button>
                            )}
                          </div>
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
    </div>
  );
}
