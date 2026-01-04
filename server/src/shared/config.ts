import dotenv from 'dotenv';

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8080'),
  HOST: process.env.HOST || '0.0.0.0',
  
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  WS_PORT: parseInt(process.env.WS_PORT || '9998'),
  WS_HOST: process.env.WS_HOST || '0.0.0.0',
  
  MEDIA_STORAGE_PATH: process.env.MEDIA_STORAGE_PATH || './storage/media',
  RECORDING_PATH: process.env.RECORDING_PATH || './storage/recordings',
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '52428800'), // 50MB
  
  STUN_SERVER: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
  TURN_SERVER: process.env.TURN_SERVER || '',
  TURN_USERNAME: process.env.TURN_USERNAME || '',
  TURN_PASSWORD: process.env.TURN_PASSWORD || '',
  
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'json',
  
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  
  DMR_GATEWAY_ENABLED: process.env.DMR_GATEWAY_ENABLED === 'true',
  DMR_GATEWAY_HOST: process.env.DMR_GATEWAY_HOST || '',
  DMR_GATEWAY_PORT: parseInt(process.env.DMR_GATEWAY_PORT || '5060'),
  
  EMERGENCY_NOTIFICATION_ENABLED: process.env.EMERGENCY_NOTIFICATION_ENABLED === 'true',
  EMERGENCY_EMAIL_RECIPIENTS: process.env.EMERGENCY_EMAIL_RECIPIENTS?.split(',') || [],
  EMERGENCY_SMS_ENABLED: process.env.EMERGENCY_SMS_ENABLED === 'true',
  
  METRICS_ENABLED: process.env.METRICS_ENABLED === 'true',
  METRICS_PORT: parseInt(process.env.METRICS_PORT || '9090')
};