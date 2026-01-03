import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

const MessageHistoryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>📝 Message History</Text>
        <Text style={styles.subtitle}>
          Your communication history will appear here
        </Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.title}>🗺️ Maps</Text>
        <Text style={styles.subtitle}>
          Interactive GPS tracking map
        </Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.title}>⚙️ Settings</Text>
        <Text style={styles.subtitle}>
          Application configuration
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
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default MessageHistoryScreen;