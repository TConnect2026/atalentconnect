/**
 * Calendar utilities for generating .ics files
 */

export interface CalendarEvent {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  organizer: {
    name: string
    email: string
  }
  attendees: Array<{
    name: string
    email: string
  }>
  uid?: string
  method?: 'REQUEST' | 'CANCEL'
}

/**
 * Format a date for iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Fold long lines at 75 characters as per RFC 5545
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line

  const folded: string[] = []
  let currentLine = line.substring(0, 75)
  let remaining = line.substring(75)

  folded.push(currentLine)

  while (remaining.length > 0) {
    currentLine = ' ' + remaining.substring(0, 74) // Add space for continuation
    remaining = remaining.substring(74)
    folded.push(currentLine)
  }

  return folded.join('\r\n')
}

/**
 * Escape special characters in iCalendar text
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate a .ics calendar file content
 */
export function generateICS(event: CalendarEvent): string {
  const uid = event.uid || `${Date.now()}-${Math.random().toString(36).substring(7)}@atalentconnect.com`
  const method = event.method || 'REQUEST'
  const timestamp = formatICalDate(new Date())

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//@talentconnect//Interview Scheduling//EN',
    `METHOD:${method}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${formatICalDate(event.startTime)}`,
    `DTEND:${formatICalDate(event.endTime)}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ]

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`)
  }

  // Add organizer
  lines.push(
    `ORGANIZER;CN=${escapeICalText(event.organizer.name)}:mailto:${event.organizer.email}`
  )

  // Add attendees
  event.attendees.forEach(attendee => {
    lines.push(
      `ATTENDEE;CN=${escapeICalText(attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${attendee.email}`
    )
  })

  lines.push('STATUS:CONFIRMED')
  lines.push('SEQUENCE:0')
  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')

  // Fold lines and join
  return lines.map(foldLine).join('\r\n')
}

/**
 * Generate a cancellation .ics file
 */
export function generateCancellationICS(event: CalendarEvent): string {
  return generateICS({
    ...event,
    method: 'CANCEL'
  })
}

/**
 * Create a base64 encoded .ics file
 */
export function generateICSBase64(event: CalendarEvent): string {
  const icsContent = generateICS(event)
  return Buffer.from(icsContent).toString('base64')
}

/**
 * Create a cancellation .ics file in base64
 */
export function generateCancellationICSBase64(event: CalendarEvent): string {
  const icsContent = generateCancellationICS(event)
  return Buffer.from(icsContent).toString('base64')
}

/**
 * Format date for email display
 */
export function formatEmailDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format time for email display
 */
export function formatEmailTime(date: Date, timezone: string): string {
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  // Convert timezone to abbreviation
  const tzMap: Record<string, string> = {
    'America/Los_Angeles': 'PST',
    'America/Denver': 'MST',
    'America/Chicago': 'CST',
    'America/New_York': 'EST',
    'UTC': 'UTC'
  }

  const tzAbbr = tzMap[timezone] || timezone
  return `${timeStr} ${tzAbbr}`
}
