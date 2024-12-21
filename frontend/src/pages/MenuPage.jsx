import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const MenuPage = ({ defaultTable = 1 }) => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_URL}/categories`);
        setCategories(response.data);
        if (response.data.length > 0) {
          setActiveCategory(response.data[0].id);
        }
      } catch (err) {
        setError('Failed to load categories');
        console.error('Error:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch menu items when category changes
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!activeCategory) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/menu/category/${activeCategory}`);
        setMenuItems(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load menu items');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, [activeCategory]);

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.id === item.id);
      if (existingItem) {
        return prevCart.map(i => 
          i.id === item.id 
            ? {...i, quantity: i.quantity + 1}
            : i
        );
      }
      return [...prevCart, {...item, quantity: 1}];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const item = prevCart.find(i => i.id === itemId);
      if (item?.quantity === 1) {
        return prevCart.filter(i => i.id !== itemId);
      }
      return prevCart.map(i => 
        i.id === itemId 
          ? {...i, quantity: i.quantity - 1}
          : i
      );
    });
  };

  const submitOrder = async () => {
    if (!cart.length) return;

    try {
      await axios.post(`${API_URL}/orders`, {
        tableNumber: defaultTable,
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      });

      setCart([]);
      alert('Order placed successfully!');
    } catch (err) {
      setError('Failed to place order');
      console.error('Error:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Table Number Display */}
      <div className="mb-8 text-center">
        <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
          Table {defaultTable}
        </span>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <div className="flex overflow-x-auto gap-2 pb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                px-4 py-2 rounded-full whitespace-nowrap font-medium
                ${activeCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Menu Items */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-bold text-lg">
                    {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : 'N/A'}
                  </span>
                  <button
                    onClick={() => addToCart(item)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingCart className="h-6 w-6 text-blue-600 mr-2" />
                <span className="font-medium">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">
                  ${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                </span>
                <button
                  onClick={submitOrder}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;