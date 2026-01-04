
UPDATE public.profiles
SET first_name = 'Cherag', last_name = 'Shah'
WHERE id = (SELECT id FROM auth.users WHERE email = 'cheragshah@hotmail.com');
