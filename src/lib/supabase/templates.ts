import { supabase } from './client'
import type { GroupNode } from '@/lib/canvas/types'

export interface SavedTemplate {
  id: string
  name: string
  thumbnail: string | null
  created_at: string
}

export interface SavedTemplateDetail extends SavedTemplate {
  scene_graph: GroupNode
  updated_at: string
}

/**
 * Converts a base64 data URL to a Blob for uploading to Supabase Storage.
 */
function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i)
  return new Blob([buffer], { type: mime })
}

/**
 * Uploads a thumbnail data URL to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
async function uploadThumbnail(dataURL: string, templateName: string): Promise<string | null> {
  const blob = dataURLtoBlob(dataURL)
  const filename = `${Date.now()}-${templateName.replace(/\s+/g, '-')}.png`

  const { error } = await supabase.storage
    .from('thumbnails')
    .upload(filename, blob, { contentType: 'image/png', upsert: false })

  if (error) {
    console.error('Thumbnail upload failed:', error)
    return null
  }

  const { data } = supabase.storage.from('thumbnails').getPublicUrl(filename)
  return data.publicUrl
}

/**
 * Saves a new template to the database.
 * Uploads the thumbnail to Storage first, then POSTs to the API.
 */
export async function saveTemplate(
  name: string,
  sceneGraph: GroupNode,
  thumbnailDataURL: string | null
): Promise<SavedTemplate> {
  const thumbnail = thumbnailDataURL
    ? await uploadThumbnail(thumbnailDataURL, name)
    : null

  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, scene_graph: sceneGraph, thumbnail }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error ?? 'Failed to save template')
  }

  return response.json()
}

/**
 * Fetches all templates (without scene_graph) for the dashboard.
 */
export async function getTemplates(): Promise<SavedTemplate[]> {
  const response = await fetch('/api/templates')
  if (!response.ok) throw new Error('Failed to fetch templates')
  return response.json()
}

/**
 * Fetches a single template including scene_graph for loading in the editor.
 */
export async function getTemplate(id: string): Promise<SavedTemplateDetail> {
  const response = await fetch(`/api/templates/${id}`)
  if (!response.ok) throw new Error('Template not found')
  return response.json()
}

/**
 * Deletes a template by ID.
 */
export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete template')
}
