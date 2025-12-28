import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import './App.css';

// Placeholder component for pages under construction
function Placeholder({ title }) {
  return (
    <main className="placeholder">
      <div className="placeholder__card">
        <h1>{title}</h1>
        <p>This page is coming soon.</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vulnerabilities/direct-injection" element={<Placeholder title="Direct Injection" />} />
        <Route path="/vulnerabilities/indirect-injection" element={<Placeholder title="Indirect Injection" />} />
        <Route path="/vulnerabilities/jailbreaking" element={<Placeholder title="Jailbreaking" />} />
        <Route path="/vulnerabilities/data-extraction" element={<Placeholder title="Data Extraction" />} />
        <Route path="/vulnerabilities/role-confusion" element={<Placeholder title="Role Confusion" />} />
        <Route path="/testing" element={<Placeholder title="Interactive Testing" />} />
        <Route path="*" element={<Placeholder title="404 - Page Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
}
