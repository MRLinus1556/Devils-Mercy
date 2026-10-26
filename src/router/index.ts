
import { createRouter, createWebHistory } from 'vue-router'

type AuthStatus = {
  authenticated: boolean
  user: { id: string; username: string } | null
  roles?: string[]
  permissions?: string[]
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/charters',
      name: 'charters',
      component: () => import('@/views/ChartersView.vue'),
    },
    {
      path: '/members',
      name: 'members',
      component: () => import('@/views/MembersView.vue'),
      meta: { permission: 'members.view' },
    },
    {
      path: '/ansok',
      name: 'ansok',
      component: () => import('@/views/AnsokanView.vue'),
      meta: { permission: 'applications.view' },
    },
    {
      path: '/organisation',
      name: 'organisation',
      component: () => import('@/views/OrganisationView.vue'),
      meta: { permission: 'organization.view' },
    },
    {
      path: '/media',
      name: 'media',
      component: () => import('@/views/MediaView.vue'),
      meta: { permission: 'media.view' },
    },
    {
      path: '/profil',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
    },    
    
  ],

  scrollBehavior() {
    return { top: 0, behavior: 'smooth' }
  },
})

router.beforeEach(async (to) => {
  const permission = to.meta.permission as string | undefined

  // Home och Charters är offentliga.
  if (!permission) return true

  try {
    const response = await fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) {
      return { path: '/', query: { login: 'required' } }
    }

    const auth = (await response.json()) as AuthStatus

    if (!auth.authenticated) {
      return { path: '/', query: { login: 'required' } }
    }

    if (!auth.permissions?.includes(permission)) {
      return { path: '/', query: { access: 'denied' } }
    }

    return true
  } catch {
    return { path: '/', query: { api: 'unavailable' } }
  }
})

export default router