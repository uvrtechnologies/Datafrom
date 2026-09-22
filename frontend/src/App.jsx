import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FamilyForm from './pages/FamilyForm';
import Success from './pages/Success';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FamilyForm />} />
        <Route path="/form" element={<FamilyForm />} />
        <Route path="/success" element={<Success />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
