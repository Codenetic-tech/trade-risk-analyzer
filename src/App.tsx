
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import EveningIntersegment from './components/EveningIntersegment';
import Brokerage from './components/Brokerage';
import NseCm from './components/NseCm';
import Layout from './components/Layout';
import NseFo from './components/NseFo';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analysis" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/allocation-check" 
          element={
            <ProtectedRoute>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-700">Allocation Check</h2>
                <p className="text-slate-500 mt-2">Allocation check section coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/morning-bod" 
          element={
            <ProtectedRoute>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-700">Morning BOD</h2>
                <p className="text-slate-500 mt-2">Select a segment to analyze:</p>
                <div className="mt-6 flex flex-wrap justify-center gap-4">
                  <a href="/morning-bod/nse-cm" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">NSE CM</a>
                  <a href="/morning-bod/nse-fo" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">NSE F&O</a>
                  <a href="/morning-bod/nse-cd" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">NSE CD</a>
                  <a href="/morning-bod/mcx" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">MCX</a>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/morning-bod/nse-cm" 
          element={
            <ProtectedRoute>
              <NseCm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/morning-bod/nse-fo" 
          element={
            <ProtectedRoute>
              <NseFo />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/morning-bod/nse-cd" 
          element={
            <ProtectedRoute>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-700">CD</h2>
                <p className="text-slate-500 mt-2">CD analysis coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/morning-bod/mcx" 
          element={
            <ProtectedRoute>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-700">MCX</h2>
                <p className="text-slate-500 mt-2">MCX analysis coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/brokerage" 
          element={
            <ProtectedRoute>
              <Brokerage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/evening-intersegment" 
          element={
            <ProtectedRoute>
              <EveningIntersegment />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-700">Reports</h2>
                <p className="text-slate-500 mt-2">Reports section coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/downloads" 
          element={
            <ProtectedRoute>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-700">Downloads</h2>
                <p className="text-slate-500 mt-2">Downloads section coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-slate-700">Settings</h2>
                <p className="text-slate-500 mt-2">Settings section coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
