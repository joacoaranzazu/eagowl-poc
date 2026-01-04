import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as ReduxProvider } from 'react-redux';
import { persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider as TamaguiProvider } from 'tamagui';

import { store } from '@/store';
import { AppNavigator } from '@/navigation/AppNavigator';
import { tamaguiConfig } from '@/utils/tamagui';
import { NotificationService } from '@/services/NotificationService';
import { LocationService } from '@/services/LocationService';

const persistor = persistStore(store);

export default function App() {
  React.useEffect(() => {
    // Initialize services
    NotificationService.initialize();
    LocationService.initialize();
  }, []);

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TamaguiProvider config={tamaguiConfig}>
          <SafeAreaProvider>
            <NavigationContainer>
              <StatusBar style="light" backgroundColor="#1a1a1a" />
              <AppNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </TamaguiProvider>
      </PersistGate>
    </ReduxProvider>
  );
}