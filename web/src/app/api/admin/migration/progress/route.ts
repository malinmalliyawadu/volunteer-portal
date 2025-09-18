import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Store for SSE connections
const connections = new Map<string, ReadableStreamDefaultController>();
const progressData = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return new Response("Unauthorized", { status: 403 });
    }

    // Get session ID from query params
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    
    if (!sessionId) {
      return new Response("Missing sessionId", { status: 400 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store controller for this session
        connections.set(sessionId, controller);

        // Send initial connection event
        const data = `data: ${JSON.stringify({ 
          type: "connected", 
          message: "Progress stream connected",
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));

        // Send any existing progress data
        const existing = progressData.get(sessionId);
        if (existing) {
          const progressEvent = `data: ${JSON.stringify(existing)}\n\n`;
          controller.enqueue(new TextEncoder().encode(progressEvent));
        }

        // Cleanup on connection close
        request.signal.addEventListener("abort", () => {
          connections.delete(sessionId);
          progressData.delete(sessionId);
          try {
            controller.close();
          } catch (e) {
            // Controller might already be closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("SSE error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Helper function to send progress updates
export function sendProgress(sessionId: string, data: any) {
  const controller = connections.get(sessionId);
  if (controller) {
    // Store progress data
    progressData.set(sessionId, {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Send data to SSE stream
      const event = `data: ${JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(event));
    } catch (e) {
      console.error(`Failed to send progress update for ${sessionId}:`, e);
      // Remove dead connection
      connections.delete(sessionId);
    }
  }
}

// POST endpoint to send progress updates (called by migration APIs)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return new Response("Unauthorized", { status: 403 });
    }

    const { sessionId, ...data } = await request.json();
    
    if (!sessionId) {
      return new Response("Missing sessionId", { status: 400 });
    }

    // Store progress and attempt to send to connected clients
    progressData.set(sessionId, {
      ...data,
      timestamp: new Date().toISOString()
    });

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Progress POST error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}