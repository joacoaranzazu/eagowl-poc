import React, { useState, useCallback } from 'react';
import MapboxGL from '@rnmapbox/maps';
import Mapbox from 'rnmapbox-gl';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { locationHistory } from '@/store/slices/locationSlice';
import { View, StyleSheet, Text, Dimensions, TouchableOpacity } from 'react-native';

const { width, height } = Dimensions.get('window');

const MapScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { locations } = useSelector((state: RootState) => state.location);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState('streets');

  // Get current user location for centering
  const currentLocation = locations.length > 0 ? locations[0] : null;

  const handleMapStyleChange = useCallback(() => {
    const styles = ['streets', 'satellite', 'hybrid', 'light', 'dark'];
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    setMapStyle(styles[nextIndex]);
  }, [mapStyle]);

  const handleLocationPress = useCallback((location, index) => {
    setSelectedLocationIndex(index);
    
    // Show location details
    Alert.alert(
      'Location Details',
      `User: Unknown\nCoordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\nAccuracy: ${location.accuracy}m\nTime: ${new Date(location.timestamp).toLocaleString()}`,
      [{ text: 'OK', style: 'default' }]
    );
  }, []);

  const renderMarker = useCallback((location: any, index: number) => {
    const isSelected = index === selectedLocationIndex;
    
    return (
      <Mapbox.PointAnnotation
        key={index}
        coordinate={[location.longitude, location.latitude]}
        title={`Location ${index + 1}`}
        anchor="bottom"
      >
        <View
          style={[
            styles.markerContainer,
            { borderColor: isSelected ? '#00ff88' : '#ff6b35' }
          ]}
        >
          <View
            style={[
              styles.markerInner,
              { backgroundColor: isSelected ? '#00ff88' : '#ff6b35' }
            ]}
          />
        </View>
      </Mapbox.PointAnnotation>
    );
  }, [selectedLocationIndex]);

  const getMapBounds = () => {
    if (locations.length === 0) {
      return [
        [-74.0060, -40.7128],
        [-73.935242, -40.630402],
      ];
    }

    // Calculate bounds from all locations
    const lats = locations.map(loc => loc.latitude);
    const lngs = locations.map(loc => loc.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const padding = 0.01;
    return [
      [minLng - padding, minLat - padding],
      [maxLng + padding, maxLat + padding],
    ];
  };

  return (
    <View style={styles.container}>
      {/* Map Header */}
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>🗺️ GPS Tracking</Text>
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.mapStyleButton}
            onPress={handleMapStyleChange}
          >
            <Text style={styles.mapStyleText}>{mapStyle}</Text>
          </TouchableOpacity>
          <View style={styles.locationCount}>
            <Text style={styles.locationCountText}>
              {locations.length} locations
            </Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <MapboxGL
        style={styles.map}
        mapboxAccessToken={process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoicmFta2p5aGRrc3RPS2phXJjdlx403hxaWJnMlJTTE5...')
        mapStyle={mapStyle}
        styleURL={mapbox.Streets}
        attributionPosition={1}
        logoPosition={2}
        style={styles.mapContainer}
        onRegionDidChange={() => {
          // Handle region changes
        }}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Mapbox.MarkerView
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
            anchor="center"
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationPulse} />
            </View>
          </Mapbox.MarkerView>
        )}

        {/* Location History Markers */}
        {locations.map((location, index) => renderMarker(location, index))}

        {/* Map Navigation Bounds */}
        <Mapbox.Camera
          bounds={getMapBounds()}
          padding={100}
          animationMode={'flyTo'}
          animationDuration={1000}
        />
      </MapboxGL>

      {/* Location Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📍 Current Location</Text>
          {currentLocation ? (
            <View>
              <Text style={styles.infoText}>
                Latitude: {currentLocation.latitude.toFixed(6)}°
              </Text>
              <Text style={styles.infoText}>
                Longitude: {currentLocation.longitude.toFixed(6)}°
              </Text>
              <Text style={styles.infoText}>
                Accuracy: {currentLocation.accuracy?.toFixed(0)}m
              </Text>
              {currentLocation.speed && (
                <Text style={styles.infoText}>
                  Speed: {(currentLocation.speed * 3.6).toFixed(1)} km/h
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noLocationText}>
              No location data available
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📊 Tracking Status</Text>
          <Text style={styles.infoText}>
            Total locations tracked: {locations.length}
          </Text>
          {locations.length > 0 && (
            <Text style={styles.infoText}>
              Time range: {
                new Date(locations[locations.length - 1].timestamp).toLocaleDateString()} - {new Date(locations[0].timestamp).toLocaleDateString()}
              }
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Map Controls</Text>
          <Text style={styles.infoText}>
            • Single tap: View location details
          </Text>
          <Text style={styles.infoText}>
            • Drag: Pan around map
          </Text>
          <Text style={styles.infoText}>
            • Pinch: Zoom in/out
          </Text>
          <Text style={styles.infoText}>
            • Double tap: Center on location
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    zIndex: 1000,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  mapControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapStyleButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#555',
  },
  mapStyleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationCount: {
    backgroundColor: '#00ff88',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationCountText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    marginTop: 60, // Account for header
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 136, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationPulse: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00ff88',
    position: 'absolute',
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoCard: {
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
    marginBottom: 2,
  },
  noLocationText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    },
});

export default MapScreen;