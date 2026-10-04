import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import FamiliesTable from './pages/FamiliesTable';
import StudentsTable from './pages/StudentsTable';
import OccupationList from './pages/OccupationList';
import FamilyDetail from './pages/FamilyDetail';
import AdminAnalytics from './pages/AdminAnalytics';
import AddAdmin from './pages/AddAdmin';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/families" element={<ProtectedRoute><FamiliesTable /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute><StudentsTable /></ProtectedRoute>} />
        <Route path="/business-owners" element={<ProtectedRoute><OccupationList type="business-owners" /></ProtectedRoute>} />
        <Route path="/professionals" element={<ProtectedRoute><OccupationList type="professionals" /></ProtectedRoute>} />
        <Route path="/families/:id" element={<ProtectedRoute><FamilyDetail /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admins/new" element={<ProtectedRoute><AddAdmin /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
