/**
 * insforge-cms.src.js
 * Source file to be bundled by esbuild.
 */
import { createClient } from '@insforge/sdk';

const INSFORGE_BASE_URL = 'https://fkesre74.us-east.insforge.app';
const INSFORGE_ANON_KEY = 'ik_04cdaa36dc4b9fe1f80d5c41b1786df8';

const client = createClient({
  baseUrl: INSFORGE_BASE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

function getClient() {
  return client;
}

// 2. Auth helpers
async function authSignUp(email, password, name) {
  const { data, error } = await client.auth.signUp({ email, password, name });
  return { data: data?.user || null, error };
}

async function authSignIn(email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data: data?.user || null, error };
}

async function authSignInGoogle() {
  await client.auth.signInWithOAuth('google', {
    redirectTo: window.location.href,
    additionalParams: { prompt: 'select_account' },
  });
}

async function authSignOut() {
  await client.auth.signOut();
  window.location.reload();
}

async function authCurrentUser() {
  const { data } = await client.auth.getCurrentUser();
  return data?.user || null;
}

// 3. CMS Posts helpers
async function fetchPublishedPosts() {
  const { data, error } = await client.database
    .from('cms_posts')
    .select('id, title, slug, content, published_at, meta')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) console.error('fetchPublishedPosts error', error);
  return data || [];
}

async function fetchMyPosts() {
  const { data, error } = await client.database
    .from('cms_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error('fetchMyPosts error', error);
  return data || [];
}

async function createPost({ title, slug, content, status = 'draft', post_type = 'post', meta = {} }) {
  const user = await authCurrentUser();
  if (!user) return null;
  const { data, error } = await client.database.from('cms_posts').insert([{
    title,
    slug,
    content: typeof content === 'string' ? { html: content } : content,
    status,
    post_type,
    meta,
    author_id: user.id,
    published_at: status === 'published' ? new Date().toISOString() : null,
  }]);
  if (error) console.error('createPost error', error);
  return data;
}

async function updatePost(id, updates) {
  if (updates.status === 'published' && !updates.published_at) {
    updates.published_at = new Date().toISOString();
  }
  updates.updated_at = new Date().toISOString();
  const { data, error } = await client.database.from('cms_posts').update(updates).eq('id', id);
  if (error) console.error('updatePost error', error);
  return data;
}

async function deletePost(id) {
  const { error } = await client.database.from('cms_posts').delete().eq('id', id);
  if (error) console.error('deletePost error', error);
}

// 4. Leads helpers (authenticated)
async function submitLead({ name, email, service, service_type, message }) {
  const user = await authCurrentUser();
  const selectedService = service_type || service;
  const { data, error } = await client.database.from('leads').insert([{
    name,
    email,
    service_type: selectedService,
    message,
    user_id: user ? user.id : null,
  }]);
  if (error) console.error('submitLead error', error);
  return { data, error };
}

async function fetchMyLeads() {
  const { data, error } = await client.database.from('leads').select('*').order('created_at', { ascending: false });
  if (error) console.error('fetchMyLeads error', error);
  return data || [];
}

// 5. Media upload helper
async function uploadMedia(file) {
  const user = await authCurrentUser();
  if (!user) return null;
  const key = `${user.id}/${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await client.storage.from('cms-media').upload(key, file);
  if (uploadError) { console.error('uploadMedia error', uploadError); return null; }
  const url = `${INSFORGE_BASE_URL}/storage/v1/object/public/cms-media/${key}`;
  // Record the media in the database
  const { data, error } = await client.database.from('cms_media').insert([{
    owner_id: user.id,
    bucket: 'cms-media',
    key,
    url,
    mime_type: file.type,
    file_size: file.size,
    alt_text: file.name,
  }]);
  if (error) console.error('cms_media insert error', error);
  return url;
}

// 6. Expose to global scope for use in HTML event handlers
window.cms = {
  getClient,
  authSignUp,
  authSignIn,
  authSignInGoogle,
  authSignOut,
  authCurrentUser,
  fetchPublishedPosts,
  fetchMyPosts,
  createPost,
  updatePost,
  deletePost,
  submitLead,
  fetchMyLeads,
  uploadMedia,
};
