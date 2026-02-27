import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider } from './components/ThemeProvider';
import { Header } from './components/Header';
import { ChatWidget } from './assistant/ChatWidget';

import { HomePage } from './pages/HomePage';
import { VulnerabilityPage } from './pages/VulnerabilityPage';
import { MitigationsPage } from './pages/MitigationsPage';
import { TestingPage } from './pages/TestingPage';
import { PromptEnhancerPage } from './pages/PromptEnhancerPage';
import { SecurityKnowledgeAssistantPage } from './pages/SecurityKnowledgeAssistantPage';

export default function App() {
  return (
    <ThemeProvider>
    <Router>
      <div className="relative min-h-screen app-bg text-foreground">
        {/* Decorative background (no functional impact) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="app-blob blob-1" />
          <div className="app-blob blob-2" />
          <div className="app-blob blob-3" />
        </div>

        <div className="relative z-10">
          <Header />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vulnerabilities" element={<Navigate to="/" replace />} />
            <Route path="/vulnerability/:id" element={<VulnerabilityPage />} />

            <Route path="/mitigations" element={<MitigationsPage />} />
            <Route path="/mitigations/:id" element={<MitigationsPage />} />

            <Route path="/testing" element={<TestingPage />} />
            <Route path="/prompt-enhancer" element={<PromptEnhancerPage />} />
            <Route
              path="/security-knowledge-assistant"
              element={<SecurityKnowledgeAssistantPage />}
            />
          </Routes>

          <ChatWidget />
        </div>
      </div>
    </Router>
    </ThemeProvider>
  );
}