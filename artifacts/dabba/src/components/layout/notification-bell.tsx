import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, ShoppingBag, Store, Wallet, Star, Check, CheckCheck, Trash2,
  Package, Bike, ChefHat, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const TYPE_ICON: Record<string, { icon: typeof Bell; color: string }> = {
  order_status:     { icon: ShoppingBag,  color: "text-blue-500 bg-blue-50" },
  order_accepted:   { icon: CheckCheck,   color: "text-green-600 bg-green-50" },
  order_preparing:  { icon: ChefHat,      color: "text-orange-500 bg-orange-50" },
  order_packed:     { icon: Package,      color: "text-purple-500 bg-purple-50" },
  order_picked_up:  { icon: Bike,         color: "text-indigo-500 bg-indigo-50" },
  order_delivered:  { icon: Star,         color: "text-green-600 bg-green-50" },
  order_cancelled:  { icon: XCircle,      color: "text-red-500 bg-red-50" },
  new_subscription: { icon: Wallet,       color: "text-primary bg-primary/10" },
  vendor_approved:  { icon: Store,        color: "text-green-600 bg-green-50" },
  vendor_rejected:  { icon: XCircle,      color: "text-red-500 bg-red-50" },
  vendor_suspended: { icon: XCircle,      color: "text-red-500 bg-red-50" },
  payout_request:   { icon: Wallet,       color: "text-primary bg-primary/10" },
  payout_processed: { icon: Wallet,       color: "text-green-600 bg-green-50" },
};

function NotifIcon({ type }: { type: string }) {
  const cfg = TYPE_ICON[type] ?? { icon: Bell, color: "text-muted-foreground bg-muted" };
  const Icon = cfg.icon;
  return (
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", cfg.color)}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{ notifications: Notif[] }>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const deleteNotif = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="h-5 text-[10px] px-1.5">{unreadCount} new</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="py-14 text-center">
              <Bell className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif, idx) => (
                <div key={notif.id}>
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group cursor-pointer",
                      !notif.isRead && "bg-primary/[0.03]",
                    )}
                    onClick={() => {
                      if (!notif.isRead) markRead.mutate(notif.id);
                    }}
                  >
                    <NotifIcon type={notif.type} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", !notif.isRead ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif.mutate(notif.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {idx < notifications.length - 1 && <Separator className="mx-4" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t px-4 py-2.5 text-center">
            <p className="text-xs text-muted-foreground">
              Showing last {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
