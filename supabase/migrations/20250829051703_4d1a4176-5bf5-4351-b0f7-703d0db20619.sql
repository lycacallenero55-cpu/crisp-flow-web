-- First, update all foreign key constraints and references

-- Update sessions table to reference the correct table based on role
-- Since sessions are created by users (instructors, etc.), they should reference users table
ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS sessions_created_by_user_id_fkey;

ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_created_by_user_id_fkey 
FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

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

CREATE POLICY "Admins and instructors can insert sessions" 
ON public.sessions 
FOR INSERT 
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Admins and instructors can update sessions" 
ON public.sessions 
FOR UPDATE 
USING (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Admins and instructors can delete sessions" 
ON public.sessions 
FOR DELETE 
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

CREATE POLICY "Admins and instructors can insert attendance" 
ON public.attendance 
FOR INSERT 
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Admins and instructors can update attendance" 
ON public.attendance 
FOR UPDATE 
USING (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Admins and instructors can delete attendance" 
ON public.attendance 
FOR DELETE 
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

CREATE POLICY "Admins and instructors can insert students" 
ON public.students 
FOR INSERT 
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Admins and instructors can update students" 
ON public.students 
FOR UPDATE 
USING (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);

CREATE POLICY "Admins and instructors can delete students" 
ON public.students 
FOR DELETE 
USING (
  (EXISTS (SELECT 1 FROM public.admin WHERE admin.id = auth.uid()))
  OR
  (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ROTC admin', 'Instructor')))
);