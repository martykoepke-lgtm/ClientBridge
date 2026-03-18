# SMS Notifications — Integration Spec

> ClientBridge SMS: one-way notifications that nudge clients to open their review link.
> SMS is a delivery channel, not a replacement for the web UI.

---

## Goal

Clients shouldn't have to remember to check their review link. When something changes — feedback gets resolved, new work is done, a review link goes live — they get a text with a direct link. The web UI handles everything else.

---

## Scope: Level 1 — Outbound Notifications Only

No inbound parsing. No two-way threads. Just timely, useful texts that drive clients back to the review interface.

---

## Trigger Events

| Event | Who gets the SMS | Message template |
|-------|-----------------|-----------------|
| Review link created | Client | `[Project] is ready for review. Tap to open: {review_link}` |
| Feedback status → resolved | Client who submitted it | `Your feedback "{title}" on [Project] has been resolved. Review it: {review_link}` |
| Feedback status → change_made | Client who submitted it | `A change was made on [Project] based on your feedback. Take a look: {review_link}` |
| New feedback submitted | Developer | `New {type} feedback on [Project]: "{title}" — {severity} priority` |
| Weekly progress digest | Client (opt-in) | `[Project] update: {hours}h worked, {resolved} items resolved this week. See progress: {review_link}` |

---

## Data Model Changes

### Add `phone` to `clients` table

```sql
ALTER TABLE clients ADD COLUMN phone text;
```

Update the `Client` TypeScript interface:

```typescript
export interface Client {
  // ... existing fields
  phone: string | null
}
```

### Add `sms_notifications` preferences to `clients`

```sql
ALTER TABLE clients ADD COLUMN sms_notifications jsonb DEFAULT '{"enabled": false, "weekly_digest": false}'::jsonb;
```

```typescript
export interface SmsPreferences {
  enabled: boolean
  weekly_digest: boolean
}

export interface Client {
  // ... existing fields
  phone: string | null
  sms_notifications: SmsPreferences
}
```

### Add `sms_log` table (for debugging and cost tracking)

```sql
CREATE TABLE sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id),
  project_id uuid REFERENCES projects(id),
  event_type text NOT NULL,          -- 'review_link' | 'feedback_resolved' | 'change_made' | 'new_feedback' | 'weekly_digest'
  to_phone text NOT NULL,
  message_body text NOT NULL,
  twilio_sid text,                   -- Twilio message SID for delivery tracking
  status text DEFAULT 'sent',        -- 'sent' | 'delivered' | 'failed' | 'undelivered'
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

---

## Provider: Twilio

### Why Twilio
- Most documented SMS API, best Next.js/Node.js SDK
- Scales from 1 message/day to millions without config changes
- Delivery receipts via webhook
- ~$0.0079/message (US), ~$1/month for a phone number
- Free trial gives $15 credit (~1,900 messages) to prototype

### Environment Variables

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### Package

```bash
npm install twilio
```

---

## Implementation

### 1. SMS utility (`lib/sms.ts`)

```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

interface SendSmsParams {
  to: string
  body: string
}

export async function sendSms({ to, body }: SendSmsParams) {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn('SMS: TWILIO_PHONE_NUMBER not set, skipping')
    return null
  }

  try {
    const message = await client.messages.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      body,
    })
    return { sid: message.sid, status: message.status }
  } catch (error) {
    console.error('SMS send failed:', error)
    return { sid: null, status: 'failed', error }
  }
}
```

### 2. Notification dispatcher (`lib/sms-notifications.ts`)

```typescript
import { sendSms } from './sms'
import { createClient } from '@/lib/supabase/server'

export async function notifyFeedbackResolved(feedbackId: string) {
  const supabase = await createClient()

  // Fetch feedback with client and project
  const { data: feedback } = await supabase
    .from('feedback')
    .select('*, project:projects(*, client:clients(*))')
    .eq('id', feedbackId)
    .single()

  if (!feedback?.project?.client?.phone) return
  if (!feedback.project.client.sms_notifications?.enabled) return

  const reviewLink = `${process.env.NEXT_PUBLIC_APP_URL}/review/${feedback.project.review_token}`
  const body = `Your feedback "${feedback.title}" on ${feedback.project.name} has been resolved. Review it: ${reviewLink}`

  const result = await sendSms({ to: feedback.project.client.phone, body })

  // Log
  await supabase.from('sms_log').insert({
    client_id: feedback.project.client.id,
    project_id: feedback.project_id,
    event_type: 'feedback_resolved',
    to_phone: feedback.project.client.phone,
    message_body: body,
    twilio_sid: result?.sid,
    status: result?.status === 'failed' ? 'failed' : 'sent',
    error_message: result?.error ? String(result.error) : null,
  })
}

export async function notifyReviewLinkReady(projectId: string) {
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('id', projectId)
    .single()

  if (!project?.client?.phone) return
  if (!project.client.sms_notifications?.enabled) return

  const reviewLink = `${process.env.NEXT_PUBLIC_APP_URL}/review/${project.review_token}`
  const body = `${project.name} is ready for review. Tap to open: ${reviewLink}`

  const result = await sendSms({ to: project.client.phone, body })

  await supabase.from('sms_log').insert({
    client_id: project.client.id,
    project_id: project.id,
    event_type: 'review_link',
    to_phone: project.client.phone,
    message_body: body,
    twilio_sid: result?.sid,
    status: result?.status === 'failed' ? 'failed' : 'sent',
  })
}

export async function notifyNewFeedback(feedbackId: string, developerPhone?: string) {
  if (!developerPhone) return

  const supabase = await createClient()
  const { data: feedback } = await supabase
    .from('feedback')
    .select('*, project:projects(*)')
    .eq('id', feedbackId)
    .single()

  if (!feedback) return

  const body = `New ${feedback.feedback_type} feedback on ${feedback.project?.name}: "${feedback.title}" — ${feedback.severity} priority`

  await sendSms({ to: developerPhone, body })
}
```

### 3. Hook into existing flows

These calls go into the existing server actions / API routes where these events already happen:

| Where | What to add |
|-------|-------------|
| Feedback status update (project detail page, feedback detail page) | Call `notifyFeedbackResolved()` or `notifyChangeMade()` after status update |
| Project creation (client detail page) | Call `notifyReviewLinkReady()` after generating review token |
| Feedback submission (review page) | Call `notifyNewFeedback()` to alert developer |

### 4. Weekly digest (Supabase Edge Function or cron)

A scheduled function that runs once per week:

```typescript
// For each client with weekly_digest enabled:
// 1. Query time_sessions from past 7 days for their projects
// 2. Query feedback resolved in past 7 days
// 3. Format and send a single summary SMS
```

This can be a Supabase Edge Function triggered by pg_cron, or a Vercel Cron Job (`/api/cron/weekly-digest`).

---

## UI Changes

### Client form (Clients page + Client detail page)

Add a phone number field to the client creation/edit forms:

```
Phone: [+1 (555) 123-4567]
SMS Notifications: [toggle]
Weekly Digest: [toggle] (only shown if SMS enabled)
```

### Project detail page

Add a "Send Review Link via SMS" button next to the existing copy-to-clipboard link action. Only visible if the client has a phone number and SMS enabled.

### Settings page (future)

Developer's own phone number for receiving new-feedback alerts.

---

## Phone Number Handling

- Store in E.164 format: `+15551234567`
- Display formatted: `(555) 123-4567`
- Validate on input: must be 10+ digits, US/Canada numbers initially
- Use a simple formatting function, no library needed for Level 1

```typescript
export function formatPhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null // invalid
}

export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, '')
  const local = digits.slice(-10)
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}
```

---

## Cost Estimate

| Item | Cost |
|------|------|
| Twilio phone number | ~$1.00/month |
| Outbound SMS (US) | ~$0.0079/message |
| 5 clients, ~20 messages/week | ~$0.63/month |
| 20 clients, ~80 messages/week | ~$2.53/month |

Total: under $5/month for a typical solo developer workload.

---

## Security & Privacy

- Phone numbers stored in Supabase, protected by existing RLS (developer only sees their own clients)
- Twilio credentials stored as environment variables, never exposed to client
- SMS content never includes sensitive project data — just titles and links
- Clients can be opted out by the developer at any time (toggle SMS off)
- Rate limiting: max 1 SMS per event per client per hour (prevents spam from rapid status toggling)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `lib/sms.ts` | Create — Twilio send wrapper |
| `lib/sms-notifications.ts` | Create — Notification dispatcher with templates |
| `lib/phone.ts` | Create — Phone formatting utilities |
| `lib/types.ts` | Modify — Add phone and sms_notifications to Client |
| `supabase/migrations/xxx_add_sms.sql` | Create — Schema migration |
| `app/(dashboard)/clients/page.tsx` | Modify — Add phone field to client form |
| `app/(dashboard)/clients/[id]/page.tsx` | Modify — Add phone field, SMS toggles |
| `app/(dashboard)/projects/[id]/page.tsx` | Modify — Add "Send via SMS" button |
| `app/api/cron/weekly-digest/route.ts` | Create — Weekly digest endpoint |
| `.env.local` | Modify — Add Twilio credentials |

---

## Implementation Order

1. Add `phone` and `sms_notifications` to clients table + types
2. Update client forms to capture phone numbers
3. Install `twilio`, create `lib/sms.ts`
4. Create `lib/sms-notifications.ts` with all templates
5. Hook notifications into existing feedback status update flows
6. Add "Send Review Link via SMS" button to project detail
7. Build weekly digest cron endpoint
8. Add `sms_log` table for cost tracking and debugging

Estimated effort: 1-2 days for a working implementation.

---

*Last updated: March 2026*
