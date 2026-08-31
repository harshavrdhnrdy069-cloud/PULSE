import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Auth from '@/components/Auth';
import Layout from '@/components/Layout';
import Feed from '@/components/Feed';
import ProfilePage from '@/components/ProfilePage';
import PostDetail from '@/components/PostDetail';

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/u/:id" element={<ProfilePage />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProtectedApp />
    </BrowserRouter>
  );
}
