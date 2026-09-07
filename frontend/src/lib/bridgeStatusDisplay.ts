import type { BridgeStatus } from '../hooks/useBridgeStatus';

export interface BridgeStatusDisplay {
  label: string;
  detail: string;
  dotClass: string;
  isProblem: boolean;
}

/** Shared status -> label/color mapping so the Topbar pill and the warning banner never disagree. */
export function describeBridgeStatus(status: BridgeStatus | undefined): BridgeStatusDisplay {
  if (!status) {
    return { label: 'Checking...', detail: '', dotClass: 'bg-slate-500', isProblem: false };
  }
  if (status.status === 'never_connected') {
    return {
      label: 'Bridge never connected',
      detail: 'The WhatsApp bridge has not reported in yet - is it running?',
      dotClass: 'bg-slate-500',
      isProblem: true,
    };
  }
  if (status.connected) {
    return { label: 'Bridge connected', detail: '', dotClass: 'bg-emerald-400', isProblem: false };
  }
  if (status.stale) {
    const minutes = status.minutesSinceLastHeartbeat ?? 0;
    return {
      label: 'Bridge disconnected',
      detail:
        status.status === 'logged_out'
          ? `Logged out ${minutes} minute(s) ago - needs re-linking (see whatsapp-bridge/README.md).`
          : `No response for ${minutes} minute(s) - new WhatsApp complaints are not being captured.`,
      dotClass: 'bg-rose-400',
      isProblem: true,
    };
  }
  return {
    label: 'Bridge reconnecting...',
    detail: 'Lost connection, attempting to reconnect on its own.',
    dotClass: 'bg-amber-400',
    isProblem: true,
  };
}
