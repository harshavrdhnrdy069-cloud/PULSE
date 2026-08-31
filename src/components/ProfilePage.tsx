import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPlus, UserCheck, Edit3, Check, X } from 'lucide-react';
import { supabase, type Profile, type Post } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { timeAgo } from '@/lib/time';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwnProfile = user?.id === id;

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: prof } = await supabase
      .from('profiles')
      .select('id, display_name, bio, avatar_url, created_at')
      .eq('id', id)
      .maybeSingle();
    setProfile(prof as Profile | null);

    const { data: userPosts } = await supabase
      .from('posts')
      .select('id, author_id, body, created_at, author:profiles!posts_author_id_fkey(id, display_name, bio, avatar_url, created_at)')
      .eq('author_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    const rows = (userPosts ?? []) as unknown as Post[];

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

      setPosts(
        rows.map((p) => ({
          ...p,
          like_count: likeMap.get(p.id) ?? 0,
          liked_by_me: myLikeSet.has(p.id),
          comment_count: commentMap.get(p.id) ?? 0,
        })),
      );
    } else {
      setPosts([]);
    }

    // Follow stats
    const [{ count: fCount }, { count: fgCount }, { data: myFollow }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
      supabase.from('follows').select('follower_id').eq('follower_id', user!.id).eq('followee_id', id).maybeSingle(),
    ]);
    setFollowerCount(fCount ?? 0);
    setFollowingCount(fgCount ?? 0);
    setIsFollowing(!!myFollow);

    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleFollow = async () => {
    if (followBusy || !id) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ follower_id: user!.id, followee_id: id });
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await supabase.from('follows').insert({ follower_id: user!.id, followee_id: id });
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } finally {
      setFollowBusy(false);
    }
  };

  const startEdit = () => {
    setEditName(profile?.display_name ?? '');
    setEditBio(profile?.bio ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: editName.trim(), bio: editBio.trim() })
      .eq('id', user!.id);
    await refreshProfile();
    setProfile((prev) =>
      prev ? { ...prev, display_name: editName.trim(), bio: editBio.trim() } : prev,
    );
    setEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 rounded-2xl bg-white shadow-sm" />
        <div className="h-6 w-1/3 rounded bg-slate-200" />
        <div className="h-24 rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-slate-500">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between">
            <Avatar name={profile.display_name} id={profile.id} size="xl" />
            {isOwnProfile ? (
              !editing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              )
            ) : (
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  isFollowing
                    ? 'border border-slate-300 text-slate-700 hover:border-rose-300 hover:text-rose-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>

          {editing ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="mt-3 text-xl font-bold text-slate-900">{profile.display_name}</h2>
              {profile.bio ? (
                <p className="mt-1 text-sm text-slate-600">{profile.bio}</p>
              ) : (
                <p className="mt-1 text-sm text-slate-400 italic">
                  {isOwnProfile ? 'Add a bio to tell people about yourself.' : 'No bio yet.'}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-400">Joined {timeAgo(profile.created_at)} ago</p>

              <div className="mt-4 flex gap-6">
                <div>
                  <span className="font-bold text-slate-900">{posts.length}</span>
                  <span className="ml-1 text-sm text-slate-500">posts</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">{followerCount}</span>
                  <span className="ml-1 text-sm text-slate-500">followers</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">{followingCount}</span>
                  <span className="ml-1 text-sm text-slate-500">following</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User's posts */}
      <h3 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {isOwnProfile ? 'Your Posts' : 'Posts'}
      </h3>
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="text-slate-500">
            {isOwnProfile ? "You haven't posted yet." : 'No posts yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(deletedId) => setPosts((prev) => prev.filter((p) => p.id !== deletedId))}
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
