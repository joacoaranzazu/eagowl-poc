import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';

interface ConnectionState {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastConnected: string | null;
  reconnectAttempts: number;
}

const initialState: ConnectionState = {
  socket: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  lastConnected: null,
  reconnectAttempts: 0,
};

// Async thunks
export const connectWebSocket = createAsyncThunk(
  'connection/connect',
  async (params: { token: string; deviceId: string }, { rejectWithValue }) => {
    try {
      return new Promise<{ socket: Socket }>((resolve, reject) => {
        const socket = io(process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:9998', {
          auth: {
            token: params.token,
            deviceId: params.deviceId,
          },
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          resolve({ socket });
        });

        socket.on('connect_error', (error) => {
          reject(error);
        });

        // Handle server disconnection
        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
        });
      });
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Connection failed');
    }
  }
);

export const disconnectWebSocket = createAsyncThunk(
  'connection/disconnect',
  async (_, { getState }) => {
    const { connection } = getState() as { connection: ConnectionState };
    if (connection.socket) {
      connection.socket.disconnect();
    }
  }
);

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },
    updateLastConnected: (state) => {
      state.lastConnected = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectWebSocket.pending, (state) => {
        state.isConnecting = true;
        state.error = null;
      })
      .addCase(connectWebSocket.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.isConnected = true;
        state.socket = action.payload.socket;
        state.error = null;
        state.reconnectAttempts = 0;
        state.lastConnected = new Date().toISOString();
      })
      .addCase(connectWebSocket.rejected, (state, action) => {
        state.isConnecting = false;
        state.isConnected = false;
        state.error = action.payload as string;
        state.socket = null;
      })
      .addCase(disconnectWebSocket.fulfilled, (state) => {
        state.isConnected = false;
        state.socket = null;
        state.lastConnected = new Date().toISOString();
      });
  },
});

export const {
  clearError,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  updateLastConnected,
} = connectionSlice.actions;

export default connectionSlice.reducer;