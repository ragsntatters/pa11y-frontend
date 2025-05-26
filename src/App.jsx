import React from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicScan from './components/PublicScan';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicScan />} />
          <Route path="/admin" element={<SignedIn><AdminDashboard /></SignedIn>} />
          <Route path="/admin/login" element={<SignedOut><SignIn routing="path" path="/admin/login" /></SignedOut>} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
