import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export async function GET(req: NextRequest) {
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let storagePath = req.nextUrl.searchParams.get('path')
  if (!storagePath) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  // Handle old records that stored a full URL instead of just the path
  if (storagePath.includes('/project-documents/')) {
    const parts = storagePath.split('/project-documents/')
    storagePath = decodeURIComponent(parts[parts.length - 1])
  }

  const { data, error } = await supabase.storage
    .from('project-documents')
    .createSignedUrl(storagePath, 60 * 60) // 1 hour expiry

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null
  const description = formData.get('description') as string | null

  if (!file || !projectId) {
    return NextResponse.json({ error: 'file and projectId are required' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 25MB limit' }, { status: 400 })
  }

  // Determine role: developer or client
  const { data: project } = await supabase
    .from('projects')
    .select('developer_id, client_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  let role: 'developer' | 'client' | null = null
  if (project.developer_id === user.id) {
    role = 'developer'
  } else {
    // Check if user is the client
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('id', project.client_id)
      .single()
    if (client) role = 'client'
  }

  if (!role) {
    return NextResponse.json({ error: 'Not authorized for this project' }, { status: 403 })
  }

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'bin'
  const storagePath = `${projectId}/${Date.now()}-${file.name}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Store the storage path (not a public URL — bucket is private)
  // We'll generate signed URLs when serving documents

  // Create database record
  const { data: doc, error: insertError } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      uploaded_by_user_id: user.id,
      uploaded_by_role: role,
      file_name: file.name,
      file_url: storagePath,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      description: description || null,
    })
    .select('*')
    .single()

  if (insertError) {
    // Clean up uploaded file
    await supabase.storage.from('project-documents').remove([storagePath])
    return NextResponse.json({ error: `Failed to save record: ${insertError.message}` }, { status: 500 })
  }

  return NextResponse.json({ document: doc })
}

export async function DELETE(req: NextRequest) {
  const serverSupabase = await createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { documentId } = await req.json()
  if (!documentId) {
    return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
  }

  // Fetch the document
  const { data: doc } = await supabase
    .from('project_documents')
    .select('*, project:projects(developer_id, client_id)')
    .eq('id', documentId)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const project = doc.project as { developer_id: string; client_id: string }

  // Authorization check
  const isDeveloper = project.developer_id === user.id
  const isClientUploader = doc.uploaded_by_user_id === user.id && doc.uploaded_by_role === 'client'

  if (!isDeveloper && !isClientUploader) {
    return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 })
  }

  // Delete from storage — file_url may be a path or a full URL (legacy)
  let deletePath = doc.file_url
  if (deletePath.includes('/project-documents/')) {
    const parts = deletePath.split('/project-documents/')
    deletePath = decodeURIComponent(parts[parts.length - 1])
  }
  await supabase.storage.from('project-documents').remove([deletePath])

  // Delete record
  await supabase.from('project_documents').delete().eq('id', documentId)

  return NextResponse.json({ success: true })
}
