import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { VulnerabilityPage } from './pages/VulnerabilityPage';
import { TestingPage } from './pages/TestingPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/vulnerabilities" element={<Navigate to="/vulnerability/direct-prompt-injection" replace />} />
          <Route path="/vulnerability/:id" element={<VulnerabilityPage />} />
          <Route path="/testing" element={<TestingPage />} />
        </Routes>
      </div>
    </Router>
  );
}
