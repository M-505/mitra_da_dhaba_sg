// src/components/shared/Navigation.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, DollarSign } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  
  // Don't show navigation on customer menu pages
  if (location.pathname.includes('/menu')) {
    return null;
  }

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img 
                src="/mitra-logo.png" 
                alt="Mitra Da Dhaba" 
                className="h-8 w-8 mr-2"
              />
              <span className="font-bold text-lg">Mitra Da Dhaba</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link 
              to="/kitchen" 
              className={`flex items-center px-3 py-2 rounded-md ${
                location.pathname === '/kitchen' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Utensils className="h-5 w-5 mr-2" />
              Kitchen Display
            </Link>

            <Link 
              to="/cashier"
              className={`flex items-center px-3 py-2 rounded-md ${
                location.pathname === '/cashier' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Cashier Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;