-- Migration: Create categories table and associated RLS policies

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) <= 100),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comments to the table and columns
COMMENT ON TABLE public.categories IS 'Stores product categories';
COMMENT ON COLUMN public.categories.id IS 'Unique identifier for the category';
COMMENT ON COLUMN public.categories.name IS 'Name of the category (e.g., Engine Parts, Electrical)';
COMMENT ON COLUMN public.categories.created_at IS 'Timestamp of when the category was created';
COMMENT ON COLUMN public.categories.updated_at IS 'Timestamp of when the category was last updated';

-- Enable Row Level Security for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories table

-- Allow authenticated users to view all categories
CREATE POLICY "Authenticated users can view categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert categories
CREATE POLICY "Admins can insert categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update categories
CREATE POLICY "Admins can update categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete categories
CREATE POLICY "Admins can delete categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at on categories table
-- Assumes your update_updated_at_column() function already exists
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Optional: Seed initial categories (uncomment if needed)
/*
INSERT INTO public.categories (name) VALUES 
  ('Engine Parts'), 
  ('Electrical'), 
  ('Suspension'), 
  ('Brakes'), 
  ('Transmission'), 
  ('Body Parts'), 
  ('Accessories'), 
  ('Other')
ON CONFLICT (name) DO NOTHING;
*/ 