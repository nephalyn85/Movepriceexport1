import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, Save, X, Lock } from 'lucide-react';
import { supabase, BlogPost } from '../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';

const ADMIN_PASSWORD = 'movers101admin';

export default function BlogAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image: '',
    author: 'Movers 101',
    published: false,
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('blog_admin_auth');
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('blog_admin_auth', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
  }

  async function fetchPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleTitleChange(title: string) {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  }

  function openEditor(post?: BlogPost) {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content,
        cover_image: post.cover_image || '',
        author: post.author,
        published: post.published,
      });
    } else {
      setIsCreating(true);
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        cover_image: '',
        author: 'Movers 101',
        published: false,
      });
    }
  }

  function closeEditor() {
    setEditingPost(null);
    setIsCreating(false);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      cover_image: '',
      author: 'Movers 101',
      published: false,
    });
  }

  async function handleSave() {
    if (!formData.title || !formData.slug || !formData.content) {
      alert('Title, slug, and content are required');
      return;
    }

    setSaving(true);

    const postData = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt || null,
      content: formData.content,
      cover_image: formData.cover_image || null,
      author: formData.author,
      published: formData.published,
      published_at: formData.published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (editingPost) {
      const { error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', editingPost.id);

      if (error) {
        console.error('Error updating post:', error);
        alert('Failed to update post. Check console for details.');
      } else {
        await fetchPosts();
        closeEditor();
      }
    } else {
      const { error } = await supabase.from('blog_posts').insert([postData]);

      if (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post. Check console for details.');
      } else {
        await fetchPosts();
        closeEditor();
      }
    }

    setSaving(false);
  }

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) return;

    const { error } = await supabase.from('blog_posts').delete().eq('id', post.id);

    if (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    } else {
      await fetchPosts();
    }
  }

  async function togglePublished(post: BlogPost) {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        published: !post.published,
        published_at: !post.published ? new Date().toISOString() : post.published_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id);

    if (error) {
      console.error('Error toggling publish status:', error);
    } else {
      await fetchPosts();
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
              Blog Admin
            </h1>
            <p className="text-slate-600 text-center mb-6">
              Enter password to access the admin panel
            </p>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none mb-4"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mb-4">{passwordError}</p>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
              >
                Login
              </button>
            </form>
            <Link
              to="/"
              className="block text-center mt-4 text-slate-600 hover:text-slate-900 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (editingPost || isCreating) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
            <button
              onClick={closeEditor}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <h1 className="font-semibold text-slate-900">
              {editingPost ? 'Edit Post' : 'New Post'}
            </h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-5 py-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="Enter post title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-mono text-sm"
                placeholder="url-friendly-slug"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cover Image URL
              </label>
              <input
                type="url"
                value={formData.cover_image}
                onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="https://images.pexels.com/..."
              />
              {formData.cover_image && (
                <img
                  src={formData.cover_image}
                  alt="Cover preview"
                  className="mt-3 w-full h-48 object-cover rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Excerpt
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                rows={2}
                placeholder="Brief summary shown in blog listings"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content *
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={(html) => setFormData((prev) => ({ ...prev, content: html }))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Publish immediately
                  </span>
                </label>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Site
          </Link>
          <h1 className="font-semibold text-slate-900">Blog Admin</h1>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-600 text-lg mb-4">No blog posts yet</p>
            <button
              onClick={() => openEditor()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Post
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                    Title
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 hidden md:table-cell">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900 hidden md:table-cell">
                    Created
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{post.title}</p>
                        <p className="text-sm text-slate-500 font-mono">/blog/{post.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
                          post.published
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {post.published ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Draft
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePublished(post)}
                          className={`p-2 rounded-lg transition-colors ${
                            post.published
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={post.published ? 'Unpublish' : 'Publish'}
                        >
                          {post.published ? (
                            <Eye className="w-5 h-5" />
                          ) : (
                            <EyeOff className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditor(post)}
                          className="p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
