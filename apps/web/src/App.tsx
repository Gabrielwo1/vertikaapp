import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getAuthToken } from '@/services/api';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import NewTour from '@/pages/NewTour';
import TourDetail from '@/pages/TourDetail';
import Capture from '@/pages/Capture';
import Upload from '@/pages/Upload';
import TourEditor from '@/pages/TourEditor';
import TourViewer from '@/pages/TourViewer';

function ProtectedRoute({ children }: { children: React.ReactElement }): React.ReactElement {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Public viewer — no auth needed */}
      <Route path="/tour/:tourId" element={<TourViewer />} />

      {/* Protected routes */}
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
        path="/tours/:tourId/capture/:roomId"
        element={
          <ProtectedRoute>
            <Capture />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tours/:tourId/upload/:roomId"
        element={
          <ProtectedRoute>
            <Upload />
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
