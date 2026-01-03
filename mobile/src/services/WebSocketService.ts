import io, { Socket } from 'socket.io-client';
import { store } from '@/store';
import { addNotification } from '@/store/slices/notificationSlice';
import { 
  sessionStarted,
  sessionEnded,
  receivingStarted,
  receivingEnded,
  setError,
  setGroups,
  updateGroupStatus
} from '@/store/slices/pttSlice';
import {
  locationUpdated,
  setLocationHistory
} from '@/store/slices/locationSlice';
import {
  messageReceived,
  userTyping,
  messageDelivered,
  messageRead
} from '@/store/slices/messageSlice';
import {
  emergencyAlert,
  emergencyResolved,
  setEmergencyActive
} from '@/store/slices/emergencySlice';
import {
  updateUserStatus,
  updateConnectionStatus
} from '@/store/slices/authSlice';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isReconnecting = false;

  constructor() {
    this.setupEventHandlers();
  }

  connect(token: string, deviceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:9998', {
          auth: {
            token,
            deviceId,
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
        });

        this.socket.on('connect', () => {
          console.log('📡 Connected to WebSocket server');
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          store.dispatch(updateConnectionStatus('ONLINE'));
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          store.dispatch(setError(`Connection failed: ${error.message}`));
          this.handleReconnect();
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          store.dispatch(updateConnectionStatus('OFFLINE'));
          
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, reconnect manually
            this.handleReconnect();
          }
        });

      } catch (error) {
        console.error('WebSocket setup error:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    
    setTimeout(() => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        if (this.socket) {
          this.socket.connect();
        }
      }
    }, delay);
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // PTT Events
    this.socket?.on('ptt_started', (data) => {
      store.dispatch(sessionStarted({
        ...data,
        isCaller: data.callerId === store.getState().auth.user?.id,
      }));
    });

    this.socket?.on('ptt_ended', (data) => {
      store.dispatch(sessionEnded());
    });

    this.socket?.on('ptt_granted', (data) => {
      store.dispatch(receivingStarted({
        userId: data.callerId,
        username: data.callerName,
      }));
    });

    this.socket?.on('ptt_denied', (data) => {
      store.dispatch(setError(data.reason));
    });

    this.socket?.on('ptt_audio', (data) => {
      // Handle incoming audio data
      this.handleIncomingAudio(data);
    });

    // Location Events
    this.socket?.on('location_update', (data) => {
      store.dispatch(locationUpdated(data));
    });

    // Messaging Events
    this.socket?.on('message_received', (data) => {
      store.dispatch(messageReceived(data));
    });

    this.socket?.on('user_typing', (data) => {
      store.dispatch(userTyping(data));
    });

    // Emergency Events
    this.socket?.on('emergency_alert', (data) => {
      store.dispatch(emergencyAlert(data));
      store.dispatch(setEmergencyActive(true));
      
      // Show notification
      store.dispatch(addNotification({
        id: `emergency_${data.alertId}`,
        type: 'emergency',
        title: 'Emergency Alert',
        message: `${data.alertType} - ${data.username}`,
        priority: 'high',
        timestamp: new Date().toISOString(),
      }));
    });

    this.socket?.on('emergency_resolved', (data) => {
      store.dispatch(emergencyResolved(data));
      
      if (data.userId === store.getState().auth.user?.id) {
        store.dispatch(setEmergencyActive(false));
      }
    });

    // User Status Events
    this.socket?.on('user_status', (data) => {
      store.dispatch(updateUserStatus({
        userId: data.userId,
        status: data.status,
      }));
    });

    // Configuration Events
    this.socket?.on('config_response', (data) => {
      store.dispatch(setGroups(data.groups || []));
    });

    this.socket?.on('config_updated', (data) => {
      console.log('Configuration updated:', data);
    });

    // Error Events
    this.socket?.on('error', (data) => {
      store.dispatch(setError(data.message));
    });
  }

  private handleIncomingAudio(data: any): void {
    // This will be handled by the AudioService
    console.log('🎵 Incoming audio data:', data.senderId);
  }

  // Public methods for sending events
  requestPTT(groupId: string, sessionType: string = 'VOICE'): void {
    this.socket?.emit('ptt_request', { groupId, sessionType });
  }

  releasePTT(sessionId: string): void {
    this.socket?.emit('ptt_release', { sessionId });
  }

  sendAudioData(sessionId: string, audioData: any, sequenceNumber: number): void {
    this.socket?.emit('ptt_audio_data', {
      sessionId,
      audioData,
      sequenceNumber,
    });
  }

  sendLocationUpdate(location: any): void {
    this.socket?.emit('location_update', location);
  }

  requestLocation(data: any): void {
    this.socket?.emit('location_request', data);
  }

  sendMessage(data: any): void {
    this.socket?.emit('message_send', data);
  }

  sendTyping(data: any): void {
    this.socket?.emit('message_typing', data);
  }

  sendEmergencySOS(data: any): void {
    this.socket?.emit('emergency_sos', data);
  }

  cancelEmergency(data: any): void {
    this.socket?.emit('emergency_cancel', data);
  }

  updateStatus(status: string): void {
    this.socket?.emit('status_update', { status });
  }

  sendHeartbeat(): void {
    this.socket?.emit('heartbeat');
  }

  requestConfig(): void {
    this.socket?.emit('config_request');
  }

  updateConfig(data: any): void {
    this.socket?.emit('config_update', data);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const webSocketService = new WebSocketService();