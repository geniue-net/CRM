import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Agents from './pages/Agents';
import AgentDetails from './pages/AgentDetails';
import { ToastContainer, useToast } from './components/Toast';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppContent: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/agents/:agentId" element={<AgentDetails />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
