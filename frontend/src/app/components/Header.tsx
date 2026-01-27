import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <header className="bg-gray-900 text-white px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="text-xl font-semibold">Prompt Injection Protection</div>
        </div>
        
        <nav className="flex space-x-2">
          <Link
            to="/"
            className={`px-4 py-2 rounded transition-colors ${
              isActive('/') 
                ? 'bg-orange-500 text-white' 
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            Home
          </Link>
          <Link
            to="/vulnerabilities"
            className={`px-4 py-2 rounded transition-colors ${
              isActive('/vulnerabilities') || location.pathname.startsWith('/vulnerability/')
                ? 'bg-gray-800 text-white' 
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            Vulnerabilities
          </Link>
          <Link
            to="/testing"
            className={`px-4 py-2 rounded transition-colors ${
              isActive('/testing') 
                ? 'bg-gray-800 text-white' 
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            Testing
          </Link>
          <Link
            to="/prompt-enhancer"
            className={`px-4 py-2 rounded transition-colors ${
              isActive('/prompt-enhancer') 
                ? 'bg-gray-800 text-white' 
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            Prompt Enhancer
          </Link>
        </nav>
      </div>
    </header>
  );
}
