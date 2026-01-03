import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'OPERATOR' | 'USER' | 'GUEST';
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY';
  avatar?: string;
  emergencyProfileId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  deviceId: string;
  deviceInfo: {
    platform: string;
    appVersion: string;
    capabilities: string[];
  };
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  deviceId: '',
  deviceInfo: {
    platform: '',
    appVersion: '1.0.0',
    capabilities: [],
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string; deviceId: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.deviceId = action.payload.deviceId;
      state.isAuthenticated = true;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
    },
    updateDeviceInfo: (state, action: PayloadAction<Partial<AuthState['deviceInfo']>>) => {
      state.deviceInfo = { ...state.deviceInfo, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setDeviceCapabilities: (state, action: PayloadAction<string[]>) => {
      state.deviceInfo.capabilities = action.payload;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  updateDeviceId,
  updateDeviceInfo,
  clearError,
  setDeviceCapabilities,
} = authSlice.actions;

export default authSlice.reducer;