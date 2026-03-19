// Supabase auth module
// SETUP: Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values from supabase.com
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://ctzmxxvkzwxaewzwrsjf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0em14eHZrend4YWV3endyc2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDQwMjksImV4cCI6MjA4OTUyMDAyOX0.KXwa-Mf4JQbkCDbddfALX6Mc2WMIvT-XVuU8ISohs00';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get current session
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Get current user
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Register with email + password
export async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// Login
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Logout
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Load profile for current user
export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Save / update profile
export async function saveProfile(userId, profile) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Load checklist statuses for current user
export async function loadChecklistStatus(userId) {
  const { data, error } = await supabase
    .from('checklist_status')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

// Update a single checklist item
export async function upsertChecklistItem(userId, docId, status, note) {
  const { error } = await supabase
    .from('checklist_status')
    .upsert({
      user_id: userId,
      doc_id: String(docId),
      status,
      note: note || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,doc_id' });
  if (error) throw error;
}

// Load checklist items from DB (global list seeded by admin)
export async function loadChecklistItems() {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

// Log an activity
export async function logActivity(userId, action, payload = {}) {
  const { error } = await supabase
    .from('activity_log')
    .insert({ user_id: userId, action, payload });
  if (error) console.warn('Activity log error:', error);
}

// Load recent activity log
export async function loadActivityLog(userId, limit = 50) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Listen to auth state changes
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
