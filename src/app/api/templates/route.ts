import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

// GET /api/templates — list all templates (no scene_graph to keep it light)
export async function GET() {
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, thumbnail, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/templates — create a new template
export async function POST(request: Request) {
  const body = await request.json()
  const { name, scene_graph, thumbnail } = body

  if (!name || !scene_graph) {
    return NextResponse.json(
      { error: 'name and scene_graph are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({ name, scene_graph, thumbnail })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
