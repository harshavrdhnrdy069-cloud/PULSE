import { useEffect, useState, useCallback } from 'react';
import { supabase, type Post } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';

export default function Feed() {
  const { profile, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('id, author_id, body, created_at, author:profiles!posts_author_id_fkey(id, display_name, bio, avatar_url, created_at)')
      .order('created_at', { ascending: false })
      .limit(50);

    const rows = (data ?? []) as unknown as Post[];

    if (rows.length > 0) {
      const postIds = rows.map((p) => p.id);
      const [{ data: likes }, { data: myLikes }, { data: commentCounts }] = await Promise.all([
        supabase.from('likes').select('post_id').in('post_id', postIds),
        supabase.from('likes').select('post_id').eq('user_id', user!.id).in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
      ]);

      const likeMap = new Map<string, number>();
      (likes ?? []).forEach((l: { post_id: string }) => {
        likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1);
      });
      const myLikeSet = new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id));
      const commentMap = new Map<string, number>();
      (commentCounts ?? []).forEach((c: { post_id: string }) => {
        commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1);
      });

      const enriched = rows.map((p) => ({
        ...p,
        like_count: likeMap.get(p.id) ?? 0,
        liked_by_me: myLikeSet.has(p.id),
        comment_count: commentMap.get(p.id) ?? 0,
      }));
      setPosts(enriched);
    } else {
      setPosts([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length === 0) return;
    setPosting(true);
    const { data } = await supabase
      .from('posts')
      .insert({ body: body.trim() })
      .select('id, author_id, body, created_at')
      .single();

    if (data) {
      const newPost: Post = {
        ...data,
        author: profile ?? undefined,
        like_count: 0,
        comment_count: 0,
        liked_by_me: false,
      };
      setPosts((prev) => [newPost, ...prev]);
      setBody('');
    }
    setPosting(false);
  };

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-3">
          <Avatar name={profile?.display_name ?? 'User'} id={user?.id ?? ''} size="md" />
          <form onSubmit={submitPost} className="flex-1">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">{body.length}/500</span>
              <button
                type="submit"
                disabled={posting || body.trim().length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-full rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-slate-500">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
              onLikeToggled={(updated) =>
                setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
