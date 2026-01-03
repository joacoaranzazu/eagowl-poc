import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Switch, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { 
  locationUpdated,
  setTrackingEnabled,
  addLocationToHistory,
  setLocationPermission
} from '@/store/slices/locationSlice';
import { setError } from '@/store/slices/pttSlice';
import { LocationService } from '@/services/LocationService';
import { webSocketService } from '@/services/WebSocketService';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

const LocationManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    currentLocation, 
    trackingEnabled, 
    locationHistory, 
    hasPermission 
  } = useSelector((state: RootState) => state.location);
  
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedInterval, setSelectedInterval] = useState(5000); // 5 seconds default

  // Initialize location service
  useEffect(() => {
    initializeLocationService();
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, []);

  // Start location updates when tracking is enabled
  useEffect(() => {
    if (trackingEnabled && isTracking) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [trackingEnabled, isTracking]);

  const initializeLocationService = async () => {
    try {
      const hasPermission = await LocationService.requestPermissions();
      dispatch(setLocationPermission(hasPermission));
      
      if (hasPermission) {
        console.log('Location permission granted');
      } else {
        Alert.alert(
          'Permission Required',
          'Location permission is required for GPS tracking. Please enable it in device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => openAppSettings() }
          ]
        );
      }
    } catch (error) {
      console.error('Location initialization failed:', error);
      dispatch(setError('Failed to initialize location service'));
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('Starting location tracking...');
      
      const success = await LocationService.startTracking(selectedInterval);
      
      if (success) {
        setIsTracking(true);
        
        // Set up periodic location requests
        const interval = setInterval(() => {
          requestLocationUpdate();
        }, selectedInterval);
        
        setTrackingInterval(interval);
        
        // Get initial location
        const initialLocation = await LocationService.getCurrentLocation();
        if (initialLocation) {
          handleLocationUpdate(initialLocation);
        }
        
        console.log('Location tracking started successfully');
      } else {
        dispatch(setError('Failed to start location tracking'));
      }
    } catch (error) {
      console.error('Start location tracking failed:', error);
      dispatch(setError('Failed to start location tracking'));
    }
  };

  const stopLocationTracking = async () => {
    try {
      console.log('Stopping location tracking...');
      
      await LocationService.stopTracking();
      setIsTracking(false);
      
      if (trackingInterval) {
        clearInterval(trackingInterval);
        setTrackingInterval(null);
      }
      
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Stop location tracking failed:', error);
      dispatch(setError('Failed to stop location tracking'));
    }
  };

  const requestLocationUpdate = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        handleLocationUpdate(location);
      }
    } catch (error) {
      console.error('Location request failed:', error);
    }
  };

  const handleLocationUpdate = useCallback((locationData: LocationData) => {
    try {
      // Update Redux store
      dispatch(locationUpdated(locationData));
      dispatch(addLocationToHistory(locationData));
      
      // Send to server via WebSocket
      if (webSocketService.isConnected()) {
        webSocketService.sendLocationUpdate({
          ...locationData,
          locationSource: 'gps'
        });
      }
      
      setLastUpdate(new Date());
      
      console.log('Location update processed:', locationData);
    } catch (error) {
      console.error('Location update handling failed:', error);
    }
  }, [dispatch]);

  const handleTrackingToggle = useCallback(async () => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Location permission is required for GPS tracking.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Request Permission', onPress: initializeLocationService }
        ]
      );
      return;
    }

    if (isTracking) {
      await stopLocationTracking();
      dispatch(setTrackingEnabled(false));
    } else {
      dispatch(setTrackingEnabled(true));
    }
  }, [hasPermission, isTracking]);

  const handleIntervalChange = (interval: number) => {
    setSelectedInterval(interval);
    
    // Restart tracking if it's currently active
    if (isTracking) {
      stopLocationTracking();
      setTimeout(() => {
        startLocationTracking();
      }, 100);
    }
  };

  const openAppSettings = () => {
    // For iOS
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      // For Android, we would need to use the package name
      // This would require additional configuration
      Alert.alert(
        'Enable Location',
        'Please enable location permission in your device settings:\n\n' +
        '1. Go to Settings\n' +
        '2. Apps & notifications\n' +
        '3. EAGOWL-POC\n' +
        '4. Permissions\n' +
        '5. Enable Location permission',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const clearLocationHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear location history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            // Dispatch action to clear history
            // This would be implemented in the location slice
            console.log('Location history cleared');
          }
        }
      ]
    );
  };

  const formatLocationTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getTrackingStatus = () => {
    if (!hasPermission) return '🚫 No Permission';
    if (!trackingEnabled) return '⏸️ Tracking Off';
    if (isTracking) return '📍 Tracking Active';
    return '❓ Tracking Paused';
  };

  const getAccuracyColor = (accuracy?: number) => {
    if (!accuracy) return '#999';
    if (accuracy < 10) return '#00ff88'; // Excellent
    if (accuracy < 50) return '#ffaa00'; // Good
    return '#ff4444'; // Poor
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ GPS Tracking</Text>
        <Text style={styles.subtitle}>
          Status: {getTrackingStatus()}
        </Text>
      </View>

      {/* Current Location Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📍 Current Location</Text>
          {lastUpdate && (
            <Text style={styles.lastUpdate}>
              Updated: {formatLocationTime(lastUpdate.toISOString())}
            </Text>
          )}
        </View>
        
        {currentLocation ? (
          <View style={styles.locationContent}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Latitude:</Text>
              <Text style={styles.locationValue}>
                {currentLocation.latitude.toFixed(6)}°
              </Text>
            </View>
            
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Longitude:</Text>
              <Text style={styles.locationValue}>
                {currentLocation.longitude.toFixed(6)}°
              </Text>
            </View>
            
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Accuracy:</Text>
              <Text 
                style={[
                  styles.locationValue, 
                  { color: getAccuracyColor(currentLocation.accuracy) }
                ]}
              >
                {currentLocation.accuracy?.toFixed(0)}m
              </Text>
            </View>
            
            {currentLocation.speed && (
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Speed:</Text>
                <Text style={styles.locationValue}>
                  {(currentLocation.speed * 3.6).toFixed(1)} km/h
                </Text>
              </View>
            )}
            
            {currentLocation.altitude && (
              <View style={styles.locationRow}>
                <Text style={styles.locationLabel}>Altitude:</Text>
                <Text style={styles.locationValue}>
                  {currentLocation.altitude.toFixed(0)}m
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noLocationContent}>
            <ActivityIndicator size="large" color="#666" />
            <Text style={styles.noLocationText}>
              Waiting for location...
            </Text>
          </View>
        )}
      </View>

      {/* Tracking Controls */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>⚙️ Tracking Controls</Text>
        </View>
        
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Enable Tracking:</Text>
          <Switch
            value={trackingEnabled}
            onValueChange={handleTrackingToggle}
            trackColor={{ false: '#666', true: '#00ff88' }}
            thumbColor={{ false: '#fff', true: '#fff' }}
            ios_backgroundColor="#333"
          />
        </View>
        
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Update Interval:</Text>
          <View style={styles.intervalButtons}>
            {[1000, 5000, 10000, 30000].map(interval => (
              <TouchableOpacity
                key={interval}
                style={[
                  styles.intervalButton,
                  selectedInterval === interval && styles.intervalButtonActive
                ]}
                onPress={() => handleIntervalChange(interval)}
              >
                <Text style={[
                  styles.intervalButtonText,
                  selectedInterval === interval && styles.intervalButtonTextActive
                ]}>
                  {interval / 1000}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Location History */}
      <View style={[styles.card, styles.historyCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📜 Location History</Text>
          <TouchableOpacity onPress={clearLocationHistory}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.historyContent}>
          {locationHistory.slice(0, 5).map((location, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyTime}>
                <Text style={styles.historyTimeText}>
                  {formatLocationTime(location.timestamp)}
                </Text>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyLocationText}>
                  {formatCoordinates(location.latitude, location.longitude)}
                </Text>
                {location.accuracy && (
                  <Text style={styles.historyAccuracyText}>
                    ±{location.accuracy}m
                  </Text>
                )}
              </View>
            </View>
          ))}
          
          {locationHistory.length === 0 && (
            <Text style={styles.noHistoryText}>
              No location history available
            </Text>
          )}
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Location Information</Text>
        <Text style={styles.infoText}>
          • GPS provides coordinates with varying accuracy
        </Text>
        <Text style={styles.infoText}>
          • Accuracy depends on satellite visibility
        </Text>
        <Text style={styles.infoText}>
          • Indoor locations may be less accurate
        </Text>
        <Text style={styles.infoText}>
          • Battery usage increases with shorter intervals
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#00ff88',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyCard: {
    maxHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
  },
  locationContent: {
    // No additional styles needed
  },
  noLocationContent: {
    alignItems: 'center',
    padding: 20,
  },
  noLocationText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  locationValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 16,
    color: '#fff',
  },
  intervalButtons: {
    flexDirection: 'row',
  },
  intervalButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#555',
  },
  intervalButtonActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  intervalButtonText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  intervalButtonTextActive: {
    color: '#1a1a1a',
  },
  historyContent: {
    // No additional styles needed
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyTime: {
    flex: 0,
  },
  historyTimeText: {
    fontSize: 12,
    color: '#999',
    width: 60,
  },
  historyDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  historyLocationText: {
    fontSize: 12,
    color: '#fff',
    marginRight: 8,
  },
  historyAccuracyText: {
    fontSize: 10,
    color: '#666',
  },
  noHistoryText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  clearButton: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default LocationManager;