import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import {
  setError,
  setEmergencyActive,
} from '@/store/slices/emergencySlice';
import { updateStatus } from '@/store/slices/authSlice';
import { webSocketService } from '@/services/WebSocketService';
import { LocationService } from '@/services/LocationService';

interface EmergencyAlert {
  id: string;
  alertType: 'SOS' | 'MAN_DOWN' | 'MEDICAL' | 'SAFETY' | 'COMMUNICATION_LOST';
  userId: string;
  username: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  timestamp: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'FALSE_ALARM';
}

const EmergencyManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    isEmergencyActive, 
    activeAlerts 
  } = useSelector((state: RootState) => state.emergency);
  const { user } = useSelector((state: RootState) => state.auth);

  const [isSOSPressed, setIsSOSPressed] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(0);
  const [lastSOSPress, setLastSOSPress] = useState<Date | null>(null);

  // Handle incoming emergency alerts
  useEffect(() => {
    const handleIncomingAlert = (alert: EmergencyAlert) => {
      Alert.alert(
        '🚨 Emergency Alert',
        `${alert.alertType} alert from ${alert.username}!\n\n${alert.notes || 'Emergency notification received'}`,
        [
          {
            text: 'View Location',
            onPress: () => showLocation(alert),
          },
          {
            text: 'Resolve',
            onPress: () => resolveAlert(alert.id),
            style: 'destructive',
          },
          {
            text: 'Dismiss',
            style: 'cancel',
          },
        ]
      );

      // Vibrate for emergency
      Vibration.vibrate([0, 500, 200, 500]);
    };

    // Set up WebSocket listener
    if (webSocketService.isConnected()) {
      webSocketService.on('emergency_alert', handleIncomingAlert);
    }

    return () => {
      // Cleanup listener
      webSocketService.off('emergency_alert', handleIncomingAlert);
    };
  }, [dispatch]);

  // SOS countdown timer
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (isSOSPressed) {
      setSosCountdown(10);
      
      countdownInterval = setInterval(() => {
        setSosCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      setSosCountdown(0);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [isSOSPressed]);

  const handleSOSPress = useCallback(async () => {
    const now = new Date();
    
    // Prevent spamming (minimum 5 seconds between SOS)
    if (lastSOSPress && (now.getTime() - lastSOSPress.getTime()) < 5000) {
      return;
    }

    setIsSOSPressed(true);
    setLastSOSPress(now);

    try {
      // Get current location
      const location = await LocationService.getCurrentLocation();
      
      // Send SOS to server
      webSocketService.sendEmergencySOS({
        alertType: 'SOS',
        notes: 'Manual SOS activation',
        location: location,
        timestamp: now.toISOString(),
      });

      // Update user status to emergency
      dispatch(updateStatus('EMERGENCY'));

      // Strong vibration pattern for SOS
      Vibration.vibrate([0, 200, 100, 200, 100, 200, 100]);

      Alert.alert(
        '🚨 EMERGENCY ACTIVATED',
        'SOS signal sent to all users and dispatch console!\n\nThey have been notified of your location and can provide assistance.',
        [
          {
            text: 'Cancel',
            onPress: () => cancelSOS(),
            style: 'destructive',
          },
          {
            text: 'Continue',
            style: 'default',
          },
        ]
      );

      console.log('SOS emergency activated');
    } catch (error) {
      console.error('SOS activation failed:', error);
      dispatch(setError('Failed to activate SOS emergency'));
    }
  }, [lastSOSPress, dispatch]);

  const cancelSOS = useCallback(() => {
    setIsSOSPressed(false);
    setSosCountdown(0);
    
    // Send cancel notification to server
    webSocketService.cancelEmergency({
      notes: 'SOS cancelled by user',
    });

    // Update user status back
    dispatch(updateStatus('ONLINE'));

    Alert.alert('SOS Cancelled', 'Emergency signal has been cancelled.');
    console.log('SOS emergency cancelled');
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    Alert.alert(
      'Resolve Emergency',
      'Are you sure you want to resolve this emergency alert?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Resolve',
          style: 'default',
          onPress: () => {
            webSocketService.cancelEmergency({
              alertId,
              notes: 'Emergency resolved by dispatcher',
            });
          },
        },
      ]
    );
  }, []);

  const showLocation = useCallback((alert: EmergencyAlert) => {
    if (!alert.location) {
      Alert.alert('Location', 'No location data available for this emergency alert.');
      return;
    }

    Alert.alert(
      'Emergency Location',
      `Coordinates: ${alert.location.latitude.toFixed(6)}, ${alert.location.longitude.toFixed(6)}\n\nTimestamp: ${new Date(alert.timestamp).toLocaleString()}\n\nUser: ${alert.username}`,
      [
        {
          text: 'Open Maps',
          onPress: () => {
            // Open maps app with coordinates
            const url = `https://maps.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}`;
            // This would require Linking library in a real app
            console.log('Would open:', url);
          },
        },
        {
          text: 'Close',
          style: 'default',
        },
      ]
    );
  }, []);

  const triggerManDown = useCallback(() => {
    // Simulate man-down detection (in real app, this would be triggered by sensors)
    const now = new Date();
    
    Alert.alert(
      '⚠️ Man Down Alert',
      'Man down detection has been triggered!\n\nThis will notify all emergency contacts and dispatchers.',
      [
        {
          text: 'Cancel Alert',
          style: 'destructive',
          onPress: () => {
            console.log('Man down alert cancelled');
          },
        },
        {
          text: 'Confirm Man Down',
          style: 'default',
          onPress: () => {
            webSocketService.sendEmergencySOS({
              alertType: 'MAN_DOWN',
              notes: 'Man down detected - no movement detected',
              timestamp: now.toISOString(),
            });
          },
        },
      ]
    );
  }, []);

  const getAlertTypeIcon = (alertType: string) => {
    switch (alertType) {
      case 'SOS': return '🆘';
      case 'MAN_DOWN': return '🚶';
      case 'MEDICAL': return '🚑';
      case 'SAFETY': return '⚠️';
      case 'COMMUNICATION_LOST': return '📶';
      default: return '🚨';
    }
  };

  const getAlertTypeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '#ff4444';
      case 'HIGH': return '#ff6b35';
      case 'MEDIUM': return '#ffaa00';
      case 'LOW': return '#ffcc00';
      default: return '#999999';
    }
  };

  const getStatusColor = () => {
    if (isSOSPressed) return '#ff4444';
    return '#1a1a1a';
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🚨 Emergency Manager</Text>
        <Text style={styles.subtitle}>
          {isSOSPressed ? 'SOS ACTIVE' : 'Monitoring Active'}
        </Text>
      </View>

      {/* SOS Button */}
      <View style={styles.sosContainer}>
        <TouchableOpacity
          style={[
            styles.sosButton,
            isSOSPressed && styles.sosButtonActive,
          ]}
          onPressIn={handleSOSPress}
          onPressOut={cancelSOS}
          activeOpacity={0.8}
        >
          <View style={styles.sosButtonContent}>
            {isSOSPressed && sosCountdown > 0 && (
              <ActivityIndicator size="large" color="#fff" />
            )}
            
            {!isSOSPressed && (
              <Text style={styles.sosButtonText}>🆘</Text>
            )}
            
            {isSOSPressed && sosCountdown > 0 && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>{sosCountdown}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.sosLabel}>
          {isSOSPressed ? 'HOLD TO CANCEL' : 'PRESS FOR SOS'}
        </Text>
      </View>

      {/* Manual Triggers */}
      <View style={styles.triggersContainer}>
        <View style={styles.triggerSection}>
          <Text style={styles.triggerTitle}>🚶 Man Down</Text>
          <TouchableOpacity
            style={styles.triggerButton}
            onPress={triggerManDown}
          >
            <Text style={styles.triggerButtonText}>Trigger Man Down</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.triggerSection}>
          <Text style={styles.triggerTitle}>🚑 Medical Emergency</Text>
          <TouchableOpacity
            style={styles.triggerButton}
            onPress={() => {
              webSocketService.sendEmergencySOS({
                alertType: 'MEDICAL',
                notes: 'Medical emergency reported',
              });
            }}
          >
            <Text style={styles.triggerButtonText}>Report Medical</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.triggerSection}>
          <Text style={styles.triggerTitle}>⚠️ Safety Alert</Text>
          <TouchableOpacity
            style={styles.triggerButton}
            onPress={() => {
              webSocketService.sendEmergencySOS({
                alertType: 'SAFETY',
                notes: 'Safety concern reported',
              });
            }}
          >
            <Text style={styles.triggerButtonText}>Report Safety</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <View style={styles.alertsContainer}>
          <Text style={styles.alertsTitle}>🚨 Active Emergencies</Text>
          
          {activeAlerts.slice(0, 5).map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertItem}
              onPress={() => showLocation(alert)}
            >
              <View style={styles.alertIcon}>
                <Text style={styles.alertIconText}>
                  {getAlertTypeIcon(alert.alertType)}
                </Text>
              </View>
              
              <View style={styles.alertContent}>
                <Text style={styles.alertType}>
                  {alert.alertType.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={styles.alertUser}>
                  {alert.username}
                </Text>
                <Text style={styles.alertNotes}>
                  {alert.notes || 'No notes'}
                </Text>
              </View>
              
              <View style={[
                styles.alertStatus,
                { backgroundColor: getAlertTypeColor(alert.priority) }
              ]}>
                <Text style={styles.alertStatusText}>
                  {alert.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          ))}
          
          {activeAlerts.length > 5 && (
            <TouchableOpacity style={styles.moreAlerts}>
              <Text style={styles.moreAlertsText}>
                +{activeAlerts.length - 5} more alerts
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>📋 Emergency Information</Text>
        <Text style={styles.instructionsText}>
          • SOS alerts notify all users and dispatch console
        </Text>
        <Text style={styles.instructionsText}>
          • Your current location is shared automatically
        </Text>
        <Text style={styles.instructionsText}>
          • Emergency contacts are notified immediately
        </Text>
        <Text style={styles.instructionsText}>
          • Dispatchers can view your location on maps
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b35',
    textTransform: 'uppercase' as const,
  },
  sosContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
  },
  sosButtonActive: {
    backgroundColor: '#ff6b35',
    transform: [{ scale: 1.1 }],
  },
  sosButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
  },
  countdownContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  sosLabel: {
    fontSize: 16,
    color: '#fff',
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  triggersContainer: {
    marginBottom: 30,
  },
  triggerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  triggerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  triggerButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  alertsContainer: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 15,
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIconText: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00ff88',
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  alertUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  alertNotes: {
    fontSize: 12,
    color: '#999',
    flex: 1,
    flexWrap: 'wrap',
  },
  alertStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  alertStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textTransform: 'uppercase' as const,
  },
  moreAlerts: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  moreAlertsText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default EmergencyManager;