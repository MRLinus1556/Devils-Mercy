
export type OrganisationArticle = {
  id?: number | string
  title: string
  category: string
  excerpt: string
  content: string
  image: string
  date: string
  featured: boolean
  published?: boolean
  sortOrder?: number
}

export type OrganisationContent = Record<string, string>

// Uses the existing Discord session cookie from the Devils Mercy portal.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}/api/organisation${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.error || `API-fel (${response.status})`,
    )
  }

  return data as T
}

// Hämta publicerade artiklar.
export async function getOrganisationArticles(
  category = 'All',
): Promise<OrganisationArticle[]> {
  const query =
    category && category !== 'All'
      ? `?category=${encodeURIComponent(category)}`
      : ''

  const response = await request<{
    articles: OrganisationArticle[]
  }>(`/articles${query}`)

  return response.articles
}

// Hämta organisationens sparade sidinnehåll.
export async function getOrganisationContent(): Promise<OrganisationContent> {
  const response = await request<{
    content: OrganisationContent
  }>('/page-content')

  return response.content
}

// Hämta alla artiklar för administratörer.
export async function getOrganisationAdminArticles(): Promise<
  OrganisationArticle[]
> {
  const response = await request<{
    articles: OrganisationArticle[]
  }>('/admin/articles')

  return response.articles
}

// Skapa och spara en artikel.
export async function createOrganisationArticle(
  article: OrganisationArticle,
): Promise<OrganisationArticle> {
  const response = await request<{
    article: OrganisationArticle
  }>('/articles', {
    method: 'POST',
    body: JSON.stringify(article),
  })

  return response.article
}

// Uppdatera en befintlig artikel.
export async function updateOrganisationArticle(
  id: string | number,
  article: OrganisationArticle,
): Promise<OrganisationArticle> {
  const response = await request<{
    article: OrganisationArticle
  }>(`/articles/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    body: JSON.stringify(article),
  })

  return response.article
}

// Ta bort en artikel.
export async function deleteOrganisationArticle(
  id: string | number,
): Promise<{ ok: true }> {
  return request<{ ok: true }>(
    `/articles/${encodeURIComponent(String(id))}`,
    {
      method: 'DELETE',
    },
  )
}

// Spara varje fält i organisationens sidinnehåll.
// Backend tar emot ett sectionKey per PUT-anrop.
export async function saveOrganisationContent(
  content: OrganisationContent,
): Promise<{ ok: true }> {
  await Promise.all(
    Object.entries(content).map(([sectionKey, value]) =>
      request<{ ok: true }>(
        `/page-content/${encodeURIComponent(sectionKey)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ content: value }),
        },
      ),
    ),
  )

  return { ok: true }
}
