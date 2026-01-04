
-- Fix admin name for cheragshah@hotmail.com
UPDATE public.profiles
SET first_name = 'Cherag', last_name = 'Shah'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'cheragshah@hotmail.com');
