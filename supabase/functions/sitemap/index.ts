import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BASE_URL = "https://move-price.com";

const STATE_SLUGS = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
  "delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa",
  "kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan",
  "minnesota","mississippi","missouri","montana","nebraska","nevada","new-hampshire",
  "new-jersey","new-mexico","new-york","north-carolina","north-dakota","ohio",
  "oklahoma","oregon","pennsylvania","rhode-island","south-carolina","south-dakota",
  "tennessee","texas","utah","vermont","virginia","washington","west-virginia",
  "wisconsin","wyoming",
];

const STATIC_PAGES: { loc: string; changefreq: string; priority: string }[] = [
  { loc: "/",                            changefreq: "weekly",  priority: "1.0" },
  { loc: "/moving-cost/map",             changefreq: "monthly", priority: "0.9" },
  { loc: "/long-distance-moving-cost",   changefreq: "monthly", priority: "0.8" },
  { loc: "/moving-cost-by-home-size",    changefreq: "monthly", priority: "0.8" },
  { loc: "/moving-cost-by-city",         changefreq: "monthly", priority: "0.8" },
  { loc: "/state-to-state-moving-cost",  changefreq: "monthly", priority: "0.8" },
  { loc: "/movers-vs-truck-rental",      changefreq: "monthly", priority: "0.7" },
  { loc: "/rent-a-truck",                changefreq: "monthly", priority: "0.7" },
  { loc: "/cheap-moving-truck-rentals",  changefreq: "monthly", priority: "0.7" },
  { loc: "/hourly-moving",               changefreq: "monthly", priority: "0.7" },
  { loc: "/apartment-check-nyc",         changefreq: "monthly", priority: "0.7" },
  { loc: "/bin-rentals",                 changefreq: "monthly", priority: "0.6" },
  { loc: "/inventory-calculator",        changefreq: "monthly", priority: "0.6" },
  { loc: "/get-quotes",                  changefreq: "monthly", priority: "0.6" },
  { loc: "/how-move-price-calculates-long-distance-moving-costs",      changefreq: "monthly", priority: "0.6" },
  { loc: "/how-moving-companies-calculate-long-distance-moving-costs", changefreq: "monthly", priority: "0.7" },
  { loc: "/blog",                        changefreq: "weekly",  priority: "0.7" },
  { loc: "/privacy-policy",             changefreq: "yearly",  priority: "0.3" },
  { loc: "/terms-of-use",               changefreq: "yearly",  priority: "0.3" },
];

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  return [
    "  <url>",
    `    <loc>${BASE_URL}${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false });

    const today = new Date().toISOString().split("T")[0];

    const entries: string[] = [];

    for (const page of STATIC_PAGES) {
      entries.push(urlEntry(page.loc, page.changefreq, page.priority, today));
    }

    for (const slug of STATE_SLUGS) {
      entries.push(urlEntry(`/moving-cost/state/${slug}`, "monthly", "0.8", today));
    }

    for (const post of (blogPosts ?? [])) {
      const lastmod = post.updated_at
        ? post.updated_at.split("T")[0]
        : post.published_at
          ? post.published_at.split("T")[0]
          : today;
      const encodedSlug = encodeURIComponent(post.slug);
      entries.push(urlEntry(`/blog/${encodedSlug}`, "monthly", "0.6", lastmod));
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      "</urlset>",
    ].join("\n");

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
