
export type CharterStatus = 'Active' | 'Recruiting' | 'Coming soon'

export interface Charter {
  id: string
  name: string
  shortName: string
  server: string
  location: string
  country: string
  flag: string
  status: CharterStatus
  description: string
  image: string
  founded: string
  members: number | null
  featured: boolean
}

export const charters: Charter[] = [
 
]
