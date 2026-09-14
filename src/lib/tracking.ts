import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

declare global {
  interface Window {
    gtag?: (command: string, action: string, params: Record<string, string>) => void;
  }
}

export async function trackClick(companySlug: string, companyName: string): Promise<void> {
  console.log(`Clicked: ${companyName}`);

  if (window.gtag) {
    window.gtag('event', 'click', {
      event_category: 'outbound',
      event_label: companyName
    });
  }

  const storageKey = `click_count_${companySlug}`;
  const currentCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
  localStorage.setItem(storageKey, String(currentCount + 1));

  if (supabase) {
    try {
      await supabase.from('click_tracking').insert({
        company_slug: companySlug,
        company_name: companyName
      });
    } catch (err) {
      console.error('Failed to track click in database:', err);
    }
  }
}

export function getLocalClickCount(companySlug: string): number {
  return parseInt(localStorage.getItem(`click_count_${companySlug}`) || '0', 10);
}
