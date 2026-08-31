import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, User as UserIcon, LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Avatar from './Avatar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Feed', path: '/', active: location.pathname === '/' },
    { icon: UserIcon, label: 'Profile', path: `/u/${user?.id}`, active: location.pathname.startsWith('/u/') },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-md shadow-blue-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-7 4h10M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">Pulse</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Post</span>
            </button>
            <button
              onClick={() => signOut()}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <Link to={`/u/${user?.id}`}>
              <Avatar name={profile?.display_name ?? 'User'} id={user?.id ?? ''} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-lg md:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-4 py-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-6 py-1.5 text-xs transition ${item.active ? 'text-blue-600' : 'text-slate-500'}`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
