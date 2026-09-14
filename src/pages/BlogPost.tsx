import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Share2, Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AboutModal from '../components/AboutModal';
import { supabase, BlogPost as BlogPostType } from '../lib/supabase';
import MovePriceCalculator from '../components/MovePriceCalculator';
import Seo from '../components/Seo';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  async function fetchPost(postSlug: string) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', postSlug)
      .eq('published', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching post:', error);
      navigate('/blog');
    } else if (!data) {
      navigate('/blog');
    } else {
      setPost(data);
    }
    setLoading(false);
  }

  function embedYouTube(html: string): string {
    return html.replace(
      /<a[^>]*href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11}))"[^>]*>.*?<\/a>/gi,
      (_match, _url, videoId) =>
        `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`
    );
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy URL');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header onAboutClick={() => setIsAboutOpen(true)} />
        <div className="pt-24 flex justify-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const canonicalUrl = `https://move-price.com/blog/${encodeURIComponent(post.slug)}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Move-Price',
      url: 'https://move-price.com',
    },
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at ?? post.published_at ?? undefined,
    ...(post.cover_image ? { image: post.cover_image } : {}),
    url: canonicalUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <Seo
        title={`${post.title} | Move-Price Blog`}
        description={post.excerpt || `${post.title} — Read the full breakdown on Move-Price.`}
        canonical={canonicalUrl}
        ogImage={post.cover_image || undefined}
        jsonLd={articleSchema}
      />

      <main className="pt-24 pb-16 px-5">
        <article className="max-w-3xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {post.cover_image && (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-64 md:h-80 object-cover rounded-2xl mb-8"
            />
          )}

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(post.published_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {post.author}
              </span>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 hover:text-teal-600 transition-colors ml-auto"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share
                  </>
                )}
              </button>
            </div>
          </header>

          <style>{`
            .blog-body { font-size: 1.125rem; line-height: 1.8; color: #475569; }
            .blog-body p { margin-top: 0; margin-bottom: 1.4rem; color: #475569; }
            .blog-body h2 { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-top: 2.75rem; margin-bottom: 1rem; line-height: 1.3; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
            .blog-body h3 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-top: 2rem; margin-bottom: 0.75rem; line-height: 1.3; }
            .blog-body strong { color: #0f172a; font-weight: 600; }
            .blog-body a { color: #0d9488 !important; text-decoration: none !important; }
            .blog-body a:hover { text-decoration: underline !important; color: #0f766e !important; }
            .blog-body ul { list-style-type: disc; padding-left: 1.75rem; margin-top: 1rem; margin-bottom: 1rem; }
            .blog-body ol { list-style-type: decimal; padding-left: 1.75rem; margin-top: 1rem; margin-bottom: 1rem; }
            .blog-body li { margin-bottom: 0.5rem; color: #475569; }
            .blog-body li::marker { color: #0d9488; }
            .blog-body blockquote { border-left: 4px solid #0d9488; background: #f8fafc; padding: 1rem 1.5rem; border-radius: 0 0.5rem 0.5rem 0; margin: 1.5rem 0; color: #334155; }
            .blog-body code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
            .blog-body pre { background: #1e293b; border-radius: 0.75rem; padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0; }
            .blog-body pre code { background: none; padding: 0; color: #e2e8f0; }
            .blog-body img { border-radius: 0.75rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 100%; margin: 1.5rem 0; }
            .blog-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 2.5rem 0; }
            .blog-body .video-embed { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.75rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 1.5rem 0; }
            .blog-body .video-embed iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
          `}</style>
          {(() => {
            const marker = '<!--CALCULATOR-->';
            const content = embedYouTube(post.content);
            const idx = content.indexOf(marker);
            if (idx === -1) {
              return (
                <div
                  className="blog-body"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              );
            }
            const before = content.slice(0, idx);
            const after = content.slice(idx + marker.length);
            return (
              <>
                <div className="blog-body" dangerouslySetInnerHTML={{ __html: before }} />
                <div className="my-10">
                  <MovePriceCalculator />
                </div>
                <div className="blog-body" dangerouslySetInnerHTML={{ __html: after }} />
              </>
            );
          })()}

          <footer className="mt-12 pt-8 border-t border-slate-200">
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-8 text-center border border-teal-100">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Ready to plan your move?
              </h3>
              <p className="text-slate-600 mb-4">
                Get an instant price estimate for your NYC move.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
              >
                Calculate Your Move Price
              </Link>
            </div>
          </footer>
        </article>
      </main>

      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
