import { createResource } from './client'

// Route names mirror the controller class names exactly — the backend mixes
// plural and singular (CompaniesController vs ContactController), so these
// strings are not interchangeable.
export const companiesApi = createResource('Companies')
export const contactsApi = createResource('Contact')
export const leadsApi = createResource('Leads')
export const dealsApi = createResource('Deals')
export const engagementsApi = createResource('Engagement')
export const followUpsApi = createResource('FollowUp')
export const usersApi = createResource('Users')
