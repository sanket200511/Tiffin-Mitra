import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMyVendorProfile } from "@workspace/api-client-react";
import {
  format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isBefore, startOfDay, parseISO, getDay,
} from "date-fns";
import {
  CalendarOff, ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Info,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Holiday = { id: string; date: string; reason: string | null; createdAt: string };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function VendorSchedule() {
  const [viewDate, setViewDate] = useState(new Date());
  const [addDialog, setAddDialog] = useState<{ date: string } | null>(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profileData } = useGetMyVendorProfile();
  const vendorId = profileData?.vendor?.id;

  const { data, isLoading } = useQuery<{ holidays: Holiday[] }>({
    queryKey: ["/api/vendor/holidays", vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${vendorId}/holidays/all`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch holidays");
      return res.json();
    },
    enabled: !!vendorId,
  });

  const addMutation = useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason: string }) => {
      const res = await fetch(`/api/vendors/${vendorId}/holidays`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason: reason || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Failed to add holiday");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/holidays", vendorId] });
      toast({ title: "Holiday added", description: "That day will be skipped for new deliveries." });
      setAddDialog(null);
      setReason("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (holidayId: string) => {
      const res = await fetch(`/api/vendors/${vendorId}/holidays/${holidayId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove holiday");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/holidays", vendorId] });
      toast({ title: "Holiday removed" });
    },
    onError: () => toast({ title: "Error removing holiday", variant: "destructive" }),
  });

  const holidays = data?.holidays ?? [];
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.date, h])), [holidays]);

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const leadingBlanks = getDay(monthStart);
  const upcomingHolidays = holidays.filter((h) => !isBefore(parseISO(h.date), today));
  const pastHolidays = holidays.filter((h) => isBefore(parseISO(h.date), today));

  function handleDayClick(day: Date) {
    if (isBefore(day, today)) return;
    const dateStr = format(day, "yyyy-MM-dd");
    if (holidaySet.has(dateStr)) {
      const h = holidayMap.get(dateStr)!;
      deleteMutation.mutate(h.id);
    } else {
      setAddDialog({ date: dateStr });
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Kitchen Schedule</h1>
        <p className="text-muted-foreground mt-1">
          Mark days when your kitchen will be closed. Future subscriptions will automatically skip these dates.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
        <p>
          Holidays only affect <strong>new subscriptions</strong> created after this change.
          Existing scheduled deliveries are not modified — cancel them manually from the Orders page if needed.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">
                {format(viewDate, "MMMM yyyy")}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setViewDate(d => addMonths(d, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setViewDate(d => addMonths(d, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
                {isLoading ? (
                  Array.from({ length: days.length }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-md" />
                  ))
                ) : (
                  days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isPast = isBefore(day, today);
                    const isHoliday = holidaySet.has(dateStr);
                    const isTodayDay = isToday(day);
                    const isCurrentMonth = isSameMonth(day, viewDate);

                    return (
                      <button
                        key={dateStr}
                        disabled={isPast}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "h-10 rounded-md text-sm font-medium transition-all relative",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isPast && "opacity-30 cursor-not-allowed",
                          !isPast && !isHoliday && "hover:bg-primary/10 hover:text-primary cursor-pointer",
                          isTodayDay && !isHoliday && "ring-2 ring-primary/30 bg-primary/5",
                          isHoliday && "bg-red-100 text-red-700 ring-1 ring-red-200 hover:bg-red-200 cursor-pointer",
                          !isCurrentMonth && "opacity-40",
                        )}
                      >
                        {format(day, "d")}
                        {isHoliday && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-100 ring-1 ring-red-200 inline-block" />
                  Holiday (click to remove)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary/10 ring-1 ring-primary/30 inline-block" />
                  Today
                </span>
                <span className="flex items-center gap-1.5">
                  Click a future date to mark as holiday
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holiday list */}
        <div className="space-y-5">
          {/* Upcoming */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarOff className="w-4 h-4 text-primary" />
                Upcoming Closures
                {upcomingHolidays.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{upcomingHolidays.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              ) : upcomingHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No upcoming closures. Your kitchen is open every day.
                </p>
              ) : (
                upcomingHolidays.map((h) => (
                  <div key={h.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{format(parseISO(h.date), "dd MMM yyyy")}</p>
                      {h.reason && (
                        <p className="text-xs text-muted-foreground truncate">{h.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(h.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Past */}
          {pastHolidays.length > 0 && (
            <Card className="shadow-sm opacity-60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Past Closures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {pastHolidays.slice(-5).reverse().map((h) => (
                  <div key={h.id} className="py-1.5 border-b last:border-0">
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(h.date), "dd MMM yyyy")}
                      {h.reason && ` — ${h.reason}`}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add holiday dialog */}
      <Dialog open={!!addDialog} onOpenChange={(open) => { if (!open) { setAddDialog(null); setReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Mark as Holiday</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Your kitchen will be marked as <strong>closed</strong> on{" "}
                <strong>{addDialog ? format(parseISO(addDialog.date), "EEEE, dd MMM yyyy") : ""}</strong>.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g. Diwali, kitchen maintenance..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialog(null); setReason(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={addMutation.isPending}
              onClick={() => addDialog && addMutation.mutate({ date: addDialog.date, reason })}
            >
              <CalendarOff className="w-3.5 h-3.5 mr-1.5" />
              {addMutation.isPending ? "Saving..." : "Mark Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
