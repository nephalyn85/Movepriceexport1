import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCompany } from '../lib/companies';
import { trackClick } from '../lib/tracking';

export default function GoRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      return;
    }

    const company = getCompany(slug);

    if (!company) {
      setNotFound(true);
      return;
    }

    trackClick(slug, company.name).finally(() => {
      window.location.href = company.url;
    });
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Company not found</h1>
          <p className="text-slate-600 mb-6">The link you followed doesn't exist.</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}
