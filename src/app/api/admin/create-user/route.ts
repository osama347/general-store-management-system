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
        { error: 'Only admins can create users' },
        { status: 403 }
      )
    }

    // Get user details from request body
    const body = await request.json()
    const { email, password, full_name, role, location_id, phone } = body

    // Validate required fields
    if (!email || !password || !full_name || !role || !location_id) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, full_name, role, location_id' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
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

    // Use standard Supabase signup method
    const { data: newUser, error: createError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
          location_id: location_id.toString(),
          phone: phone || null,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/callback`,
      },
    })

    if (createError) {
      console.error('User creation error:', createError)
      return NextResponse.json(
        { error: createError.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully. Confirmation email sent.',
      data: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
        role,
        location_id,
      },
    })
  } catch (error: any) {
    console.error('Error in create-user API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
