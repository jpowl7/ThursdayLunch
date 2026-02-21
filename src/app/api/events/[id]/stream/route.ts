import { NextRequest } from "next/server";
import { getEventSnapshot } from "@/lib/db/queries";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let lastHash = "";

  const stream = new ReadableStream({
    async start(controller) {
      const sendSnapshot = async () => {
        try {
          const snapshot = await getEventSnapshot(id);
          if (!snapshot) return;
          const json = JSON.stringify(snapshot);
          const hash = simpleHash(json);
          if (hash !== lastHash) {
            lastHash = hash;
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          }
        } catch (error) {
          console.error("SSE snapshot error:", error);
        }
      };

      // Send initial snapshot
      await sendSnapshot();

      // Poll every 2 seconds
      const interval = setInterval(sendSnapshot, 2000);

      // Clean up when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}
