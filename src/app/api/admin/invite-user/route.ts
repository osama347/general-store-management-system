import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify the requesting user is an admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can invite users' },
        { status: 403 }
      )
    }

    // Get invitation details from request body
    const body = await request.json()
    const { email, full_name, role, location_id, phone } = body

    // Validate required fields
    if (!email || !full_name || !role || !location_id) {
      return NextResponse.json(
        { error: 'Missing required fields: email, full_name, role, location_id' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'warehouse-manager', 'store-manager']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: admin, warehouse-manager, store-manager' },
        { status: 400 }
      )
    }

    // Verify the location belongs to the admin
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('location_id')
      .eq('location_id', location_id)
      .single()

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'Invalid location' },
        { status: 400 }
      )
    }

    // Check if user with this email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Use Supabase Admin API to invite user
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY environment variable
    const supabaseAdmin = createClient() // Pass true to use service role

    const { data: inviteData, error: inviteError } = await (await supabaseAdmin).auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          role,
          location_id: location_id.toString(),
          phone: phone || null,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/callback`,
      }
    )

    if (inviteError) {
      console.error('Invitation error:', inviteError)
      return NextResponse.json(
        { error: inviteError.message || 'Failed to send invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      data: inviteData.user,
    })
  } catch (error: any) {
    console.error('Error in invite-user API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
