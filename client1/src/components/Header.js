import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, BarChart3 } from 'lucide-react';

const Header = () => {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <Phone className="inline-block mr-2" size={24} />
          Lead Calling System
        </Link>
        
        <nav className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'text-blue-600 font-semibold' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/create-order" 
            className={`nav-link ${location.pathname === '/create-order' ? 'text-blue-600 font-semibold' : ''}`}
          >
            Create Order
          </Link>
          <Link 
            to="/dashboard" 
            className={`nav-link ${location.pathname === '/dashboard' ? 'text-blue-600 font-semibold' : ''}`}
          >
            <BarChart3 className="inline-block mr-1" size={16} />
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
