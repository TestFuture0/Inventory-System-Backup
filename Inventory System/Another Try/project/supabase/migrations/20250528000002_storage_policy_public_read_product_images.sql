-- Add Storage RLS policy to allow public read access to the public folder in product-images bucket

CREATE POLICY "Allow public read of public folder"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated -- Or just 'anon' if preferred for fully public images
  USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'public'
  ); 