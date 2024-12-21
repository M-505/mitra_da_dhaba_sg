// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Utensils, DollarSign } from 'lucide-react';
import MenuPage from './pages/MenuPage';
import KitchenDisplay from './pages/KitchenDisplay';
import CashierDashboard from './pages/CashierDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header */}
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="font-bold text-xl text-gray-800">
                  Mitra Da Dhaba
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  to="/kitchen" 
                  className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100"
                >
                  <Utensils className="h-5 w-5 mr-2" />
                  Kitchen
                </Link>
                <Link 
                  to="/cashier" 
                  className="flex items-center px-4 py-2 rounded-md hover:bg-gray-100"
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  Cashier
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/" element={<MenuPage defaultTable={1} />} />
            <Route path="/kitchen" element={<KitchenDisplay />} />
            <Route path="/cashier" element={<CashierDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;