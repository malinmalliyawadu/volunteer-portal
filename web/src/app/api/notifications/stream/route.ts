import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { sseBroadcaster } from "@/lib/sse-broadcaster";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", userId })}\n\n`
        )
      );

      // Add this client to the broadcaster
      sseBroadcaster.addClient(userId, controller);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "heartbeat",
                timestamp: Date.now(),
              })}\n\n`
            )
          );
        } catch (error) {
          console.error("Error sending heartbeat:", error);
          clearInterval(heartbeatInterval);
          sseBroadcaster.removeClient(userId, controller);
          try {
            controller.close();
          } catch (e) {
            // Connection already closed
            console.error("Error closing connection:", e);
          }
        }
      }, 30000);

      // Store cleanup function for when the connection closes
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        sseBroadcaster.removeClient(userId, controller);
      };

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch (e) {
          // Connection already closed
          console.error("Error closing connection:", e);
        }
      });
    },
  });

  // Return the stream with proper SSE headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
    },
  });
}
