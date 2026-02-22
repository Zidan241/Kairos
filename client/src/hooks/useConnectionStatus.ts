import { useQuery, useQueryClient } from "@tanstack/react-query";
import { activityApi } from "@/lib/api";

const POLL_INTERVAL = 30_000;

export function useConnectionStatus() {
  const queryClient = useQueryClient();

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["/api/activity/status"],
    queryFn: async () => {
      try {
        const s = await activityApi.getStatus();
        return { connected: s.running && !s.paused, paused: s.paused };
      } catch {
        return { connected: false, paused: false };
      }
    },
    refetchInterval: POLL_INTERVAL,
    // No staleTime — invalidateQueries() must always refetch so UI
    // updates instantly when the user clicks pause/resume.
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/activity/status"] });

  return {
    connected: data?.connected ?? false,
    paused: data?.paused ?? false,
    loading: isLoading,
    lastChecked: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
    refresh,
  };
}
