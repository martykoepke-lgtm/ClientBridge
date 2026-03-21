export type ProjectStage =
  | 'setup'
  | 'scoped'
  | 'contract_pending'
  | 'contract_signed'
  | 'active'
  | 'review_available'
  | 'completed'

export interface StageInfo {
  stage: ProjectStage
  label: string
  description: string
  color: string // tailwind bg class
  textColor: string // tailwind text class
  priority: number // lower = more urgent (sort order)
}

export function computeProjectStage(
  project: {
    status: string
    vercel_url?: string | null
  },
  scopeCount: number,
  contract?: { status: string } | null,
): StageInfo {
  // Contract pending signature is highest priority
  if (contract?.status === 'sent') {
    return {
      stage: 'contract_pending',
      label: 'Contract Ready',
      description: 'Your contract is ready for review and signature',
      color: 'bg-amber-900/30',
      textColor: 'text-amber-300',
      priority: 1,
    }
  }

  // Client signed, awaiting counter-signature
  if (contract?.status === 'client_signed') {
    return {
      stage: 'contract_signed',
      label: 'Awaiting Counter-Signature',
      description: 'You\'ve signed — waiting for counter-signature',
      color: 'bg-blue-900/30',
      textColor: 'text-blue-300',
      priority: 2,
    }
  }

  // Fully active contract
  if (contract?.status === 'active') {
    // If there's a vercel URL, highlight that review is available
    if (project.vercel_url) {
      return {
        stage: 'review_available',
        label: 'Ready for Review',
        description: 'Your application is live and ready for your feedback',
        color: 'bg-teal-900/30',
        textColor: 'text-teal-300',
        priority: 3,
      }
    }

    return {
      stage: 'active',
      label: 'In Development',
      description: 'Work is underway on your project',
      color: 'bg-green-900/30',
      textColor: 'text-green-300',
      priority: 4,
    }
  }

  // Project completed
  if (project.status === 'completed') {
    return {
      stage: 'completed',
      label: 'Completed',
      description: 'This project has been delivered',
      color: 'bg-gray-800',
      textColor: 'text-gray-400',
      priority: 10,
    }
  }

  // Scoped but no contract yet
  if (scopeCount > 0) {
    return {
      stage: 'scoped',
      label: 'Scope Defined',
      description: `${scopeCount} deliverables outlined`,
      color: 'bg-purple-900/30',
      textColor: 'text-purple-300',
      priority: 5,
    }
  }

  // Brand new project, nothing set up yet
  return {
    stage: 'setup',
    label: 'Setting Up',
    description: 'Your project is being set up',
    color: 'bg-gray-800',
    textColor: 'text-gray-400',
    priority: 6,
  }
}

export function sortByStageOrder(stages: StageInfo[]): StageInfo[] {
  return [...stages].sort((a, b) => a.priority - b.priority)
}
