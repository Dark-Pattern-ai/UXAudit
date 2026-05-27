import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  const linkClass = (path: string) =>
    `text-sm transition-colors px-3 py-1.5 rounded ${
      location.pathname === path
        ? 'bg-white/20 text-white font-semibold'
        : 'text-[var(--navy-muted)] hover:text-white'
    }`;

  return (
    <header style={{ backgroundColor: 'var(--navy)' }} className="border-b border-white/10">
      <nav className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white/15 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">UXAudit</span>
          <span style={{ color: 'var(--navy-muted)' }} className="text-xs border border-white/20 px-1.5 py-0.5 rounded text-[10px] font-medium ml-1">
            감독기관용
          </span>
        </Link>
        <div className="flex gap-1">
          <Link to="/" className={linkClass('/')}>홈</Link>
          <Link to="/history" className={linkClass('/history')}>진단 이력</Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;
