import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Trash2, Send } from 'lucide-react';
import { supabase, type Post, type Comment } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { timeAgo } from '@/lib/time';
import Avatar from '@/components/Avatar';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: postData } = await supabase
      .from('posts')
      .select('id, author_id, body, created_at, author:profiles!posts_author_id_fkey(id, display_name, bio, avatar_url, created_at)')
      .eq('id', id)
      .maybeSingle();
    const p = postData as unknown as Post | null;
    setPost(p);

    if (p) {
      const [{ count: likeCount }, { data: myLike }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
        supabase.from('likes').select('post_id').eq('post_id', id).eq('user_id', user!.id).maybeSingle(),
      ]);
      setPost({
        ...p,
        like_count: likeCount ?? 0,
        liked_by_me: !!myLike,
      });

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, post_id, author_id, body, created_at, author:profiles!comments_author_id_fkey(id, display_name, bio, avatar_url, created_at)')
        .eq('post_id', id)
        .order('created_at', { ascending: true });
      setComments((commentsData ?? []) as unknown as Comment[]);
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleLike = async () => {
    if (!post || likeBusy) return;
    setLikeBusy(true);
    try {
      if (post.liked_by_me) {
        await supabase.from('likes').delete().match({ post_id: post.id, user_id: user!.id });
        setPost({ ...post, liked_by_me: false, like_count: (post.like_count ?? 1) - 1 });
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user!.id });
        setPost({ ...post, liked_by_me: true, like_count: (post.like_count ?? 0) + 1 });
      }
    } finally {
      setLikeBusy(false);
    }
  };

  const deletePost = async () => {
    if (!confirm('Delete this post and all its comments?')) return;
    await supabase.from('posts').delete().eq('id', id);
    navigate('/');
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commentBody.trim().length === 0) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: id, body: commentBody.trim() })
      .select('id, post_id, author_id, body, created_at')
      .single();

    if (data) {
      const newComment: Comment = {
        ...data,
        author: profile ?? undefined,
      };
      setComments((prev) => [...prev, newComment]);
      setCommentBody('');
    }
    setSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-24 rounded bg-slate-200" />
        <div className="h-40 rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-slate-500">Post not found.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === post.author_id;

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Post */}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Link to={`/u/${post.author_id}`}>
            <Avatar name={post.author?.display_name ?? 'User'} id={post.author_id} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                to={`/u/${post.author_id}`}
                className="font-semibold text-slate-900 hover:text-blue-600"
              >
                {post.author?.display_name ?? 'Unknown'}
              </Link>
              <span className="text-sm text-slate-400">·</span>
              <span className="text-sm text-slate-400">{timeAgo(post.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-slate-800">
              {post.body}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
          <button
            onClick={toggleLike}
            disabled={likeBusy}
            className={`flex items-center gap-1.5 text-sm transition ${post.liked_by_me ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
          >
            <Heart className={`h-5 w-5 ${post.liked_by_me ? 'fill-current' : ''}`} />
            <span>{post.like_count ?? 0} likes</span>
          </button>
          {isOwner && (
            <button
              onClick={deletePost}
              className="ml-auto flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </article>

      {/* Comments */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h3>

        {/* Comment form */}
        <form onSubmit={submitComment} className="mb-5 flex gap-3">
          <Avatar name={profile?.display_name ?? 'User'} id={user?.id ?? ''} size="sm" />
          <div className="flex-1">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              maxLength={300}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="mt-1.5 flex justify-end">
              <button
                type="submit"
                disabled={submitting || commentBody.trim().length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Comment
              </button>
            </div>
          </div>
        </form>

        {/* Comment list */}
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No comments yet. Start the conversation!</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/u/${comment.author_id}`}>
                  <Avatar
                    name={comment.author?.display_name ?? 'User'}
                    id={comment.author_id}
                    size="sm"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/u/${comment.author_id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                    >
                      {comment.author?.display_name ?? 'Unknown'}
                    </Link>
                    <span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                    {comment.body}
                  </p>
                </div>
                {user?.id === comment.author_id && (
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="flex items-center text-xs text-slate-400 transition hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
