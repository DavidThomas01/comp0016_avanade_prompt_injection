import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import './Header.css';

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  {
    label: 'Vulnerabilities',
    children: [
      { path: '/vulnerabilities/direct-injection', label: 'Direct Injection' },
      { path: '/vulnerabilities/indirect-injection', label: 'Indirect Injection' },
      { path: '/vulnerabilities/jailbreaking', label: 'Jailbreaking' },
      { path: '/vulnerabilities/data-extraction', label: 'Data Extraction' },
    ],
  },
  { path: '/testing', label: 'Testing' },
];

export default function Header() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo">
          Prompt Injection Protection
        </Link>

        {/* Desktop Navigation */}
        <nav className="header__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="header__dropdown"
                ref={dropdownRef}
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button
                  className={`header__link ${isActive('/vulnerabilities') ? 'is-active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  {item.label}
                  <ChevronDown size={14} className={`header__chevron ${dropdownOpen ? 'is-open' : ''}`} />
                </button>
                <div className={`header__menu ${dropdownOpen ? 'is-open' : ''}`}>
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`header__menu-item ${pathname === child.path ? 'is-active' : ''}`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`header__link ${isActive(item.path) ? 'is-active' : ''}`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* Mobile Toggle */}
        <button
          className="header__toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`header__mobile ${mobileOpen ? 'is-open' : ''}`}>
        <nav className="header__mobile-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <div key={item.label} className="header__mobile-group">
                <span className="header__mobile-label">{item.label}</span>
                {item.children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    className={`header__mobile-link header__mobile-link--nested ${pathname === child.path ? 'is-active' : ''}`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`header__mobile-link ${isActive(item.path) ? 'is-active' : ''}`}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
