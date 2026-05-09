import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function PWAUpdater() {
  const { toast } = useToast();
  
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: ", r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast({
        title: "App Ready",
        description: "Dabba is now available offline!",
      });
      setOfflineReady(false);
    }
  }, [offlineReady, toast, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast({
        title: "Update Available",
        description: "A new version of Dabba is ready. Please refresh to get the latest features.",
        action: (
          <Button 
            size="sm" 
            variant="default" 
            className="gap-2"
            onClick={() => updateServiceWorker(true)}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        ),
      });
    }
  }, [needRefresh, updateServiceWorker, toast]);

  return null;
}
