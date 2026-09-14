import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  keywords?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_URL = 'https://move-price.com';
const DEFAULT_OG = `${SITE_URL}/image0.png`;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.setAttribute('type', 'application/ld+json');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function Seo({ title, description, canonical, ogImage, keywords, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes('Move Price') ? title : `${title} | Move Price`;
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    if (keywords) upsertMeta('name', 'keywords', keywords);

    const canonicalUrl = canonical
      ? (canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`)
      : `${SITE_URL}${window.location.pathname}`;
    upsertLink('canonical', canonicalUrl);

    const ogImg = ogImage || DEFAULT_OG;
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', ogImg);
    upsertMeta('property', 'og:type', 'website');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', ogImg);

    if (jsonLd) {
      const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      blocks.forEach((block, i) => {
        upsertJsonLd(`route-jsonld-${i}`, block);
      });
      // Clean up any leftover blocks from a previous route
      let i = blocks.length;
      while (document.getElementById(`route-jsonld-${i}`)) {
        document.getElementById(`route-jsonld-${i}`)?.remove();
        i++;
      }
    } else {
      let i = 0;
      while (document.getElementById(`route-jsonld-${i}`)) {
        document.getElementById(`route-jsonld-${i}`)?.remove();
        i++;
      }
    }
  }, [title, description, canonical, ogImage, keywords, jsonLd]);

  return null;
}

export { SITE_URL };
