import { supabase } from '@/integrations/supabase/client';
import type { 
  Session, 
  Student, 
  AttendanceRecord, 
  SessionWithStudents, 
  Signature, 
  SignatureUploadOptions,
  SignatureMatchResult,
  User
} from '@/types';

// Session operations
export const fetchSessions = async (startDate?: string, endDate?: string): Promise<Session[]> => {
  try {
    console.log('Fetching sessions with date range:', { startDate, endDate });
    
    let query = supabase
      .from('sessions')
      .select(`
        *,
        creator:created_by_user_id(
          first_name,
          last_name,
          role
        )
      `)
      .order('date', { ascending: true });

    // Ensure dates are in YYYY-MM-DD format for comparison
    if (startDate) {
      const start = new Date(startDate);
      const formattedStart = start.toISOString().split('T')[0];
      query = query.gte('date', formattedStart);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      const formattedEnd = end.toISOString().split('T')[0];
      query = query.lte('date', formattedEnd);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log('Fetched sessions:', data);
    return (data as any) || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

export const createSession = async (sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at' | 'created_by_user_id'>): Promise<Session> => {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User must be authenticated to create sessions');
  }

  // Add the creator's user ID automatically
  const sessionWithCreator = {
    ...sessionData,
    created_by_user_id: user.id
  };

  const { data, error } = await supabase
    .from('sessions')
    .insert([sessionWithCreator] as any)
    .select()
    .single();
  
  if (error) throw error;
  return data as Session;
};

export const updateSession = async (id: number, sessionData: Partial<Session>): Promise<Session> => {
  const { data, error } = await supabase
    .from('sessions')
    .update(sessionData as any)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Session;
};

export const deleteSession = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Student operations
export const fetchStudents = async (program?: string, year?: string, section?: string): Promise<Student[]> => {
  try {
    console.log('Fetching students with filters:', { program, year, section });
    
    // Helper function to fetch all students with pagination
    const fetchAllStudents = async (baseQuery: any): Promise<Student[]> => {
      const allStudents: Student[] = [];
      let from = 0;
      const pageSize = 1000; // Supabase default limit
      
      while (true) {
        const { data, error } = await baseQuery.range(from, from + pageSize - 1);
        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allStudents.push(...data);
        
        // If we got less than pageSize, we've reached the end
        if (data.length < pageSize) break;
        
        from += pageSize;
      }
      
      return allStudents;
    };
    
    // Build the base query
    let baseQuery = supabase
      .from('students')
      .select('*')
      .order('surname', { ascending: true });

    // Apply program filter if it's a specific program (not 'all' or empty string)
    if (program && program !== 'All Programs') {
      baseQuery = baseQuery.eq('program', program.trim());
    }

    // Apply year filter if it's a specific year (not 'all')
    if (year && year !== 'All Years') {
      // Use the correct field name 'year' instead of 'year_level'
      baseQuery = baseQuery.eq('year', year.trim());
    }

    // Fetch all matching students with pagination
    const allStudents = await fetchAllStudents(baseQuery);
    console.log(`Found ${allStudents?.length || 0} students matching program and year`);
    
    // If no section filter or 'All Sections', return all matching students
    if (!section || section === 'All Sections' || !allStudents?.length) {
      return allStudents?.map(s => ({
        ...s,
        full_name: `${s.firstname} ${s.surname}`
      })) || [];
    }

    // Normalize section for comparison (trim and make uppercase)
    const normalizedSection = section.trim().toUpperCase();
    console.log('Filtering by section:', { original: section, normalized: normalizedSection });

    // Try different section matching strategies
    const filteredStudents = allStudents.filter(student => {
      if (!student.section) return false;
      
      const studentSection = student.section.trim().toUpperCase();
      
      // 1. Try exact match
      if (studentSection === normalizedSection) return true;
      
      // 2. Try without spaces
      if (studentSection.replace(/\s+/g, '') === normalizedSection.replace(/\s+/g, '')) {
        return true;
      }
      
      // 3. Try matching just the section number/letter part (e.g., '1D' from 'BPED 1D')
      const sectionNumber = normalizedSection.match(/\d+[A-Za-z]*/)?.[0];
      if (sectionNumber && studentSection.includes(sectionNumber)) {
        return true;
      }
      
      return false;
    });

    console.log(`Filtered to ${filteredStudents.length} students matching section '${section}'`);
    
    // If we found matches with section filter, return them
    if (filteredStudents.length > 0) {
      return filteredStudents.map(s => ({
        ...s,
        full_name: `${s.firstname} ${s.surname}`
      }));
    }
    
    // If no matches with section filter, return all students that matched program/year
    console.log('No students matched section filter, returning all students matching program/year');
    return allStudents.map(s => ({
      ...s,
      full_name: `${s.firstname} ${s.surname}`
    }));
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
};

export const createStudent = async (studentData: Omit<Student, 'id' | 'created_at'>): Promise<Student> => {
  const { data, error } = await supabase
    .from('students')
    .insert([studentData] as any)
    .select()
    .single();
  
  if (error) throw error;
  return data as Student;
};

export const updateStudent = async (id: number, studentData: Partial<Student>): Promise<Student> => {
  const { data, error } = await supabase
    .from('students')
    .update(studentData as any)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Student;
};

export const deleteStudent = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Attendance operations
export const fetchSessionStudents = async (sessionId: number): Promise<SessionWithStudents> => {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }
  
  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (sessionError) throw sessionError;
  if (!session) throw new Error('Session not found');

  const sessionData = session as any;

  console.log('Full session object:', JSON.stringify(sessionData, null, 2));

  // Helper function to check if a value represents 'all' (case insensitive and includes 'all')
  const isAllValue = (value?: string) => {
    if (!value) return true;
    const lowerValue = value.toLowerCase().trim();
    return lowerValue.includes('all') || lowerValue === '' || lowerValue === 'all programs' || lowerValue === 'all year levels' || lowerValue === 'all sections';
  };

  // Helper function to fetch all students with pagination
  const fetchAllStudents = async (baseQuery: any): Promise<Student[]> => {
    const allStudents: Student[] = [];
    let from = 0;
    const pageSize = 1000; // Supabase default limit
    
    while (true) {
      const { data, error } = await baseQuery.range(from, from + pageSize - 1);
      if (error) throw error;
      
      if (!data || data.length === 0) break;
      
      allStudents.push(...data);
      
      // If we got less than pageSize, we've reached the end
      if (data.length < pageSize) break;
      
      from += pageSize;
    }
    
    return allStudents;
  };

  // Log all fields in the session object for debugging
  console.log('Session object:', JSON.stringify(sessionData, null, 2));
  
  // Get the section value - check all possible field names
  const sectionValue = sessionData.section || sessionData.session_section;
  
  console.log('Using filters:', {
    program: sessionData.program,
    year: sessionData.year,
    section: sectionValue
  });

  let allStudents: Student[] = [];
  
  // Build the base query for fetching students
  try {
    console.log('Fetching students with filters:', {
      program: sessionData.program,
      year: sessionData.year,
      section: sectionValue
    });
    
    // Build the base query
    let baseQuery = supabase
      .from('students')
      .select('*')
      .order('id');
      
    console.log('Base query created');
      
    // Apply program filter if specified and not "all"
    if (sessionData.program && !isAllValue(sessionData.program)) {
      const programValue = sessionData.program.trim();
      console.log('Applying program filter:', programValue);
      baseQuery = baseQuery.eq('program', programValue);
    }
    
    // Apply year filter if specified and not "all"
    if (sessionData.year && !isAllValue(sessionData.year)) {
      let yearValue = sessionData.year.trim();
      // Convert year format if needed (e.g., '1st Year' to '1st')
      if (yearValue.endsWith(' Year')) {
        yearValue = yearValue.replace(' Year', '');
      }
      console.log('Applying year filter:', yearValue);
      baseQuery = baseQuery.eq('year', yearValue);
    }
    
    // Apply section filter if specified and not "all"
    if (sectionValue && !isAllValue(sectionValue)) {
      const sectionFilter = sectionValue.trim();
      console.log('Applying section filter:', sectionFilter);
      baseQuery = baseQuery.eq('section', sectionFilter);
    }
    
    // Execute the query with pagination
    console.log('Executing query with filters and pagination');
    allStudents = await fetchAllStudents(baseQuery);
    console.log(`Found ${allStudents.length} students with exact filters`);
    
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  const students = allStudents || [];
  
  if (!sessionData) {
    throw new Error('Session not found');
  }

  // Get attendance records for this session
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .eq('session_id', sessionId);
  
  if (attendanceError) throw attendanceError;

  // Merge student data with attendance
  const studentsWithAttendance = students.map(student => {
    const attendanceRecord = (attendance as any)?.find((a: any) => a.student_id === student.id) || null;
    return {
      ...student,
      full_name: `${student.firstname} ${student.surname}`,
      status: attendanceRecord?.status || null,
      time_in: attendanceRecord?.time_in || null,
      time_out: attendanceRecord?.time_out || null,
    };
  });

  const sessionInfo = {
    id: sessionData.id,
    title: sessionData.title,
    date: sessionData.date,
    time_in: sessionData.time_in || null,
    time_out: sessionData.time_out || null,
    program: sessionData.program,
    year: sessionData.year,
    section: sessionData.section,
    description: sessionData.description || '',
    type: sessionData.type || 'class'
  };

  return {
    session: sessionInfo,
    students: studentsWithAttendance,
    count: studentsWithAttendance.length,
  };
};

export const markAttendance = async (
  sessionId: number,
  studentId: number,
  status: 'present' | 'absent' | 'late' | 'excused',
  timeIn?: string,
  timeOut?: string
): Promise<AttendanceRecord> => {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        session_id: sessionId,
        student_id: studentId,
        status,
        time_in: timeIn || null,
        time_out: timeOut || null,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'session_id,student_id' }
    )
    .select();

  if (error) {
    console.error('Error fetching attendance records:', error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    throw new Error('No attendance record was created or updated');
  }
  return data[0] as unknown as AttendanceRecord;
};

export const getStudentSignatures = async (studentId: number): Promise<Signature[]> => {
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    console.error('Error getting student signatures:', error);
    return [];
  }

  return data as unknown as Signature[];
};

export const getPrimarySignature = async (studentId: number): Promise<Signature | null> => {
  const { data, error } = await supabase
    .rpc('get_primary_signature', { student_id: studentId } as any)
    .single();

  if (error) {
    console.error('Error getting primary signature:', error);
    return null;
  }

  return data as unknown as Signature | null;
};

export const compareSignatures = async (signature1Id: number, signature2Id: number): Promise<number> => {
  const { data, error } = await supabase
    .rpc('compare_signatures', { 
      sig1_id: signature1Id, 
      sig2_id: signature2Id 
    } as any)
    .single();

  if (error) {
    console.error('Error comparing signatures:', error);
    throw new Error(error.message);
  }
  
  return data as number;
};

export const matchSignature = async (studentId: number, file: File, threshold = 0.7): Promise<SignatureMatchResult> => {
  // 1. Upload the new signature
  const { signature: newSignature } = await uploadSignature(studentId, file);
  
  if (!newSignature) {
    throw new Error('Failed to upload signature');
  }
  
  try {
    // 2. Get all existing signatures for the student
    const existingSignatures = await getStudentSignatures(studentId);
    
    if (!existingSignatures || existingSignatures.length === 0) {
      return {
        signature: newSignature,
        score: 0,
        isMatch: false
      };
    }
    
    // 3. Compare with each existing signature
    let bestMatch: { signature: Signature; score: number } | null = null;
    
    for (const existingSig of existingSignatures) {
      if (existingSig.id === newSignature.id) continue; // Skip the one we just uploaded
      
      const score = await compareSignatures(newSignature.id, existingSig.id);
      
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { signature: existingSig, score };
      }
    }
    
    // 4. Determine if it's a match
    const isMatch = bestMatch ? bestMatch.score >= threshold : false;
    
    return {
      signature: newSignature,
      score: bestMatch?.score || 0,
      isMatch,
    };
  } catch (error) {
    console.error('Error matching signature:', error);
    throw error;
  }
};

export const uploadSignature = async (
  studentId: number, 
  file: File, 
  options: SignatureUploadOptions = {},
  onProgress?: (progress: number) => void
): Promise<{ url: string; signature: Signature }> => {
  try {
    // 1. Read the file as data URL for preview
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `signatures/${studentId}/${fileName}`;
  
    // 2. Upload the file to storage
    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error uploading signature:', uploadError);
      throw new Error(uploadError.message);
    }

    // 3. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('signatures')
      .getPublicUrl(filePath);

    // 4. Create a new signature record in the database
    const signatureData: Omit<Signature, 'id' | 'created_at' | 'updated_at'> = {
      student_id: studentId,
      storage_path: filePath,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      device_info: {
        user_agent: options.deviceInfo?.userAgent || navigator.userAgent,
        screen_resolution: options.deviceInfo?.screenResolution || `${window.screen.width}x${window.screen.height}`,
        timezone: options.deviceInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(options.deviceInfo || {})
      },
      ...(options.features ? { features: options.features } : {}),
      ...(options.quality_score ? { quality_score: options.quality_score } : {}),
      ...(options.width ? { width: options.width } : {}),
      ...(options.height ? { height: options.height } : {})
    };

    const { data: signature, error: signatureError } = await supabase
      .from('signatures')
      .insert([signatureData] as any)
      .select()
      .single();

    if (signatureError) {
      console.error('Error creating signature record:', signatureError);
      // Clean up the uploaded file if the database insert fails
      await supabase.storage.from('signatures').remove([filePath]);
      throw new Error(signatureError.message);
    }

    return { 
      url: publicUrl, 
      signature: signature as Signature 
    };
  } catch (error) {
    console.error('Error in uploadSignature:', error);
    throw error;
  }
};

// User operations
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  // Get additional user data from profiles table if needed
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return {
    id: user.id,
    email: user.email || '',
    name: (profile as any)?.full_name || user.user_metadata?.full_name || '',
    role: (profile as any)?.role || 'ssg_officer',
    avatar_url: (profile as any)?.avatar_url || '',
  };
};

export const updateUserProfile = async (updates: Partial<User>): Promise<User> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Update auth user if email is being changed
  if (updates.email) {
    const { error } = await supabase.auth.updateUser({
      email: updates.email,
      data: { full_name: updates.name },
    });
    if (error) throw error;
  }
  
  // Update profile
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: updates.name,
      role: updates.role,
      updated_at: new Date().toISOString(),
    } as any)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: user.id,
    email: updates.email || user.email || '',
    name: (data as any).full_name,
    role: (data as any).role,
    avatar_url: (data as any).avatar_url || '',
  };
};