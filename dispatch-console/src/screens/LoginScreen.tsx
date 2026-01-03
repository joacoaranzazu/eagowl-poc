import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  Wifi,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { login, clearError } from '@/store/slices/authSlice';
import { connectWebSocket } from '@/store/slices/connectionSlice';

interface LoginFormData {
  username: string;
  password: string;
  serverUrl: string;
}

const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { isConnected } = useSelector((state: RootState) => state.connection);

  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    serverUrl: process.env.REACT_APP_SERVER_URL || 'http://localhost:8080',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<LoginFormData>>({});

  useEffect(() => {
    // Clear any existing errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  const handleInputChange = (field: keyof LoginFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    
    // Clear field error when user types
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<LoginFormData> = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.serverUrl.trim()) {
      errors.serverUrl = 'Server URL is required';
    } else {
      try {
        new URL(formData.serverUrl);
      } catch {
        errors.serverUrl = 'Please enter a valid URL';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Clear previous errors
      dispatch(clearError());

      // Attempt login
      const loginResult = await dispatch(login({
        username: formData.username.trim(),
        password: formData.password,
        serverUrl: formData.serverUrl.trim(),
      })).unwrap();

      if (loginResult.token) {
        // Connect to WebSocket
        await dispatch(connectWebSocket({
          token: loginResult.token,
          deviceId: `console_${Date.now()}`,
        })).unwrap();

        // Navigate to main dashboard
        navigate('/');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit(event as any);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 450,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                backgroundColor: '#00ff88',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <Lock sx={{ fontSize: 40, color: '#1a1a1a' }} />
            </Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1, fontWeight: 600 }}>
              EAGOWL-POC
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Professional Communications Console
            </Typography>
          </Box>

          {/* Connection Status */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wifi sx={{ fontSize: 16, mr: 1, color: isConnected ? '#00ff88' : '#ff4444' }} />
            <Typography variant="caption" sx={{ color: isConnected ? '#00ff88' : '#ff4444' }}>
              {isConnected ? 'Connected to server' : 'Disconnected from server'}
            </Typography>
          </Box>

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Server URL */}
            <TextField
              fullWidth
              label="Server URL"
              variant="outlined"
              margin="normal"
              value={formData.serverUrl}
              onChange={handleInputChange('serverUrl')}
              error={!!formErrors.serverUrl}
              helperText={formErrors.serverUrl}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Wifi sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Username */}
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              value={formData.username}
              onChange={handleInputChange('username')}
              error={!!formErrors.username}
              helperText={formErrors.username}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Password */}
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              margin="normal"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              helperText={formErrors.password}
              disabled={isLoading}
              onKeyPress={handleKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                py: 1.5,
                backgroundColor: '#00ff88',
                color: '#1a1a1a',
                '&:hover': {
                  backgroundColor: '#00dd77',
                },
                '&:disabled': {
                  backgroundColor: '#666',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color: '#1a1a1a' }} />
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Additional Options */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Forgot password? Contact your system administrator
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginScreen;