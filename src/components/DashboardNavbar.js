'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardNavbar() {
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId;
          
          const res = await fetch(`http://localhost:8000/api/auth/user/${userId}`);
          if (res.ok) {
            const user = await res.json();
            setUserName(user.name);
            localStorage.setItem('userName', user.name);
          } else {
            // Fallback to localStorage
            const name = localStorage.getItem('userName');
            if (name) setUserName(name);
          }
        }
      } catch (err) {
        // Fallback to localStorage
        const name = localStorage.getItem('userName');
        if (name) setUserName(name);
      }
    };
    
    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 h-14 fixed top-0 left-0 right-0 z-50">
      <div className="h-full px-6 flex justify-between items-center">
        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center mr-2">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <h1 className="text-xl font-semibold text-blue-700">Workin</h1>
        </Link>
        
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search jobs, companies..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-md text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-gray-700 font-medium text-sm">{userName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
