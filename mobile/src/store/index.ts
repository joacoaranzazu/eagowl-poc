import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

import authSlice from './slices/authSlice';
import pttSlice from './slices/pttSlice';
import locationSlice from './slices/locationSlice';
import messageSlice from './slices/messageSlice';
import emergencySlice from './slices/emergencySlice';
import settingsSlice from './slices/settingsSlice';
import connectionSlice from './slices/connectionSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings'], // Only persist auth and settings
  blacklist: ['ptt', 'location', 'message', 'emergency', 'connection']
};

const rootReducer = combineReducers({
  auth: authSlice,
  ptt: pttSlice,
  location: locationSlice,
  message: messageSlice,
  emergency: emergencySlice,
  settings: settingsSlice,
  connection: connectionSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['connection.socket'],
      },
    }),
  devTools: __DEV__,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;