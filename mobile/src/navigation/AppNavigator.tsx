import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';

import { RootState } from '@/store';
import LoginScreen from '@/screens/auth/LoginScreen';
import HomeScreen from '@/screens/home/HomeScreen';
import PTTScreen from '@/screens/ptt/PTTScreen';
import MessageScreen from '@/screens/messages/MessageScreen';
import MapScreen from '@/screens/map/MapScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import EmergencyScreen from '@/screens/emergency/EmergencyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#00ff88',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              {/* Add icon component here */}
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="PTT" 
        component={PTTScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              {/* Add PTT icon component here */}
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessageScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              {/* Add message icon component here */}
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              {/* Add map icon component here */}
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              {/* Add settings icon component here */}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Stack Navigator
const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen 
        name="Emergency" 
        component={EmergencyScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a1a',
    borderTopColor: '#333',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 5,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;