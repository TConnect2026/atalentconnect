import { NextRequest, NextResponse } from 'next/server'
import { requireFirmAccessToInterview } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const { interviewId } = await request.json()

    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireFirmAccessToInterview(interviewId)
    if (!auth.ok) return auth.response

    // Fetch interview details (service role, post-firm-check) with joined
    // candidate/search/interviewers for formatting the reminder email.
    const { data: interview, error: interviewError } = await auth.supabaseAdmin
      .from('interviews')
      .select(`
        *,
        candidates(first_name, last_name),
        searches(company_name, position_title, secure_link),
        interviewers:interview_interviewers(contact_id, contact_name, contact_email)
      `)
      .eq('id', interviewId)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    const candidate = interview.candidates
    const search = interview.searches
    const interviewers = interview.interviewers || []

    // Format interview date/time
    const interviewDate = new Date(interview.scheduled_at)
    const formattedDate = interviewDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = interviewDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    // Portal URL for interview details
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/${search.secure_link}/portal`

    // Send reminder to each interviewer
    for (const interviewer of interviewers) {
      // TODO: Send actual email via email service (Resend, SendGrid, etc.)
      // For now, log to console
      console.log('='.repeat(80))
      console.log('INTERVIEW REMINDER EMAIL')
      console.log('='.repeat(80))
      console.log('To:', interviewer.contact_email)
      console.log('Name:', interviewer.contact_name)
      console.log('Subject:', `Reminder: Interview with ${candidate.first_name} ${candidate.last_name}`)
      console.log('')
      console.log('Interview Details:')
      console.log('- Position:', `${search.position_title} at ${search.company_name}`)
      console.log('- Candidate:', `${candidate.first_name} ${candidate.last_name}`)
      console.log('- Date:', formattedDate)
      console.log('- Time:', formattedTime)
      console.log('- Duration:', `${interview.duration_minutes} minutes`)
      console.log('- Type:', interview.interview_type)
      console.log('')
      if (interview.prep_notes) {
        console.log('Prep Notes:')
        console.log(interview.prep_notes)
        console.log('')
      }
      if (interview.interview_guide_url) {
        console.log('Interview Guide:', interview.interview_guide_url)
      }
      console.log('')
      console.log('View interview details and submit feedback:')
      console.log(portalUrl)
      console.log('='.repeat(80))
    }

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${interviewers.length} interviewer(s)`,
      interviewers: interviewers.map((i: any) => ({ name: i.contact_name, email: i.contact_email }))
    })
  } catch (error) {
    console.error('Error sending interview reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
