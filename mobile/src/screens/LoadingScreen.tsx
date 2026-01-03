import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>🦅</Text>
      </View>
      <Text style={styles.title}>EAGOWL-POC</Text>
      <Text style={styles.subtitle}>Loading...</Text>
      
      <View style={styles.activityIndicator}>
        <Text style={styles.dots}>
          <Text style={styles.dot}>●</Text>
          <Text style={[styles.dot, styles.dotDelay1]}>●</Text>
          <Text style={[styles.dot, styles.dotDelay2]}>●</Text>
          <Text style={[styles.dot, styles.dotDelay3]}>●</Text>
          <Text style={[styles.dot, styles.dotDelay4]}>●</Text>
          <Text style={[styles.dot, styles.dotDelay5]}>●</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#00ff88',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  activityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    fontSize: 24,
    color: '#00ff88',
    marginHorizontal: 4,
  },
  dotDelay1: {
    opacity: 0.3,
  },
  dotDelay2: {
    opacity: 0.6,
  },
  dotDelay3: {
    opacity: 1,
  },
  dotDelay4: {
    opacity: 0.6,
  },
  dotDelay5: {
    opacity: 0.3,
  },
});

export default LoadingScreen;