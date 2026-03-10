import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';

import { ThemeProvider } from './components/ThemeProvider';
import { PageTransition } from './components/PageTransition';
import { Header } from './components/Header';
import { ChatWidget } from './assistant/ChatWidget';
import { HomePage } from './pages/HomePage';
import { VulnerabilityPage } from './pages/VulnerabilityPage';
import { TestingPage } from './pages/TestingPage';
import { MitigationsPage } from './pages/MitigationsPage';
import { PromptEnhancerPage } from './pages/PromptEnhancerPage';
import { SecurityKnowledgeAssistantPage } from './pages/SecurityKnowledgeAssistantPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/vulnerabilities" element={<Navigate to="/" replace />} />
        <Route path="/vulnerability/:id" element={<PageTransition><VulnerabilityPage /></PageTransition>} />

        <Route path="/mitigations" element={<PageTransition><MitigationsPage /></PageTransition>} />
        <Route path="/mitigations/:id" element={<PageTransition><MitigationsPage /></PageTransition>} />

        <Route path="/testing" element={<PageTransition><TestingPage /></PageTransition>} />
        <Route path="/prompt-enhancer" element={<PageTransition><PromptEnhancerPage /></PageTransition>} />
        <Route
          path="/security-knowledge-assistant"
          element={<PageTransition><SecurityKnowledgeAssistantPage /></PageTransition>}
        />

        <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <Router>
      <div className="relative min-h-screen app-bg text-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="app-blob blob-1" />
          <div className="app-blob blob-2" />
          <div className="app-blob blob-3" />
        </div>

        <div className="relative z-10">
          <Header />
          <AnimatedRoutes />
          <ChatWidget />
        </div>
      </div>
    </Router>
    </ThemeProvider>
  );
}
