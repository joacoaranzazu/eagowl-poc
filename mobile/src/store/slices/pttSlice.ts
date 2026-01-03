import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PTTSession {
  id: string;
  groupId: string;
  groupName: string;
  callerId: string;
  callerName: string;
  sessionType: 'VOICE' | 'VIDEO' | 'HYBRID';
  startTime: string;
  isCaller: boolean;
  isActive: boolean;
  participants: number;
}

interface PTTState {
  currentSession: PTTSession | null;
  isTransmitting: boolean;
  isReceiving: boolean;
  transmissionQueue: Array<{
    userId: string;
    username: string;
    timestamp: string;
  }>;
  volume: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  groups: Array<{
    id: string;
    name: string;
    description?: string;
    permissions: 'ADMIN' | 'MODERATOR' | 'MEMBER' | 'GUEST';
    priority: number;
    isActive: boolean;
  }>;
  recentSessions: PTTSession[];
  error: string | null;
  lastTransmissionTime: string | null;
}

const initialState: PTTState = {
  currentSession: null,
  isTransmitting: false,
  isReceiving: false,
  transmissionQueue: [],
  volume: 0.8,
  isMuted: false,
  isSpeakerOn: true,
  groups: [],
  recentSessions: [],
  error: null,
  lastTransmissionTime: null,
};

const pttSlice = createSlice({
  name: 'ptt',
  initialState,
  reducers: {
    sessionStarted: (state, action: PayloadAction<PTTSession>) => {
      state.currentSession = action.payload;
      state.isReceiving = !action.payload.isCaller;
      state.error = null;
    },
    sessionEnded: (state) => {
      if (state.currentSession) {
        state.recentSessions.unshift(state.currentSession);
        if (state.recentSessions.length > 50) {
          state.recentSessions = state.recentSessions.slice(0, 50);
        }
      }
      state.currentSession = null;
      state.isTransmitting = false;
      state.isReceiving = false;
    },
    transmissionStarted: (state) => {
      state.isTransmitting = true;
      state.lastTransmissionTime = new Date().toISOString();
    },
    transmissionEnded: (state) => {
      state.isTransmitting = false;
    },
    receivingStarted: (state, action: PayloadAction<{ userId: string; username: string }>) => {
      state.isReceiving = true;
      if (!state.transmissionQueue.find(t => t.userId === action.payload.userId)) {
        state.transmissionQueue.push({
          ...action.payload,
          timestamp: new Date().toISOString(),
        });
      }
    },
    receivingEnded: (state, action: PayloadAction<{ userId: string }>) => {
      state.isReceiving = false;
      state.transmissionQueue = state.transmissionQueue.filter(
        t => t.userId !== action.payload.userId
      );
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    toggleSpeaker: (state) => {
      state.isSpeakerOn = !state.isSpeakerOn;
    },
    setSpeaker: (state, action: PayloadAction<boolean>) => {
      state.isSpeakerOn = action.payload;
    },
    setGroups: (state, action: PayloadAction<PTTState['groups']>) => {
      state.groups = action.payload;
    },
    updateGroupStatus: (state, action: PayloadAction<{ groupId: string; isActive: boolean }>) => {
      const group = state.groups.find(g => g.id === action.payload.groupId);
      if (group) {
        group.isActive = action.payload.isActive;
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearTransmissionQueue: (state) => {
      state.transmissionQueue = [];
    },
  },
});

export const {
  sessionStarted,
  sessionEnded,
  transmissionStarted,
  transmissionEnded,
  receivingStarted,
  receivingEnded,
  setVolume,
  toggleMute,
  setMuted,
  toggleSpeaker,
  setSpeaker,
  setGroups,
  updateGroupStatus,
  setError,
  clearError,
  clearTransmissionQueue,
} = pttSlice.actions;

export default pttSlice.reducer;