'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Cross-tab instantaneous BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('pmevidya_video_production_sync');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'REFRESH_ALL' || event.data?.type === 'WORKFLOW_UPDATE') {
            router.refresh();
          }
        };
      } catch (_) {}
    }

    // 2. Cross-Device Server-Sent Events (SSE) Stream
    function connectSSE() {
      if (typeof EventSource === 'undefined') {
        startFallbackPolling();
        return;
      }

      try {
        const es = new EventSource('/api/realtime/events');
        eventSourceRef.current = es;

        es.onopen = () => {
          // Connected successfully; clear fallback polling
          if (fallbackPollRef.current) {
            clearInterval(fallbackPollRef.current);
            fallbackPollRef.current = null;
          }
        };

        const handleRealtimeEvent = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            // Notify local tabs via BroadcastChannel if present
            if (broadcastChannel) {
              broadcastChannel.postMessage({ type: 'WORKFLOW_UPDATE', event: data.type });
            }
            // Dispatch window event for listening components (e.g. ProductionWorkflowClient)
            window.dispatchEvent(new CustomEvent('pmevidyaRealtimeEvent', { detail: data }));
            // Trigger Next.js router refresh for fresh server component data
            router.refresh();
          } catch (_) {}
        };

        // Listen for specific event types
        es.addEventListener('EPIC_UPDATED', handleRealtimeEvent);
        es.addEventListener('SHOOTING_LOGGED', handleRealtimeEvent);
        es.addEventListener('EDITING_LOGGED', handleRealtimeEvent);
        es.addEventListener('BUDGET_UPDATED', handleRealtimeEvent);
        es.addEventListener('SME_UPDATED', handleRealtimeEvent);

        es.onerror = () => {
          es.close();
          eventSourceRef.current = null;
          // Fall back to database reconciliation polling on network disruption
          startFallbackPolling();
          // Try reconnecting after 10 seconds
          setTimeout(connectSSE, 10000);
        };
      } catch (_) {
        startFallbackPolling();
      }
    }

    // 3. Fallback Database Reconciliation Polling (8s interval)
    function startFallbackPolling() {
      if (fallbackPollRef.current) return;
      fallbackPollRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          router.refresh();
        }
      }, 8000);
    }

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (fallbackPollRef.current) {
        clearInterval(fallbackPollRef.current);
        fallbackPollRef.current = null;
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [router]);

  return <>{children}</>;
}
