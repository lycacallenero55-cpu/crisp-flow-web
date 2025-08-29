-- First, update all foreign key constraints and references

-- Update sessions table to reference the correct table based on role
-- Since sessions are created by users (instructors, etc.), they should reference users table
ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS sessions_created_by_user_id_fkey;

ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_created_by_user_id_fkey 
FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Update any other tables that might reference profiles
-- Check excuse_applications table - reviewers could be from either admin or users
-- We'll need to handle this based on the role

-- Update RLS policies that reference profiles table
-- Drop existing policies that reference profiles
DROP POLICY IF EXISTS "Users can view signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can insert their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can update their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can delete their own signatures" ON public.signatures;
DROP POLICY IF EXISTS "Users can view their own signatures" ON public.signatures;

-- Create new policies that check both admin and users tables
CREATE POLICY "Users can view signatures" 
ON public.signatures 
FOR SELECT 
USING (
  (student_id IN (SELECT students.id FROM students WHERE students.id = (auth.uid()::text)::bigint)) 
  OR 
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Users can insert signatures" 
ON public.signatures 
FOR INSERT 
WITH CHECK (
  (student_id IN (SELECT students.id FROM students WHERE students.id = (auth.uid()::text)::bigint))
  OR 
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Users can update signatures" 
ON public.signatures 
FOR UPDATE 
USING (
  (student_id IN (SELECT students.id FROM students WHERE students.id = (auth.uid()::text)::bigint))
  OR 
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Users can delete signatures" 
ON public.signatures 
FOR DELETE 
USING (
  (student_id IN (SELECT students.id FROM students WHERE students.id = (auth.uid()::text)::bigint))
  OR 
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

-- Update the existing broad policies on other tables
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sessions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.students;

-- Create more specific policies for sessions
CREATE POLICY "Authenticated users can view sessions" 
ON public.sessions 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and instructors can manage sessions" 
ON public.sessions 
FOR ALL 
USING (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

-- Create policies for attendance
CREATE POLICY "Authenticated users can view attendance" 
ON public.attendance 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and instructors can manage attendance" 
ON public.attendance 
FOR INSERT, UPDATE, DELETE 
USING (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

-- Create policies for students
CREATE POLICY "Authenticated users can view students" 
ON public.students 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and instructors can manage students" 
ON public.students 
FOR INSERT, UPDATE, DELETE 
USING (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

-- Update functions that reference profiles
-- Update is_admin function to check admin table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin 
    WHERE id = auth.uid()
  );
$$;

-- Update is_staff function to check both admin and users with appropriate roles
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('ROTC admin', 'Instructor')
  );
$$;

-- Create new function to check if user is instructor
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('ROTC admin', 'Instructor')
  );
$$;

-- Update approve_user and reject_user functions to work with new tables
CREATE OR REPLACE FUNCTION public.approve_user(user_id uuid, approver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if it's an admin approval
  IF EXISTS (SELECT 1 FROM public.admin WHERE id = user_id) THEN
    UPDATE public.admin
    SET 
      status = 'active',
      approved_by = approver_id,
      approved_at = now()
    WHERE id = user_id AND status = 'pending';
  ELSE
    -- Otherwise it's a regular user
    UPDATE public.users
    SET 
      status = 'active',
      approved_by = approver_id,
      approved_at = now()
    WHERE id = user_id AND status = 'pending';
  END IF;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'User approved successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'User not found or already processed');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_user(user_id uuid, rejector_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if it's an admin rejection
  IF EXISTS (SELECT 1 FROM public.admin WHERE id = user_id) THEN
    UPDATE public.admin
    SET 
      status = 'inactive',
      rejected_by = rejector_id,
      rejected_at = now()
    WHERE id = user_id AND status = 'pending';
  ELSE
    -- Otherwise it's a regular user
    UPDATE public.users
    SET 
      status = 'inactive',
      rejected_by = rejector_id,
      rejected_at = now()
    WHERE id = user_id AND status = 'pending';
  END IF;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'User rejected successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'User not found or already processed');
  END IF;
END;
$$;

-- Update handle_new_user function to route new users appropriately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if the user should be an admin (you can customize this logic)
  -- For now, we'll default to users table unless explicitly marked as admin
  IF NEW.raw_user_meta_data ->> 'is_admin' = 'true' THEN
    INSERT INTO public.admin (id, email, first_name, last_name, status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      'pending'
    );
  ELSE
    INSERT INTO public.users (id, email, first_name, last_name, role, status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name', 
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'Instructor'),
      'pending'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Now drop the old profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;