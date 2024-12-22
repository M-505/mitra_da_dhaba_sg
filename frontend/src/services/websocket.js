class WebSocketService {
    constructor() {
      this.socket = null;
      this.listeners = new Map();
    }
  
    connect() {
      this.socket = new WebSocket('ws://localhost:3001');
  
      this.socket.onopen = () => {
        console.log('WebSocket Connected');
      };
  
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (this.listeners.has(data.type)) {
          this.listeners.get(data.type).forEach(callback => callback(data.payload));
        }
      };
  
      this.socket.onclose = () => {
        console.log('WebSocket Disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      };
    }
  
    subscribe(type, callback) {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set());
      }
      this.listeners.get(type).add(callback);
    }
  
    unsubscribe(type, callback) {
      if (this.listeners.has(type)) {
        this.listeners.get(type).delete(callback);
      }
    }
  
    send(type, payload) {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type, payload }));
      }
    }
  }
  
  export const wsService = new WebSocketService();