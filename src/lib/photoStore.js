// Car photos (odometer, oil-change stickers) live in Supabase Storage under
// car-photos/{uuid}. No per-user folders — see supabase/schema.sql, there's no
// login, so anyone with the anon key can read this bucket.

import { supabase } from './supabaseClient';

const BUCKET = 'car-photos';

export async function savePhoto(file) {
  const path = crypto.randomUUID();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

// Bucket is private, so display needs a short-lived signed URL rather than a public one.
export async function getPhotoURL(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) {
    console.error('Failed to sign photo URL:', error);
    return null;
  }
  return data.signedUrl;
}

export async function deletePhoto(path) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
