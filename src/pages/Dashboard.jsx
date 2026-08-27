import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Badge, Button, EmptyState, ErrorState, Spinner } from '../components/ui'
import {
  companiesApi,
  contactsApi,
  dealsApi,
  engagementsApi,
  followUpsApi,
  leadsApi,
  usersApi,
} from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { DEAL_STAGES, LEAD_STATUSES, OPEN_DEAL_STAGES } from '../constants/enums'
import { daysUntil, formatDate, formatMoney, formatMoneyCompact, plural, relativeDueLabel } from '../utils/format'

export default function Dashboard() {
  const companies = useCollection(companiesApi)
  const contacts = useCollection(contactsApi)
  const leads = useCollection(leadsApi)
  const deals = useCollection(dealsApi)
  const engagements = useCollection(engagementsApi)
  const followUps = useCollection(followUpsApi)
  const users = useCollection(usersApi)

  const collections = [companies, contacts, leads, deals, engagements, followUps, users]
  const loading = collections.some((collection) => collection.loading)
  const failure = collections.find((collection) => collection.error)

  const companiesById = useMemo(() => indexById(companies.items), [companies.items])
  const usersById = useMemo(() => indexById(users.items), [users.items])
  const companyName = (id) => companiesById.get(id)?.companyName ?? `Company #${id}`

  const stats = useMemo(() => {
    const open = deals.items.filter((deal) => OPEN_DEAL_STAGES.includes(deal.stage))
    const won = deals.items.filter((deal) => deal.stage === 'Won')
    const closed = deals.items.filter((deal) => deal.stage === 'Won' || deal.stage === 'Lost')
    const openValue = open.reduce((sum, deal) => sum + (deal.dealValue || 0), 0)
    const wonValue = won.reduce((sum, deal) => sum + (deal.dealValue || 0), 0)
    const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : null
    const qualified = leads.items.filter((lead) => lead.status === 'Qualified').length
    return { open, won, openValue, wonValue, winRate, qualified }
  }, [deals.items, leads.items])

  const stageBreakdown = useMemo(
    () =>
      DEAL_STAGES.map((stage) => {
        const stageDeals = deals.items.filter((deal) => deal.stage === stage)
        return {
          stage,
          count: stageDeals.length,
          value: stageDeals.reduce((sum, deal) => sum + (deal.dealValue || 0), 0),
        }
      }),
    [deals.items],
  )
  const largestStageValue = Math.max(1, ...stageBreakdown.map((entry) => entry.value))

  const funnel = useMemo(
    () =>
      LEAD_STATUSES.map((status) => ({
        status,
        count: leads.items.filter((lead) => lead.status === status).length,
      })),
    [leads.items],
  )
  const leadTotal = Math.max(1, leads.items.length)

  const upcoming = useMemo(
    () =>
      followUps.items
        .filter((row) => !row.completed)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 6),
    [followUps.items],
  )

  const recentEngagements = useMemo(
    () => [...engagements.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [engagements.items],
  )

  const overdue = followUps.items.filter((row) => !row.completed && (daysUntil(row.dueDate) ?? 0) < 0).length

  if (failure) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Pipeline health at a glance." />
        <ErrorState error={failure.error} onRetry={() => collections.forEach((collection) => collection.refresh())} />
      </>
    )
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Pipeline health at a glance." />
        <Spinner label="Loading pipeline" />
      </>
    )
  }

  const empty = !deals.items.length && !leads.items.length && !companies.items.length

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Pipeline health at a glance.">
        <Button onClick={() => collections.forEach((collection) => collection.refresh())}>Refresh</Button>
      </PageHeader>

      {empty ? (
        <EmptyState
          title="Your CRM is empty"
          description="Add a team member, then a company, and the pipeline will fill in from there."
          action={
            <Link className="btn btn--primary" to="/team">
              Add the first team member
            </Link>
          }
        />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Open pipeline"
              value={formatMoneyCompact(stats.openValue)}
              hint={`${plural(stats.open.length, 'deal')} in play`}
              to="/deals"
            />
            <StatCard
              label="Won this period"
              value={formatMoneyCompact(stats.wonValue)}
              hint={`${plural(stats.won.length, 'deal')} closed won`}
              tone="success"
              to="/deals"
            />
            <StatCard
              label="Win rate"
              value={stats.winRate === null ? '—' : `${stats.winRate}%`}
              hint="Won vs. all closed deals"
            />
            <StatCard label="Qualified leads" value={stats.qualified} hint={`${plural(leads.items.length, 'lead')} total`} to="/leads" />
            <StatCard
              label="Overdue follow-ups"
              value={overdue}
              hint={overdue ? 'Needs attention today' : 'Everything on schedule'}
              tone={overdue ? 'danger' : 'neutral'}
              to="/follow-ups"
            />
            <StatCard label="Accounts" value={companies.items.length} hint={plural(contacts.items.length, 'contact')} to="/companies" />
          </div>

          <div className="dash-grid">
            <section className="panel">
              <header className="panel__head">
                <h2>Pipeline by stage</h2>
                <Link className="link" to="/deals">
                  Open board
                </Link>
              </header>
              <ul className="bars">
                {stageBreakdown.map((entry) => (
                  <li key={entry.stage} className="bars__row">
                    <span className="bars__label">
                      <Badge>{entry.stage}</Badge>
                    </span>
                    <span className="bars__track">
                      <span
                        className={`bars__fill bars__fill--${entry.stage.toLowerCase()}`}
                        style={{ width: `${(entry.value / largestStageValue) * 100}%` }}
                      />
                    </span>
                    <span className="bars__value mono">
                      {formatMoney(entry.value)}
                      <small>{plural(entry.count, 'deal')}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel">
              <header className="panel__head">
                <h2>Lead funnel</h2>
                <Link className="link" to="/leads">
                  View leads
                </Link>
              </header>
              <ul className="funnel">
                {funnel.map((entry) => (
                  <li key={entry.status}>
                    <div className="funnel__row">
                      <Badge>{entry.status}</Badge>
                      <strong>{entry.count}</strong>
                    </div>
                    <span className="funnel__track">
                      <span className="funnel__fill" style={{ width: `${(entry.count / leadTotal) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel">
              <header className="panel__head">
                <h2>Next follow-ups</h2>
                <Link className="link" to="/follow-ups">
                  See all
                </Link>
              </header>
              {upcoming.length ? (
                <ul className="feed">
                  {upcoming.map((row) => {
                    const days = daysUntil(row.dueDate)
                    return (
                      <li key={row.id} className="feed__item">
                        <div>
                          <strong>{row.note || 'Untitled follow-up'}</strong>
                          <small>
                            {companyName(row.companyId)} · {usersById.get(row.userId)?.name ?? `User #${row.userId}`}
                          </small>
                        </div>
                        <Badge tone={days < 0 ? 'danger' : days <= 2 ? 'warn' : 'info'}>{relativeDueLabel(row.dueDate)}</Badge>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="panel__empty">No open follow-ups. Nice.</p>
              )}
            </section>

            <section className="panel">
              <header className="panel__head">
                <h2>Recent activity</h2>
                <Link className="link" to="/engagements">
                  See all
                </Link>
              </header>
              {recentEngagements.length ? (
                <ul className="feed">
                  {recentEngagements.map((row) => (
                    <li key={row.id} className="feed__item">
                      <div>
                        <strong>{row.engagementName}</strong>
                        <small>
                          {companyName(row.companyId)} · {formatDate(row.createdAt)}
                        </small>
                      </div>
                      <Badge>{row.engagementType}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="panel__empty">Nothing logged yet.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}

function StatCard({ label, value, hint, tone = 'neutral', to }) {
  const content = (
    <>
      <span className="stat__label">{label}</span>
      <strong className={`stat__value stat__value--${tone}`}>{value}</strong>
      {hint && <small className="stat__hint">{hint}</small>}
    </>
  )
  return to ? (
    <Link className="stat stat--link" to={to} aria-label={`${label}: ${value}`}>
      {content}
    </Link>
  ) : (
    <div className="stat">{content}</div>
  )
}
