/*
  # Create Blog Posts Table

  1. New Tables
    - `blog_posts`
      - `id` (uuid, primary key) - Unique identifier for each post
      - `title` (text) - Post title
      - `slug` (text, unique) - URL-friendly identifier
      - `excerpt` (text) - Short summary for listings
      - `content` (text) - Full post content (supports HTML/markdown)
      - `cover_image` (text) - URL to cover image
      - `author` (text) - Author name
      - `published` (boolean) - Whether post is visible publicly
      - `published_at` (timestamptz) - When post was published
      - `created_at` (timestamptz) - When post was created
      - `updated_at` (timestamptz) - When post was last updated

  2. Security
    - Enable RLS on `blog_posts` table
    - Add policy for public read access to published posts only
    - Add policy for authenticated users to manage all posts

  3. Indexes
    - Index on `slug` for fast lookups
    - Index on `published_at` for sorting
    - Index on `published` for filtering
*/

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_image text,
  author text DEFAULT 'Movers 101',
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published posts"
  ON blog_posts
  FOR SELECT
  USING (published = true);

CREATE POLICY "Authenticated users can insert posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (true);