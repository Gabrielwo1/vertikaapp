import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from '@/pages/Home';
import NewTour from '@/pages/NewTour';
import TourDetail from '@/pages/TourDetail';
import Capture from '@/pages/Capture';
import Upload from '@/pages/Upload';

const TOKEN_STORAGE_KEY = 'vt_token';

function LoginPage(): React.ReactElement {
  const handleGoogleLogin = (): void => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
    });
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        padding: '2rem',
      }}
    >
      <h1
        style={{
          color: '#ffffff',
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          fontFamily: 'sans-serif',
        }}
      >
        VirtualTour
      </h1>
      <p
        style={{
          color: '#aaa',
          marginBottom: '2.5rem',
          fontFamily: 'sans-serif',
        }}
      >
        Grave e publique tours virtuais
      </p>
      <button
        onClick={handleGoogleLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: '#ffffff',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: '8px',
          padding: '0.875rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 600,
          fontFamily: 'sans-serif',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Entrar com Google
      </button>
    </div>
  );
}

interface ProtectedRouteProps {
  children: React.ReactElement;
}

function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tours/new"
        element={
          <ProtectedRoute>
            <NewTour />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tours/:tourId"
        element={
          <ProtectedRoute>
            <TourDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tours/:tourId/rooms/:roomId/capture"
        element={
          <ProtectedRoute>
            <Capture />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tours/:tourId/upload"
        element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
