import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  Settings,
  Warning,
} from '@mui/icons-material';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { checkForUpdates } from '@/store/slices/appSlice';

import MainDashboard from '@/screens/MainDashboard';
import UserManagement from '@/screens/UserManagement';
import GroupManagement from '@/screens/GroupManagement';
import EmergencyAlerts from '@/screens/EmergencyAlerts';
import PTTMonitor from '@/screens/PTTMonitor';
import LocationTracking from '@/screens/LocationTracking';
import MessageHistory from '@/screens/MessageHistory';
import SystemSettings from '@/screens/SystemSettings';
import LoginScreen from '@/screens/LoginScreen';
import Sidebar from '@/components/Sidebar';
import NotificationDrawer from '@/components/NotificationDrawer';
import UpdateDialog from '@/components/UpdateDialog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88',
    },
    secondary: {
      main: '#ff6b35',
    },
    background: {
      default: '#1a1a1a',
      paper: '#262626',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    error: {
      main: '#ff4444',
    },
    warning: {
      main: '#ffaa00',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#1a1a1a',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#262626',
          border: '1px solid #333',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1f1f1f',
          borderBottom: '1px solid #333',
        },
      },
    },
  },
});

interface WindowControlsProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const WindowControls: React.FC<WindowControlsProps> = ({ onMinimize, onMaximize, onClose }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <IconButton size="small" onClick={onMinimize} sx={{ color: 'white' }}>
        <span style={{ fontSize: '14px' }}>─</span>
      </IconButton>
      <IconButton size="small" onClick={onMaximize} sx={{ color: 'white' }}>
        <span style={{ fontSize: '14px' }}>□</span>
      </IconButton>
      <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
        <span style={{ fontSize: '14px' }}>×</span>
      </IconButton>
    </Box>
  );
};

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { notifications, updateAvailable } = useSelector((state: RootState) => state.app);

  useEffect(() => {
    // Check for updates on app start
    dispatch(checkForUpdates());
    
    // Handle menu actions
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((event: string) => {
        console.log('Menu action:', event);
        // Handle menu events here
      });
      
      // Handle update events
      window.electronAPI.onUpdateAvailable(() => {
        setUpdateDialogOpen(true);
      });
      
      window.electronAPI.onUpdateDownloaded(() => {
        setUpdateDialogOpen(true);
      });
    }
  }, [dispatch]);

  useEffect(() => {
    // Window controls
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((event: string) => {
        switch (event) {
          case 'menu-new-session':
            // Handle new session
            break;
          case 'menu-connect-server':
            // Handle connect to server
            break;
          case 'menu-disconnect':
            // Handle disconnect
            break;
          case 'menu-system-info':
            // Handle system info
            break;
          case 'menu-about':
            // Handle about dialog
            break;
          default:
            break;
        }
      });
    }
  }, []);

  const handleWindowMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleWindowMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleWindowClose = () => {
    window.electronAPI?.closeWindow();
  };

  const installUpdate = () => {
    window.electronAPI?.installUpdate();
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <Router>
          <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* App Bar */}
            <AppBar
              position="fixed"
              sx={{
                zIndex: theme.zIndex.drawer + 1,
                height: 64,
              }}
            >
              <Toolbar>
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  sx={{ mr: 2 }}
                >
                  <MenuIcon />
                </IconButton>
                
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                  EAGOWL-POC Console
                </Typography>
                
                {/* Notifications */}
                <IconButton
                  color="inherit"
                  onClick={() => setNotificationDrawerOpen(true)}
                  sx={{ mr: 2 }}
                >
                  <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                    <Notifications />
                  </Badge>
                </IconButton>
                
                {/* Settings */}
                <IconButton color="inherit" sx={{ mr: 2 }}>
                  <Settings />
                </IconButton>
                
                {/* Update indicator */}
                {updateAvailable && (
                  <IconButton color="warning" sx={{ mr: 2 }}>
                    <Warning />
                  </IconButton>
                )}
                
                {/* Window Controls */}
                <WindowControls
                  onMinimize={handleWindowMinimize}
                  onMaximize={handleWindowMaximize}
                  onClose={handleWindowClose}
                />
              </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                mt: 8,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Routes>
                <Route path="/" element={<MainDashboard />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/groups" element={<GroupManagement />} />
                <Route path="/emergency" element={<EmergencyAlerts />} />
                <Route path="/ptt-monitor" element={<PTTMonitor />} />
                <Route path="/location" element={<LocationTracking />} />
                <Route path="/messages" element={<MessageHistory />} />
                <Route path="/settings" element={<SystemSettings />} />
              </Routes>
            </Box>
          </Box>

          {/* Notification Drawer */}
          <NotificationDrawer
            open={notificationDrawerOpen}
            onClose={() => setNotificationDrawerOpen(false)}
            notifications={notifications}
          />

          {/* Update Dialog */}
          <UpdateDialog
            open={updateDialogOpen}
            onClose={() => setUpdateDialogOpen(false)}
            onInstallUpdate={installUpdate}
          />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;