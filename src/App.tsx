/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Calculator } from './components/Calculator';
import { Home } from './pages/Home';
import { CaseDetail } from './pages/CaseDetail';
import { IntegrityPage } from './pages/IntegrityPage';
import { RiskDetectorPage } from './pages/RiskDetectorPage';
import { SuspectExtractorPage } from './pages/SuspectExtractorPage';
import { ReportPrepPage } from './pages/ReportPrepPage';
import { VerifyPage } from './pages/VerifyPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelperModePage } from './pages/HelperModePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Calculator />} />
        <Route path="/home" element={<Home />} />
        <Route path="/case/:id" element={<CaseDetail />} />
        <Route path="/case/:id/integrity" element={<IntegrityPage />} />
        <Route path="/case/:id/risk" element={<RiskDetectorPage />} />
        <Route path="/case/:id/suspects" element={<SuspectExtractorPage />} />
        <Route path="/case/:id/report" element={<ReportPrepPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/helper" element={<HelperModePage />} />
      </Routes>
    </BrowserRouter>
  );
}
