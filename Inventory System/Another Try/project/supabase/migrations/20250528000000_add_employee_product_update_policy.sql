-- Add RLS policy to allow employees to update product stock

CREATE POLICY "Employees can update product stock"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() AND user_profiles.role = 'employee'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid() AND user_profiles.role = 'employee'
    )
  ); 