import { NextRequest, NextResponse } from 'next/server'
import { generateICS, generateCancellationICS, formatEmailDate, formatEmailTime } from '@/lib/calendar-utils'

/**
 * Send interview calendar invites via email
 *
 * This endpoint sends .ics calendar invites to:
 * - Candidate
 * - All interviewers
 * - Recruiter (organizer)
 *
 * For production, integrate with:
 * - Resend (https://resend.com)
 * - SendGrid (https://sendgrid.com)
 * - Amazon SES
 *
 * For now, this is a mock implementation that returns success.
 */

interface SendInviteRequest {
  interview: {
    id: string
    candidate_name: string
    candidate_email: string
    stage_name: string
    position_title: string
    company_name: string
    scheduled_at: string
    duration_minutes: number
    location: string
    timezone: string
    notes?: string
    interview_guide_url?: string
  }
  interviewers: Array<{
    name: string
    email: string
  }>
  recruiter: {
    name: string
    email: string
  }
  type: 'new' | 'update' | 'cancel'
  portal_link?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendInviteRequest = await request.json()
    const { interview, interviewers, recruiter, type, portal_link } = body

    // Calculate start and end times
    const startTime = new Date(interview.scheduled_at)
    const endTime = new Date(startTime.getTime() + interview.duration_minutes * 60000)

    // Create event object
    const event = {
      title: `${interview.candidate_name} — ${interview.stage_name} Interview`,
      description: generateDescription(interview, portal_link),
      location: interview.location,
      startTime,
      endTime,
      organizer: {
        name: recruiter.name,
        email: recruiter.email
      },
      attendees: [
        { name: interview.candidate_name, email: interview.candidate_email },
        ...interviewers,
        { name: recruiter.name, email: recruiter.email }
      ],
      uid: `interview-${interview.id}@atalentconnect.com`
    }

    // Generate .ics file
    const icsContent = type === 'cancel'
      ? generateCancellationICS(event)
      : generateICS(event)

    // Prepare email content
    const emailSubject = type === 'cancel'
      ? `Interview Cancelled: ${interview.candidate_name} — ${interview.stage_name}`
      : type === 'update'
      ? `Interview Updated: ${interview.candidate_name} — ${interview.stage_name}`
      : `Interview Scheduled: ${interview.candidate_name} — ${interview.stage_name}`

    const emailBody = generateEmailBody(interview, type, portal_link)

    // All recipients
    const recipients = [
      { name: interview.candidate_name, email: interview.candidate_email },
      ...interviewers,
      { name: recruiter.name, email: recruiter.email }
    ]

    // In production, send actual emails here
    // Example with Resend:
    /*
    import { Resend } from 'resend'
    const resend = new Resend(process.env.RESEND_API_KEY)

    for (const recipient of recipients) {
      await resend.emails.send({
        from: `${recruiter.name} <${recruiter.email}>`,
        to: recipient.email,
        subject: emailSubject,
        html: emailBody,
        attachments: [
          {
            filename: 'invite.ics',
            content: Buffer.from(icsContent).toString('base64'),
            contentType: 'text/calendar'
          }
        ]
      })
    }
    */

    // Mock success response
    console.log('📧 Interview invite would be sent to:', recipients.map(r => r.email))
    console.log('📅 .ics file generated:', icsContent.substring(0, 200) + '...')

    return NextResponse.json({
      success: true,
      message: `${type === 'cancel' ? 'Cancellation' : 'Invite'} sent to ${recipients.length} recipients`,
      recipients: recipients.map(r => r.email)
    })

  } catch (error) {
    console.error('Error sending interview invite:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send invite' },
      { status: 500 }
    )
  }
}

function generateDescription(interview: any, portalLink?: string): string {
  let description = `Interview for ${interview.position_title} at ${interview.company_name}\n\n`

  if (interview.notes) {
    description += `${interview.notes}\n\n`
  }

  if (interview.interview_guide_url) {
    description += `Interview Guide: ${interview.interview_guide_url}\n`
  }

  if (portalLink) {
    description += `Client Portal: ${portalLink}\n`
  }

  description += `\n─────────────────────────────────────────\n`
  description += `Scheduled via @talentconnect`

  return description
}

function generateEmailBody(interview: any, type: 'new' | 'update' | 'cancel', portalLink?: string): string {
  const startTime = new Date(interview.scheduled_at)
  const formattedDate = formatEmailDate(startTime)
  const formattedTime = formatEmailTime(startTime, interview.timezone)

  if (type === 'cancel') {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Interview Cancelled</h2>
        <p>The following interview has been cancelled:</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Candidate:</strong> ${interview.candidate_name}</p>
          <p><strong>Position:</strong> ${interview.position_title} at ${interview.company_name}</p>
          <p><strong>Stage:</strong> ${interview.stage_name}</p>
          <p><strong>Was scheduled for:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
        </div>

        <p style="color: #666; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px;">
          Scheduled via @talentconnect
        </p>
      </div>
    `
  }

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${type === 'update' ? 'Interview Updated' : 'Interview Scheduled'}</h2>
      <p>You're invited to interview <strong>${interview.candidate_name}</strong> for the <strong>${interview.position_title}</strong> position at <strong>${interview.company_name}</strong>.</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${formattedTime}</p>
        <p><strong>Duration:</strong> ${interview.duration_minutes} minutes</p>
        <p><strong>Location:</strong> ${interview.location}</p>
      </div>

      ${interview.interview_guide_url ? `
        <p><a href="${interview.interview_guide_url}" style="color: #1F3C62;">Interview Guide</a></p>
      ` : ''}

      ${portalLink ? `
        <p><a href="${portalLink}" style="color: #1F3C62;">View in Client Portal</a></p>
      ` : ''}

      ${interview.notes ? `
        <div style="margin: 20px 0;">
          <p><strong>Notes:</strong></p>
          <p style="color: #666;">${interview.notes}</p>
        </div>
      ` : ''}

      <p style="color: #666; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
        Scheduled via @talentconnect<br>
        .ics file attached.
      </p>
    </div>
  `
}
