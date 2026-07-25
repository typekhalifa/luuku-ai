import { env } from "@/config/env";
import type { LuukuEvent } from "../types";

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected";

type EventHandler<T = unknown> = (event: LuukuEvent<T>) => void;

export class WebSocketClient {
  private socket?: WebSocket;
  private reconnectTimer?: number;
  private handlers = new Set<EventHandler>();
  private state: ConnectionState = "disconnected";

  connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.state = "connecting";

    this.socket = new WebSocket(env.wsBaseUrl);

    this.socket.onopen = () => {
      this.state = "connected";
      console.log("🟢 WebSocket Connected");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as LuukuEvent;

      this.handlers.forEach((handler) => handler(data));
    };

    this.socket.onclose = () => {
      this.state = "disconnected";
      console.log("🔴 WebSocket Closed");

      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect() {
    window.clearTimeout(this.reconnectTimer);

    this.socket?.close();

    this.socket = undefined;
  }

  subscribe(handler: EventHandler) {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  getState() {
    return this.state;
  }

  private scheduleReconnect() {
    window.clearTimeout(this.reconnectTimer);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, 3000);
  }
}

export const wsClient = new WebSocketClient();