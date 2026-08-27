// Mirrors Data/CrmEnums.cs in the backend. The API rejects anything else with a 400.
export const USER_ROLES = ['LEADERSHIP', 'SALES MANAGER', 'SALES REP']
export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Lost']
export const DEAL_STAGES = ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost']
export const ENGAGEMENT_TYPES = ['Call', 'Meeting', 'Email', 'Note']

// Maps an enum value to a badge tone defined in index.css.
export const TONES = {
  New: 'info',
  Contacted: 'warn',
  Qualified: 'success',
  Lost: 'danger',
  Prospecting: 'info',
  Proposal: 'accent',
  Negotiation: 'warn',
  Won: 'success',
  Call: 'accent',
  Meeting: 'info',
  Email: 'warn',
  Note: 'neutral',
  LEADERSHIP: 'accent',
  'SALES MANAGER': 'info',
  'SALES REP': 'neutral',
}

export const OPEN_DEAL_STAGES = ['Prospecting', 'Proposal', 'Negotiation']
