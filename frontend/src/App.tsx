import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './pages/Home';
import { Chores } from './pages/Chores';
import { Rewards } from './pages/Rewards';
import { Admin } from './pages/Admin';

const queryClient = new QueryClient();

function NavBar() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/chores', icon: '🧹', label: 'Chores' },
    { path: '/rewards', icon: '🎁', label: 'Rewards' },
    { path: '/admin', icon: '👨‍👩‍👧', label: 'Parent' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center w-full h-full touch-target
              ${location.pathname === item.path
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-primary-500'
              }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-bold mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-500 to-purple-500 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">✨ KidsChores ✨</h1>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chores" element={<Chores />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      {/* Bottom Navigation */}
      <NavBar />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
