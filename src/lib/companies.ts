export interface Company {
  name: string;
  url: string;
}

export const companies: Record<string, Company> = {
  "x": {
    name: "X (Twitter)",
    url: "/?utm_source=twitter&utm_medium=social&utm_campaign=x_bio"
  },
  "youtube": {
    name: "YouTube",
    url: "/?utm_source=youtube&utm_medium=social&utm_campaign=youtube_channel"
  },
  "bin-it": {
    name: "Bin-It",
    url: "https://bin-it.com"
  },
  "gorilla-bins": {
    name: "Gorilla Bins",
    url: "https://gorillabins.com"
  },
  "uhaul": {
    name: "U-Haul",
    url: "https://uhaul.com"
  }
};

export function getCompany(slug: string): Company | null {
  return companies[slug] || null;
}
