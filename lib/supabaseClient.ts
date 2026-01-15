import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CourseData } from '../types';

let supabase: SupabaseClient | null = null;

export const getSupabaseClient = (url: string, key: string) => {
  if (!supabase || (supabase as any).supabaseUrl !== url) {
    supabase = createClient(url, key);
  }
  return supabase;
};

// Save course to Supabase
export const saveCourseToCloud = async (client: SupabaseClient, courseData: CourseData, courseId?: string) => {
  const dataToSave = {
    title: courseData.title,
    data: courseData,
    updated_at: new Date().toISOString(),
  };

  if (courseId) {
    // Update existing
    const { data, error } = await client
      .from('courses')
      .update(dataToSave)
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } else {
    // Insert new
    const { data, error } = await client
      .from('courses')
      .insert([dataToSave])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Load latest course (for demo purposes we load the most recently updated one, or specific ID)
export const loadLatestCourse = async (client: SupabaseClient) => {
  const { data, error } = await client
    .from('courses')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
};