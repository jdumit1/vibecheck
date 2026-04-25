/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { Simulation } from './components/Simulation';
import { MatchFound } from './components/MatchFound';
import { Dashboard } from './components/Dashboard';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!profile?.onboardingComplete) {
    return <Onboarding />;
  }

  if (!profile?.simulationComplete) {
    return <Simulation />;
  }

  if (!profile?.matchFound) {
    return <MatchFound />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
