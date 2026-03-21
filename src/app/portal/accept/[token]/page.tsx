import { redirect } from 'next/navigation'

// Legacy redirect — old invitation links point here.
// New flow uses /portal/signup?token=xxx
export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  redirect(`/portal/signup?token=${token}`)
}
