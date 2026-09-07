import { Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { AppShell } from './components/layout/AppShell';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default App;
