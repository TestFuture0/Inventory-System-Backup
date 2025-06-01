-- TEMPORARY DEBUGGING POLICY - INSECURE - REMOVE AFTER TESTING
-- Allows any authenticated user to upload any file to the 'product-images' bucket.

CREATE POLICY "TEMP - Allow ALL Authenticated Uploads to product-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
  ); 