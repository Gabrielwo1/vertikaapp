import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from '@/pages/Login';
import TourList from '@/pages/TourList';
import TourEditor from '@/pages/TourEditor';

const TOKEN_STORAGE_KEY = 'vt_token';

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
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/tours" replace />} />
      <Route
        path="/tours"
        element={
          <ProtectedRoute>
            <TourList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tours/:tourId/edit"
        element={
          <ProtectedRoute>
            <TourEditor />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/tours" replace />} />
    </Routes>
  );
}
