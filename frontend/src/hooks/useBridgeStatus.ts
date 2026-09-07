import { useQuery } from '@tanstack/react-query';
import { fetchBridgeStatus } from '../lib/api';

export interface BridgeStatus {
  connected: boolean;
  stale: boolean;
  status: string;
  lastHeartbeatAt: string | null;
  minutesSinceLastHeartbeat: number | null;
}

/**
 * Shared poll for WhatsApp bridge connectivity - every consumer uses the
 * same query key, so react-query dedupes this into a single request no
 * matter how many components (Topbar pill + warning banner) read it.
 */
export function useBridgeStatus() {
  return useQuery<BridgeStatus>({
    queryKey: ['bridgeStatus'],
    queryFn: fetchBridgeStatus,
    refetchInterval: 30000,
  });
}
