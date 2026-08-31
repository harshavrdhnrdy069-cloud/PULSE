import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { supabase, type Post } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { timeAgo } from '@/lib/time';
import Avatar from './Avatar';

export default function PostCard({
  post,
  onDeleted,
  onLikeToggled,
}: {
  post: Post;
  onDeleted?: (id: string) => void;
  onLikeToggled?: (post: Post) => void;
}) {
  const { user } = useAuth();
  const [likeBusy, setLikeBusy] = useState(false);
  const isOwner = user?.id === post.author_id;

  const toggleLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      if (post.liked_by_me) {
        await supabase.from('likes').delete().match({ post_id: post.id, user_id: user!.id });
        onLikeToggled?.({
          ...post,
          liked_by_me: false,
          like_count: (post.like_count ?? 1) - 1,
        });
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user!.id });
        onLikeToggled?.({
          ...post,
          liked_by_me: true,
          like_count: (post.like_count ?? 0) + 1,
        });
      }
    } finally {
      setLikeBusy(false);
    }
  };

  const deletePost = async () => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    onDeleted?.(post.id);
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <Link to={`/u/${post.author_id}`}>
          <Avatar name={post.author?.display_name ?? 'User'} id={post.author_id} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/u/${post.author_id}`}
              className="truncate font-semibold text-slate-900 hover:text-blue-600"
            >
              {post.author?.display_name ?? 'Unknown'}
            </Link>
            <span className="text-sm text-slate-400">·</span>
            <span className="shrink-0 text-sm text-slate-400">{timeAgo(post.created_at)}</span>
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
            {post.body}
          </p>

          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={toggleLike}
              disabled={likeBusy}
              className={`flex items-center gap-1.5 text-sm transition ${post.liked_by_me ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
            >
              <Heart className={`h-4 w-4 ${post.liked_by_me ? 'fill-current' : ''}`} />
              <span>{post.like_count ?? 0}</span>
            </button>
            <Link
              to={`/post/${post.id}`}
              className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-blue-600"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comment_count ?? 0}</span>
            </Link>
            {isOwner && (
              <button
                onClick={deletePost}
                className="ml-auto flex items-center gap-1 text-sm text-slate-400 transition hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
