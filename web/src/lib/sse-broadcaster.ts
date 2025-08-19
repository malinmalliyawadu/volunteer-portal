// Simple in-memory SSE broadcaster
// In production, you'd want to use Redis pub/sub or similar for multi-instance support

type SSEClient = {
  userId: string;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
};

class SSEBroadcaster {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, controller: ReadableStreamDefaultController) {
    const encoder = new TextEncoder();
    const client: SSEClient = { userId, controller, encoder };
    
    const userClients = this.clients.get(userId) || [];
    userClients.push(client);
    this.clients.set(userId, userClients);

    return client;
  }

  removeClient(userId: string, controller: ReadableStreamDefaultController) {
    const userClients = this.clients.get(userId) || [];
    const updatedClients = userClients.filter(client => client.controller !== controller);
    
    if (updatedClients.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, updatedClients);
    }
  }

  broadcast(userId: string, event: Record<string, unknown>) {
    const userClients = this.clients.get(userId) || [];
    const message = `data: ${JSON.stringify(event)}\n\n`;

    userClients.forEach((client, index) => {
      try {
        client.controller.enqueue(client.encoder.encode(message));
      } catch (error) {
        console.error(`Error broadcasting to client ${index}:`, error);
        // Remove dead client
        userClients.splice(index, 1);
      }
    });

    // Update the clients map if we removed any dead clients
    if (userClients.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, userClients);
    }
  }

  broadcastUnreadCountChange(userId: string, count: number) {
    this.broadcast(userId, {
      type: 'unread_count_changed',
      data: { count }
    });
  }

  broadcastNewNotification(userId: string, notification: Record<string, unknown>) {
    this.broadcast(userId, {
      type: 'notification',
      data: notification
    });
  }

  getClientCount(userId?: string): number {
    if (userId) {
      return this.clients.get(userId)?.length || 0;
    }
    return Array.from(this.clients.values()).reduce((total, clients) => total + clients.length, 0);
  }
}

// Export singleton instance
export const sseBroadcaster = new SSEBroadcaster();