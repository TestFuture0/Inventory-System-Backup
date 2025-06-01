-- Add Storage RLS policy to allow authenticated users to upload to the public folder in product-images bucket

CREATE POLICY "Allow authenticated uploads to public folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'public'
  ); 