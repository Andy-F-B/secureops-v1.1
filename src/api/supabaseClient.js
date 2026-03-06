// src/api/supabaseClient.js
// Drop-in replacement for base44Client.js
// Install: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// ENTITY HELPERS
// Each entity mirrors the Base44 pattern: list, get, create, update, delete
// Usage: import { Officers } from '@/api/supabaseClient'
//        const officers = await Officers.list({ company_code: 'APEX' })
// ============================================================

const makeEntity = (tableName) => ({
  async list(filters = {}) {
    let query = supabase.from(tableName).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(record) {
    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async filter(column, operator, value) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .filter(column, operator, value)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
});

// ============================================================
// ALL ENTITIES - matches your Base44 schema exactly
// ============================================================
export const Officers           = makeEntity('officers');
export const Sites              = makeEntity('sites');
export const Shifts             = makeEntity('shifts');
export const Events             = makeEntity('events');
export const ClockRecords       = makeEntity('clock_records');
export const Certifications     = makeEntity('certifications');
export const Candidates         = makeEntity('candidates');
export const OnboardingRecords  = makeEntity('onboarding_records');
export const OfficerRecords     = makeEntity('officer_records');
export const SOPs               = makeEntity('sops');
export const TrainingModules    = makeEntity('training_modules');
export const Messages           = makeEntity('messages');
export const AuditLog           = makeEntity('audit_log');
export const CustomerBilling    = makeEntity('customer_billing');
export const PortalRequests     = makeEntity('portal_requests');
export const WhitelabelConfig   = makeEntity('whitelabel_config');
export const UserProfiles       = makeEntity('user_profiles');
export const JobPostings        = makeEntity('job_postings');
export const JobSeekerResumes   = makeEntity('job_seeker_resumes');
export const CompanyGallery     = makeEntity('company_gallery');
export const CompanyReviews     = makeEntity('company_reviews');
export const SocialMessages     = makeEntity('social_messages');
export const SocialAnalytics    = makeEntity('social_analytics');

// ============================================================
// FILE STORAGE HELPERS (private buckets — signed URLs)
//
// uploadFile(bucket, file, path) → returns the storage path
//   Store the returned path in your DB, not a URL.
//   Example: const path = await uploadFile('officer-records', file, 'APEX/abc123/warning.pdf')
//
// getSignedUrl(bucket, path, expiresIn?) → returns a temporary URL (default 1 hour)
//   Call this when you need to display or link to a file.
//   Example: const url = await getSignedUrl('officer-records', record.document_path)
//
// deleteFile(bucket, path) → removes the file from storage
// ============================================================

/**
 * Upload a file to a private Supabase Storage bucket.
 * Returns the storage path (store this in your DB, not a URL).
 */
export const uploadFile = async (bucket, file, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return data.path;
};

/**
 * Generate a short-lived signed URL for a private file.
 * Default expiry: 3600 seconds (1 hour).
 */
export const getSignedUrl = async (bucket, path, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

/**
 * Delete a file from storage.
 */
export const deleteFile = async (bucket, path) => {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
  return true;
};
