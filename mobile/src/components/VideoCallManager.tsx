import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { 
  setError,
  sessionStarted,
  sessionEnded
} from '@/store/slices/pttSlice';
import { webSocketService } from '@/services/WebSocketService';

// WebRTC imports
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  RTCIceServer,
  mediaDevices,
} from 'react-native-webrtc';

interface VideoCallState {
  isInCall: boolean;
  isInitiator: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  callStatus: 'idle' | 'connecting' | 'connected' | 'ended' | 'error';
  error: string | null;
}

const VideoCallManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentGroup, groups } = useSelector((state: RootState) => state.ptt);
  
  const [callState, setCallState] = useState<VideoCallState>({
    isInCall: false,
    isInitiator: false,
    isMuted: false,
    isSpeakerOn: true,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    callStatus: 'idle',
    error: null,
  });
  
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [localVideoView, setLocalVideoView] = useState<string>('');
  const [remoteVideoView, setRemoteVideoView] = useState<string>('');

  const localPeerRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<RTCView | null>(null);
  const localVideoRef = useRef<RTCView | null>(null);

  // STUN/TURN servers configuration
  const iceServers: RTCIceServer[] = [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'turn:turn.your-server.com:3478',
      username: 'eagowl_user',
      credential: 'eagowl_password',
    },
  ];

  // Initialize WebRTC
  useEffect(() => {
    initializeWebRTC();
    return () => {
      cleanupWebRTC();
    };
  }, []);

  const initializeWebRTC = async () => {
    try {
      console.log('Initializing WebRTC...');
      
      // Create peer connection
      const configuration = {
        iceServers,
        iceCandidatePoolSize: 10,
      };

      const pc = new RTCPeerConnection(configuration);
      localPeerRef.current = pc;

      // Setup event handlers
      pc.onicecandidate = handleIceCandidate;
      pc.onaddstream = handleRemoteStream;
      pc.oniceconnectionstatechange = handleIceConnectionStateChange;
      pc.onsignalingstatechange = handleSignalingStateChange;
      
      console.log('WebRTC initialized successfully');
    } catch (error) {
      console.error('WebRTC initialization failed:', error);
      dispatch(setError('Failed to initialize video calling'));
    }
  };

  const cleanupWebRTC = () => {
    if (localPeerRef.current) {
      localPeerRef.current.close();
      localPeerRef.current = null;
    }
    
    // Stop local stream
    if (callState.localStream) {
      callState.localStream.getTracks().forEach(track => {
        track.stop();
      });
    }
  };

  const handleIceCandidate = (candidate: RTCIceCandidate) => {
    console.log('ICE candidate:', candidate);
    
    // Send candidate to signaling server
    webSocketService.sendSignalingMessage({
      type: 'ice-candidate',
      candidate: {
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid,
        candidate: candidate.candidate,
      },
    });
  };

  const handleRemoteStream = (event: any) => {
    console.log('Remote stream received:', event.stream);
    
    setCallState(prev => ({
      ...prev,
      remoteStream: event.stream,
    }));
  };

  const handleIceConnectionStateChange = () => {
    if (!localPeerRef.current) return;

    const connectionState = localPeerRef.current.iceConnectionState;
    console.log('ICE connection state:', connectionState);

    switch (connectionState) {
      case 'connected':
        setCallState(prev => ({
          ...prev,
          callStatus: 'connected',
        }));
        break;
      case 'failed':
      case 'disconnected':
      case 'closed':
        setCallState(prev => ({
          ...prev,
          callStatus: connectionState === 'failed' ? 'error' : 'ended',
        }));
        break;
    }
  };

  const handleSignalingStateChange = () => {
    if (!localPeerRef.current) return;

    console.log('Signaling state:', localPeerRef.current.signalingState);
  };

  const setupLocalStream = async () => {
    try {
      console.log('Setting up local media stream...');
      
      // Get user media
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user', // Front camera
        },
      });

      setCallState(prev => ({
        ...prev,
        localStream: stream,
      }));

      // Add stream to peer connection
      if (localPeerRef.current) {
        localPeerRef.current.addStream(stream);
      }

      console.log('Local stream setup successful');
    } catch (error) {
      console.error('Failed to setup local stream:', error);
      dispatch(setError('Failed to access camera/microphone'));
    }
  };

  const startVideoCall = async (isInitiator: boolean) => {
    try {
      console.log('Starting video call...', { isInitiator });

      setCallState(prev => ({
        ...prev,
        isInCall: true,
        isInitiator,
        callStatus: 'connecting',
        error: null,
      }));

      // Setup local media stream
      await setupLocalStream();

      if (isInitiator) {
        // Create offer
        const offer = await localPeerRef.current!.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true,
        });

        await localPeerRef.current!.setLocalDescription(offer);

        // Send offer to signaling server
        webSocketService.sendSignalingMessage({
          type: 'video-offer',
          offer: localPeerRef.current!.localDescription,
          targetUserId,
          groupId: currentGroup?.id,
        });

        setCallState(prev => ({
          ...prev,
          callStatus: 'connected',
        }));
      }

    } catch (error) {
      console.error('Failed to start video call:', error);
      setCallState(prev => ({
        ...prev,
        callStatus: 'error',
        error: error.message,
      }));
    }
  };

  const handleIncomingVideoCall = useCallback(async (data: any) => {
    console.log('Incoming video call:', data);

    Alert.alert(
      'Incoming Video Call',
      `${data.callerName} is calling you via video`,
      [
        { text: 'Decline', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            setTargetUserId(data.callerId);
            await startVideoCall(false);
          },
        },
      ]
    );
  }, []);

  const endVideoCall = useCallback(async () => {
    console.log('Ending video call...');

    try {
      // Stop local stream
      if (callState.localStream) {
        callState.localStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      // Close peer connection
      if (localPeerRef.current) {
        localPeerRef.current.close();
      }

      // Notify signaling server
      webSocketService.sendSignalingMessage({
        type: 'video-hangup',
        targetUserId,
        groupId: currentGroup?.id,
      });

      setCallState(prev => ({
        ...prev,
        isInCall: false,
        isInitiator: false,
        localStream: null,
        remoteStream: null,
        peerConnection: null,
        callStatus: 'idle',
        error: null,
      }));

      dispatch(sessionEnded({}));

    } catch (error) {
      console.error('Failed to end video call:', error);
    }
  }, [callState.localStream, targetUserId, currentGroup, dispatch]);

  const toggleMute = useCallback(() => {
    if (!callState.localStream) return;

    const audioTrack = callState.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setCallState(prev => ({
        ...prev,
        isMuted: !audioTrack.enabled,
      }));
    }
  }, [callState.localStream]);

  const toggleSpeaker = useCallback(() => {
    // Speaker toggle would be handled by the device
    setCallState(prev => ({
      ...prev,
      isSpeakerOn: !prev.isSpeakerOn,
    }));
  }, []);

  const switchCamera = useCallback(async () => {
    try {
      if (!callState.localStream) return;

      const videoTrack = callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // Get current camera facing mode
        const currentFacingMode = videoTrack.getSettings().facingMode;
        
        // Switch camera
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        const newStream = await mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: newFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });

        // Replace the old track with the new one
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (localPeerRef.current) {
          const sender = localPeerRef.current.getSenders().find(
            s => s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        }

        // Update local stream
        callState.localStream.getTracks().forEach(track => track.stop());
        setCallState(prev => ({
          ...prev,
          localStream: newStream,
        }));
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
      dispatch(setError('Failed to switch camera'));
    }
  }, [callState.localStream, dispatch]);

  const getStatusColor = () => {
    switch (callState.callStatus) {
      case 'connecting': return '#ffaa00';
      case 'connected': return '#00ff88';
      case 'error': return '#ff4444';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (callState.callStatus) {
      case 'connecting': return '🔄 Connecting...';
      case 'connected': return '📹 Connected';
      case 'error': return '❌ Error';
      default: return '⭕️ Idle';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📹 Video Calling</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      {/* Call Status */}
      {callState.isInCall && (
        <View style={styles.callInfoContainer}>
          <Text style={styles.callInfo}>
            {callState.isInitiator ? 'Calling...' : 'In a call'}
          </Text>
          {targetUserId && (
            <Text style={styles.callTarget}>
              User: {targetUserId}
            </Text>
          )}
        </View>
      )}

      {/* Video Views */}
      {callState.isInCall && (
        <View style={styles.videoContainer}>
          {/* Remote Video */}
          <View style={styles.videoWrapper}>
            {callState.remoteStream ? (
              <RTCView
                ref={remoteVideoRef}
                streamURL={remoteVideoView}
                style={styles.remoteVideo}
                objectFit="cover"
                mirror={false}
                zOrder={1}
              />
            ) : (
              <View style={styles.noVideo}>
                <Text style={styles.noVideoText}>Waiting for remote video...</Text>
              </View>
            )}
          </View>

          {/* Local Video (Picture-in-Picture) */}
          <View style={styles.localVideoWrapper}>
            {callState.localStream ? (
              <RTCView
                ref={localVideoRef}
                streamURL={localVideoView}
                style={styles.localVideo}
                objectFit="cover"
                mirror={true}
                zOrder={2}
              />
            ) : (
              <View style={styles.noLocalVideo}>
                <Text style={styles.noVideoText}>Camera</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Control Panel */}
      {!callState.isInCall ? (
        <View style={styles.controlPanel}>
          <View style={styles.dialerContainer}>
            <Text style={styles.dialerLabel}>Target User ID:</Text>
            <TextInput
              style={styles.dialerInput}
              value={targetUserId}
              onChangeText={setTargetUserId}
              placeholder="Enter user ID"
              placeholderTextColor="#666"
            />
            
            <TouchableOpacity
              style={[styles.callButton, styles.startCallButton]}
              onPress={() => startVideoCall(true)}
              disabled={!targetUserId.trim()}
            >
              <Text style={styles.callButtonText}>📹 Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.inCallControls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endVideoCall}
          >
            <Text style={styles.controlButtonText}>📴</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleMute}
          >
            <Text style={styles.controlButtonText}>
              {callState.isMuted ? '🔇' : '🎤'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleSpeaker}
          >
            <Text style={styles.controlButtonText}>
              {callState.isSpeakerOn ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
          >
            <Text style={styles.controlButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error Display */}
      {callState.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{callState.error}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          • Ensure camera and microphone permissions are granted
        </Text>
        <Text style={styles.infoText}>
          • Good internet connection recommended for video calls
        </Text>
        <Text style={styles.infoText}>
          • Use WiFi for best quality and reduced data usage
        </Text>
      </View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#262626',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  callInfoContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#333',
  },
  callInfo: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 5,
  },
  callTarget: {
    fontSize: 14,
    color: '#00ff88',
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 3,
  },
  remoteVideo: {
    flex: 1,
    width: null,
    height: null,
  },
  localVideoWrapper: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00ff88',
  },
  localVideo: {
    flex: 1,
    width: null,
    height: null,
  },
  noVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  noVideoText: {
    color: '#666',
    fontSize: 14,
  },
  noLocalVideo: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
  controlPanel: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dialerContainer: {
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
  },
  dialerLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  dialerInput: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    minWidth: 200,
    marginBottom: 20,
  },
  callButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCallButton: {
    backgroundColor: '#00ff88',
  },
  endCallButton: {
    backgroundColor: '#ff4444',
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  inCallControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#262626',
  },
  controlButton: {
    backgroundColor: '#333',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  controlButtonText: {
    fontSize: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    margin: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    fontSize: 14,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#1f1f1f',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 4,
  },
});

export default VideoCallManager;