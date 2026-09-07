/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './AuthContext.tsx';
import { LanguageProvider } from './LanguageContext.tsx';
import Layout from './components/Layout.tsx';
import Landing from './pages/Landing.tsx';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Onboarding from './pages/Onboarding.tsx';
import Chat from './pages/Chat.tsx';
import Journal from './pages/Journal.tsx';
import Settings from './pages/Settings.tsx';
import Tracking from './pages/Tracking.tsx';
import DigitalTwin from './pages/DigitalTwin.tsx';
import Community from './pages/Community.tsx';
import Analytics from './pages/Analytics.tsx';
import Ambient from './pages/Ambient.tsx';
import Orchestration from './pages/Orchestration.tsx';
import Ecosystem from './pages/Ecosystem.tsx';
import Cognition from './pages/Cognition.tsx';
import Research from './pages/Research.tsx';
import LifeOS from './pages/LifeOS.tsx';
import Enterprise from './pages/Enterprise.tsx';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="chat" element={<Chat />} />
              <Route path="journal" element={<Journal />} />
              <Route path="tracking" element={<Tracking />} />
              <Route path="twin" element={<DigitalTwin />} />
              <Route path="community" element={<Community />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="ambient" element={<Ambient />} />
              <Route path="orchestration" element={<Orchestration />} />
              <Route path="ecosystem" element={<Ecosystem />} />
              <Route path="cognition" element={<Cognition />} />
              <Route path="research" element={<Research />} />
              <Route path="lifeos" element={<LifeOS />} />
              <Route path="enterprise" element={<Enterprise />} />
              <Route path="admin" element={<Enterprise />} />
              <Route path="billing" element={<Enterprise />} />
              <Route path="notifications" element={<Enterprise />} />
              <Route path="security" element={<Enterprise />} />
              <Route path="system-health" element={<Enterprise />} />
              <Route path="developer" element={<Enterprise />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
