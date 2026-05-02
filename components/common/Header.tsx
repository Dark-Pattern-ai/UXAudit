import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  const linkClass = (path: string) =>
    `hover:text-blue-600 transition-colors ${
      location.pathname === path ? 'text-blue-600 font-semibold' : 'text-gray-600'
    }`;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-blue-600">
          UXAudit
        </Link>
        <div className="flex gap-6 text-sm">
          <Link to="/" className={linkClass('/')}>홈</Link>
          <Link to="/history" className={linkClass('/history')}>진단 이력</Link>
        </div>
      </nav>
    </header>
  );
};

export default Header;