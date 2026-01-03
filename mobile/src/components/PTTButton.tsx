import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Audio } from 'expo-av';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { 
  transmissionStarted, 
  transmissionEnded,
  setVolume,
  toggleMute,
  setError,
  setGroups 
} from '@/store/slices/pttSlice';
import { updateStatus } from '@/store/slices/authSlice';
import { webSocketService } from '@/services/WebSocketService';

interface PTTState {
  isTransmitting: boolean;
  isReceiving: boolean;
  currentSession: any;
  volume: number;
  isMuted: boolean;
}

const PTTButton: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    isTransmitting, 
    isReceiving, 
    currentSession, 
    volume, 
    isMuted,
    groups,
    error 
  } = useSelector((state: RootState) => state.ptt);
  
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [pttState, setPttState] = useState<PTTState>({
    isTransmitting: false,
    isReceiving: false,
    currentSession: null,
    volume: 0.8,
    isMuted: false,
  });
  
  const buttonRef = useRef<View>(null);
  const [activeGroup, setActiveGroup] = useState<string>('');
  const audioRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Initialize audio recording
  useEffect(() => {
    initializeAudio();
    return () => {
      cleanupAudio();
    };
  }, []);

  // Update local state when Redux state changes
  useEffect(() => {
    setPttState({
      isTransmitting,
      isReceiving,
      currentSession,
      volume,
      isMuted,
    });
  }, [isTransmitting, isReceiving, currentSession, volume, isMuted]);

  const initializeAudio = async () => {
    try {
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status === 'granted') {
        // Create audio recording instance
        const recording = new Audio.Recording({
          allowsRecordingIOS: true,
          isMeteringEnabled: Platform.OS === 'ios',
          android: {
            extension: '.wav',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });

        audioRef.current = recording;
        console.log('Audio recording initialized successfully');
      } else {
        dispatch(setError('Audio permission denied'));
      }
    } catch (error) {
      console.error('Audio initialization failed:', error);
      dispatch(setError('Failed to initialize audio'));
    }
  };

  const cleanupAudio = async () => {
    try {
      if (audioRef.current && isRecording) {
        await audioRef.current.stopAsync();
        setIsRecording(false);
      }
      audioRef.current = null;
    } catch (error) {
      console.error('Audio cleanup failed:', error);
    }
  };

  const handlePTTStart = useCallback(async () => {
    if (!activeGroup) {
      dispatch(setError('Please select a group first'));
      return;
    }

    if (pttState.isTransmitting) {
      return; // Already transmitting
    }

    try {
      // Vibrate to indicate PTT start
      if (Platform.OS === 'android') {
        Vibration.vibrate(100);
      }

      // Start audio recording
      if (audioRef.current) {
        await audioRef.current.prepareToRecordAsync({
          android: {
            extension: '.aac',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
            sampleRate: 44100,
            numberOfChannels: 1, // Mono for PTT
            bitRate: 64000, // Lower bitrate for PTT
          },
        });

        await audioRef.current.startAsync();
        setIsRecording(true);
      }

      // Send PTT request to server
      webSocketService.requestPTT(activeGroup, 'VOICE');

      // Update local state immediately
      setPttState(prev => ({ ...prev, isTransmitting: true }));

      console.log('PTT transmission started');

    } catch (error) {
      console.error('PTT start failed:', error);
      dispatch(setError('Failed to start PTT transmission'));
    }
  }, [activeGroup, pttState.isTransmitting, dispatch]);

  const handlePTTEnd = useCallback(async () => {
    if (!pttState.isTransmitting || !currentSession) {
      return;
    }

    try {
      // Vibrate to indicate PTT end
      if (Platform.OS === 'android') {
        Vibration.vibrate(50);
      }

      // Stop audio recording
      if (audioRef.current && isRecording) {
        await audioRef.current.stopAndUnloadAsync();
        setIsRecording(false);
      }

      // Send PTT release to server
      webSocketService.releasePTT(currentSession.id);

      // Update local state immediately
      setPttState(prev => ({ ...prev, isTransmitting: false }));

      console.log('PTT transmission ended');

    } catch (error) {
      console.error('PTT end failed:', error);
      dispatch(setError('Failed to end PTT transmission'));
    }
  }, [pttState.isTransmitting, currentSession, isRecording, dispatch]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    dispatch(setVolume(newVolume));
  }, [dispatch]);

  const handleMuteToggle = useCallback(() => {
    dispatch(toggleMute());
  }, [dispatch]);

  const handleGroupSelect = useCallback((groupId: string) => {
    setActiveGroup(groupId);
  }, []);

  // Send audio data to server (simulated - real implementation would stream audio)
  useEffect(() => {
    let audioDataInterval: NodeJS.Timeout;

    if (isRecording && currentSession) {
      // Simulate audio data transmission
      audioDataInterval = setInterval(() => {
        // In a real implementation, you would:
        // 1. Read audio data from recording
        // 2. Encode/compress the audio data
        // 3. Send via WebSocket
        const mockAudioData = new ArrayBuffer(1024); // Mock audio packet
        webSocketService.sendAudioData(currentSession.id, mockAudioData, Date.now());
      }, 100); // Send audio packets every 100ms
    }

    return () => {
      if (audioDataInterval) {
        clearInterval(audioDataInterval);
      }
    };
  }, [isRecording, currentSession]);

  // Dynamic styles based on state
  const getButtonStyle = () => {
    let backgroundColor = '#1a1a1a';
    let borderColor = '#333';
    let shadowColor = 'transparent';

    if (pttState.isTransmitting) {
      backgroundColor = '#00ff88';
      borderColor = '#00ff88';
      shadowColor = '#00ff88';
    } else if (pttState.isReceiving) {
      backgroundColor = '#ff6b35';
      borderColor = '#ff6b35';
      shadowColor = '#ff6b35';
    } else if (activeGroup) {
      backgroundColor = '#333';
      borderColor = '#666';
      shadowColor = 'rgba(0, 255, 136, 0.3)';
    }

    return {
      ...styles.pttButton,
      backgroundColor,
      borderColor,
      shadowColor: shadowColor,
      shadowOffset: {
        width: 0,
        height: shadowColor !== 'transparent' ? 4 : 0,
      },
      shadowOpacity: shadowColor !== 'transparent' ? 0.8 : 0,
      shadowRadius: 8,
    };
  };

  const getStatusIndicator = () => {
    if (pttState.isTransmitting) return '🎙️ TRANSMITTING';
    if (pttState.isReceiving) return '🔊 RECEIVING';
    if (activeGroup) return '🎤 READY';
    return '⚪ NO GROUP';
  };

  const getStatusStyle = () => {
    if (pttState.isTransmitting) return styles.statusTransmitting;
    if (pttState.isReceiving) return styles.statusReceiving;
    if (activeGroup) return styles.statusReady;
    return styles.statusNoGroup;
  };

  return (
    <View style={styles.container}>
      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        <Text style={getStatusStyle()}>
          {getStatusIndicator()}
        </Text>
        {activeGroup && (
          <Text style={styles.groupIndicator}>
            Group: {groups.find(g => g.id === activeGroup)?.name || 'Unknown'}
          </Text>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Group Selector */}
      <View style={styles.groupContainer}>
        <Text style={styles.groupLabel}>Select Group:</Text>
        <ScrollView horizontal style={styles.groupScroll} showsHorizontalScrollIndicator={false}>
          {groups.map(group => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupOption,
                activeGroup === group.id && styles.groupOptionActive
              ]}
              onPress={() => handleGroupSelect(group.id)}
            >
              <Text style={[
                styles.groupOptionText,
                activeGroup === group.id && styles.groupOptionTextActive
              ]}>
                {group.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main PTT Button */}
      <View style={styles.pttContainer}>
        <TouchableOpacity
          ref={buttonRef}
          style={getButtonStyle()}
          onPressIn={handlePTTStart}
          onPressOut={handlePTTEnd}
          activeOpacity={0.9}
          disabled={!activeGroup}
        >
          <View style={styles.pttButtonContent}>
            {pttState.isTransmitting && (
              <ActivityIndicator size="large" color="#1a1a1a" />
            )}
            <Text style={[
              styles.pttButtonText,
              pttState.isTransmitting && styles.pttButtonTextTransmitting
            ]}>
              {pttState.isTransmitting ? '●' : '○'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Volume Indicator */}
        <View style={styles.volumeContainer}>
          <Text style={styles.volumeLabel}>🔊</Text>
          <View style={styles.volumeBar}>
            <View 
              style={[
                styles.volumeLevel,
                { width: `${volume * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.volumeText}>
            {Math.round(volume * 100)}%
          </Text>
        </View>

        {/* Mute Button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleMuteToggle}
        >
          <Text style={styles.controlButtonText}>
            {pttState.isMuted ? '🔇' : '🔈'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Touch Feedback Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Press and hold the button to transmit. Release to stop.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTransmitting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ff88',
    textTransform: 'uppercase' as const,
  },
  statusReceiving: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b35',
    textTransform: 'uppercase' as const,
  },
  statusReady: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase' as const,
  },
  statusNoGroup: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    textTransform: 'uppercase' as const,
  },
  groupIndicator: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    fontSize: 14,
  },
  groupContainer: {
    marginBottom: 30,
    width: '100%',
    paddingHorizontal: 20,
  },
  groupLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  groupScroll: {
    marginBottom: 10,
  },
  groupOption: {
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  groupOptionActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  groupOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  groupOptionTextActive: {
    color: '#1a1a1a',
  },
  pttContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  pttButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pttButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pttButtonText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#666',
  },
  pttButtonTextTransmitting: {
    color: '#1a1a1a',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#333',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  volumeLabel: {
    fontSize: 20,
    marginRight: 10,
  },
  volumeBar: {
    width: 100,
    height: 6,
    backgroundColor: '#555',
    borderRadius: 3,
    marginRight: 10,
  },
  volumeLevel: {
    height: '100%',
    backgroundColor: '#00ff88',
    borderRadius: 3,
  },
  volumeText: {
    fontSize: 12,
    color: '#999',
    minWidth: 35,
    textAlign: 'right',
  },
  controlButton: {
    backgroundColor: '#333',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  controlButtonText: {
    fontSize: 24,
  },
  instructionsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PTTButton;