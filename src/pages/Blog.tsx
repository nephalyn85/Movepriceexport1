import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import { supabase, BlogPost } from '../lib/supabase';

export default function Blog() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo
        title="Moving Blog - Tips, Guides & Cost Breakdowns | Move Price"
        description="Expert moving tips, cost guides, and real-world advice. Learn how to save money on your move, compare movers vs truck rental, and avoid common moving scams."
        canonical="/blog"
        keywords="moving blog, moving tips, moving cost guide, moving advice, how to move cheap"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />

      <main className="pt-24 pb-16 px-5">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Calculator
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 bg-clip-text text-transparent">MOVE-PRICE</span>
              <span className="text-slate-800"> BLOG</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Expert advice to make your NYC move smoother, cheaper, and stress-free.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-600 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, index) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="block group"
                >
                  <article className={`bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-teal-300 transition-all ${index === 0 ? 'md:flex' : ''}`}>
                    {post.cover_image && (
                      <div className={`${index === 0 ? 'md:w-2/5' : ''}`}>
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className={`w-full object-cover ${index === 0 ? 'h-48 md:h-full' : 'h-48'}`}
                        />
                      </div>
                    )}
                    <div className={`p-6 ${index === 0 && post.cover_image ? 'md:w-3/5' : ''}`}>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {formatDate(post.published_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          {post.author}
                        </span>
                      </div>
                      <h2 className={`font-bold text-slate-900 mb-3 group-hover:text-teal-600 transition-colors ${index === 0 ? 'text-2xl' : 'text-xl'}`}>
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-slate-600 mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-2 text-teal-600 font-medium group-hover:gap-3 transition-all">
                        Read more
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
