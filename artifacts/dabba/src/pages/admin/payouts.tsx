import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Wallet, Search, CheckCircle2, XCircle, Clock, Loader2, IndianRupee, MessageSquare,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type PayoutRequest = {
  id: string;
  vendorId: string;
  vendorName: string | null;
  amount: string;
  upiId: string | null;
  bankAccount: string | null;
  ifscCode: string | null;
  accountName: string | null;
  notes: string | null;
  status: "pending" | "processing" | "paid" | "rejected";
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
};

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: "Pending",    color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  processing: { label: "Processing", color: "bg-blue-100 text-blue-800 border-blue-200",       icon: Loader2 },
  paid:       { label: "Paid",       color: "bg-green-100 text-green-800 border-green-200",    icon: CheckCircle2 },
  rejected:   { label: "Rejected",   color: "bg-red-100 text-red-800 border-red-200",          icon: XCircle },
};

export default function AdminPayouts() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionDialog, setActionDialog] = useState<{
    payout: PayoutRequest;
    action: "processing" | "paid" | "rejected";
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ payouts: PayoutRequest[] }>({
    queryKey: ["/api/payouts/admin", statusFilter],
    queryFn: async () => {
      const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/payouts${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payout requests");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const res = await fetch(`/api/payouts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: (_, { status }) => {
      toast({ title: `Payout marked as ${status}` });
      queryClient.invalidateQueries({ queryKey: ["/api/payouts/admin"] });
      setActionDialog(null);
      setAdminNotes("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const payouts = (data?.payouts ?? []).filter(p =>
    !search || p.vendorName?.toLowerCase().includes(search.toLowerCase())
  );

  const allPayouts = data?.payouts ?? [];
  const totalPending    = allPayouts.filter(p => p.status === "pending").length;
  const totalProcessing = allPayouts.filter(p => p.status === "processing").length;
  const totalPaid       = allPayouts.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(p.amount), 0);
  const totalRequested  = allPayouts.reduce((s, p) => s + parseFloat(p.amount), 0);

  const openAction = (payout: PayoutRequest, action: "processing" | "paid" | "rejected") => {
    setActionDialog({ payout, action });
    setAdminNotes(payout.adminNotes ?? "");
  };

  const ACTION_LABELS: Record<string, string> = {
    processing: "Mark as Processing",
    paid:       "Mark as Paid",
    rejected:   "Reject Request",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Payout Requests</h1>
        <p className="text-muted-foreground mt-1">Review and process vendor withdrawal requests.</p>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", value: totalPending,    color: "text-yellow-600", icon: Clock },
          { label: "Processing",     value: totalProcessing, color: "text-blue-500",   icon: Loader2 },
          { label: "Total Requested", value: `₹${totalRequested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "text-primary", icon: IndianRupee },
          { label: "Total Paid Out",  value: `₹${totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,       color: "text-green-600", icon: CheckCircle2 },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-20" /> : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by kitchen name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-x-auto">
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Kitchen</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Details</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : payouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No payout requests match your filters.
                </TableCell>
              </TableRow>
            ) : (
              payouts.map(p => {
                const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending;
                const Icon = cfg.icon;
                const isTerminal = p.status === "paid" || p.status === "rejected";

                return (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">{p.vendorName || "—"}</TableCell>
                    <TableCell className="font-bold text-primary">
                      ₹{parseFloat(p.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        {p.upiId && <div><span className="text-muted-foreground">UPI: </span>{p.upiId}</div>}
                        {p.bankAccount && <div><span className="text-muted-foreground">Acc: </span>••••{p.bankAccount.slice(-4)}</div>}
                        {p.ifscCode && <div className="text-muted-foreground text-xs">{p.ifscCode}</div>}
                        {p.accountName && <div className="text-muted-foreground text-xs">{p.accountName}</div>}
                      </div>
                      {p.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">{p.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(p.createdAt), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs border ${cfg.color} flex w-fit items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                      {p.adminNotes && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[180px] truncate" title={p.adminNotes}>
                          {p.adminNotes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isTerminal ? (
                        <span className="text-xs text-muted-foreground px-2">
                          {p.processedAt ? format(new Date(p.processedAt), "dd MMM") : "—"}
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === "pending" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAction(p, "processing")}>
                              Process
                            </Button>
                          )}
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => openAction(p, "paid")}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => openAction(p, "rejected")}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Action dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setAdminNotes(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">{actionDialog ? ACTION_LABELS[actionDialog.action] : ""}</DialogTitle>
            <DialogDescription>
              {actionDialog && (
                <>
                  Payout of <strong>₹{parseFloat(actionDialog.payout.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong> to{" "}
                  <strong>{actionDialog.payout.vendorName}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-notes">
                Admin Notes <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="admin-notes"
                placeholder="e.g. Transferred via NEFT, UTR: 12345..."
                className="resize-none h-20"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setAdminNotes(""); }}>
              Cancel
            </Button>
            <Button
              variant={actionDialog?.action === "rejected" ? "destructive" : "default"}
              disabled={updateStatus.isPending}
              onClick={() => {
                if (actionDialog) {
                  updateStatus.mutate({ id: actionDialog.payout.id, status: actionDialog.action, notes: adminNotes });
                }
              }}
            >
              {updateStatus.isPending ? "Saving..." : ACTION_LABELS[actionDialog?.action ?? "paid"]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
