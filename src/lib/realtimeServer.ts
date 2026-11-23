// Server-side Real-time Event Broadcaster
// Provides cross-device real-time event streaming for PM e-Vidya Web Portal & Android App

type EventCallback = (event: { type: string; payload?: any; timestamp: number }) => void;

class RealtimeBroadcaster {
  private subscribers: Set<EventCallback> = new Set();

  public subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public broadcast(type: string, payload?: any): void {
    const event = {
      type,
      payload,
      timestamp: Date.now()
    };
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (err) {
        console.warn('[Realtime] Failed to notify subscriber:', err);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Global singleton instance
const globalForRealtime = globalThis as unknown as { realtimeBroadcaster?: RealtimeBroadcaster };
export const realtimeServer = globalForRealtime.realtimeBroadcaster || new RealtimeBroadcaster();
if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.realtimeBroadcaster = realtimeServer;
}
