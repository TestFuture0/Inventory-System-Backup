-- Clear existing policies (if any) for product-images bucket
DROP POLICY IF EXISTS "Allow public read of public folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert to public folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from public folder" ON storage.objects;

-- Allow public read access to files in the 'public' folder within the 'product-images' bucket
CREATE POLICY "Allow public read of public folder"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'public'
);

-- Allow authenticated users to upload files to the 'public' folder within the 'product-images' bucket
CREATE POLICY "Allow authenticated insert to public folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'product-images' AND
    role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'public'
);

-- Allow authenticated users to delete files from the 'public' folder within the 'product-images' bucket
-- This policy allows an authenticated user to delete ANY file in the 'public' folder.
-- Consider adding more specific checks if needed, e.g., matching user ID with a file owner column if you implement such logic.
CREATE POLICY "Allow authenticated delete from public folder"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'product-images' AND
    role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'public'
); 