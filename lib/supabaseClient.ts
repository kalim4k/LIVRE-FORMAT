
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CourseData } from '../types';

let supabase: SupabaseClient | null = null;

export const getSupabaseClient = (url: string, key: string) => {
  if (!supabase || (supabase as any).supabaseUrl !== url) {
    supabase = createClient(url, key);
  }
  return supabase;
};

// Upload file to 'media' bucket
export const uploadFile = async (client: SupabaseClient, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await client
      .storage
      .from('media') // Assurez-vous d'avoir créé ce bucket "public" dans Supabase
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = client.storage.from('media').getPublicUrl(filePath);
    return data.publicUrl;
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
