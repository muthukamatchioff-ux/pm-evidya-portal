import { NextRequest } from 'next/server';
import { realtimeServer } from '@/lib/realtimeServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`));

      // Subscribe to real-time broadcaster
      const unsubscribe = realtimeServer.subscribe((event) => {
        try {
          const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (_) {
          // Stream might be closed
        }
      });

      // Keepalive heartbeat ping every 25 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (_) {
          clearInterval(heartbeat);
        }
      }, 25000);

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch (_) {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  });
}
