import * as ExpoLocation from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { store } from '@/store';
import { 
  locationUpdated,
  setLocationPermission,
  setTrackingEnabled,
  addLocationToHistory 
} from '@/store/slices/locationSlice';
import { webSocketService } from './WebSocketService';

const LOCATION_TASK_NAME = 'background-location-tracking';
const LOCATION_INTERVAL = 5000; // 5 seconds

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export class LocationService {
  private isTracking = false;
  private watchId: ExpoLocation.LocationSubscription | null = null;
  private lastLocation: ExpoLocation.LocationObject | null = null;

  static async initialize(): Promise<void> {
    // Define background task
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error, executionInfo }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }

      if (executionInfo.taskId === LOCATION_TASK_NAME) {
        // Handle background location updates
        console.log('Background location task executed');
      }
    });

    // Check if task is already defined
    const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      console.log('Location task defined');
    }
  }

  static async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground permissions first
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.error('Foreground location permission denied');
        store.dispatch(setLocationPermission(false));
        return false;
      }

      // Request background permissions
      if (status === 'granted') {
        const { status: backgroundStatus } = await ExpoLocation.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission denied');
        }
      }

      store.dispatch(setLocationPermission(true));
      return true;
    } catch (error) {
      console.error('Location permission request error:', error);
      store.dispatch(setLocationPermission(false));
      return false;
    }
  }

  static async checkPermissions(): Promise<boolean> {
    try {
      const foregroundStatus = await ExpoLocation.getForegroundPermissionsAsync();
      const backgroundStatus = await ExpoLocation.getBackgroundPermissionsAsync();
      
      return foregroundStatus.status === 'granted';
    } catch (error) {
      console.error('Location permission check error:', error);
      return false;
    }
  }

  static async startTracking(interval: number = LOCATION_INTERVAL): Promise<boolean> {
    try {
      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return false;
        }
      }

      if (this.isTracking) {
        console.log('Location tracking already active');
        return true;
      }

      // Start location updates
      this.watchId = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.High,
          timeInterval: interval,
          distanceInterval: 10, // minimum 10 meters
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      this.isTracking = true;
      store.dispatch(setTrackingEnabled(true));

      // Register background task
      await this.registerBackgroundTask();

      console.log('✅ Location tracking started');
      return true;
    } catch (error) {
      console.error('Start location tracking error:', error);
      return false;
    }
  }

  static async stopTracking(): Promise<void> {
    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      this.isTracking = false;
      store.dispatch(setTrackingEnabled(false));

      // Unregister background task
      await this.unregisterBackgroundTask();

      console.log('✅ Location tracking stopped');
    } catch (error) {
      console.error('Stop location tracking error:', error);
    }
  }

  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermissions = await this.checkPermissions();
      if (!hasPermissions) {
        throw new Error('Location permissions not granted');
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      return this.formatLocationData(location);
    } catch (error) {
      console.error('Get current location error:', error);
      return null;
    }
  }

  private static handleLocationUpdate(location: ExpoLocation.LocationObject): void {
    const locationData = this.formatLocationData(location);
    
    if (locationData) {
      // Update Redux store
      store.dispatch(locationUpdated(locationData));
      
      // Add to history
      store.dispatch(addLocationToHistory(locationData));
      
      // Send to server via WebSocket
      if (webSocketService.isConnected()) {
        webSocketService.sendLocationUpdate({
          ...locationData,
          locationSource: 'gps',
        });
      }

      this.lastLocation = location;
    }
  }

  private static formatLocationData(location: ExpoLocation.LocationObject): LocationData | null {
    if (!location.coords) {
      return null;
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      speed: location.coords.speed,
      heading: location.coords.heading,
      timestamp: new Date().toISOString(),
    };
  }

  private static async registerBackgroundTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(LOCATION_TASK_NAME, {
          minimumInterval: 15 * 60 * 1000, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
    } catch (error) {
      console.error('Register background task error:', error);
    }
  }

  private static async unregisterBackgroundTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      console.error('Unregister background task error:', error);
    }
  }

  static getLastLocation(): LocationData | null {
    return this.lastLocation ? this.formatLocationData(this.lastLocation) : null;
  }

  static isLocationTracking(): boolean {
    return this.isTracking;
  }

  static async getProviderInfo(): Promise<ExpoLocation.LocationProviderInfo | null> {
    try {
      return await ExpoLocation.getProviderInfoAsync();
    } catch (error) {
      console.error('Get provider info error:', error);
      return null;
    }
  }
}