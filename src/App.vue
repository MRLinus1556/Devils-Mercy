
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import {
  getAuthStatus,
  loginWithDiscord,
  logoutFromDiscord,
  hasPermission,
  type DiscordUser,
  type Permission,
} from '@/services/auth'

interface NavigationItem {
  label: string
  path: string
  permission?: Permission
}

const route = useRoute()
const discordUser = ref<DiscordUser | null>(null)
const authLoading = ref(true)
const authError = ref('')
const menuOpen = ref(false)
const profileMenuOpen = ref(false)

const isLoggedIn = computed(() => discordUser.value !== null)

const avatarUrl = computed(() => {
  const user = discordUser.value
  if (!user) return ''

  if (user.avatar) {
    const format = user.avatar.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=128`
  }

  const fallbackIndex = Number(BigInt(user.id) >> 22n) % 6
  return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`
})

const displayName = computed(() => {
  return discordUser.value?.global_name || discordUser.value?.username || 'Discord user'
})

const navigation: NavigationItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Organization', path: '/organisation', permission: 'organization.view' },
  { label: 'Charters', path: '/charters' },
  { label: 'Applications', path: '/ansok', permission: 'applications.view' },
  { label: 'Media', path: '/media', permission: 'media.view' },
]

const visibleNavigation = computed(() => {
  return navigation.filter((item) => {
    if (!item.permission) return true
    return isLoggedIn.value && hasPermission(item.permission)
  })
})

function closeMenus() {
  menuOpen.value = false
  profileMenuOpen.value = false
}

function canOpenProfile() {
  return isLoggedIn.value
}

onMounted(async () => {
  try {
    const status = await getAuthStatus()
    discordUser.value = status.authenticated ? status.user : null
  } catch {
    authError.value = 'Discord-inloggningen är inte tillgänglig just nu.'
  } finally {
    authLoading.value = false
  }
})

async function handleLogout() {
  authError.value = ''

  try {
    await logoutFromDiscord()
    discordUser.value = null
    closeMenus()
    window.location.href = '/'
  } catch {
    authError.value = 'Det gick inte att logga ut. Försök igen.'
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink to="/" class="brand" @click="closeMenus">
        <img src="/images/logo.png" alt="Devils Mercy MC" class="brand-logo" />
        <span class="brand-copy">
          <span class="brand-name">DEVILS MERCY</span>
          <span class="brand-subtitle">MOTORCYCLE CLUB</span>
        </span>
      </RouterLink>

      <nav class="desktop-nav" aria-label="Main navigation">
        <RouterLink
          v-for="item in visibleNavigation"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ 'nav-link-active': route.path === item.path }"
          @click="closeMenus"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <span v-if="authLoading" class="auth-loading">CHECKING LOGIN…</span>

        <button
          v-else-if="!isLoggedIn"
          class="header-cta"
          type="button"
          @click="loginWithDiscord"
        >
          LOGIN WITH DISCORD
          <v-icon icon="mdi-discord" size="19" />
        </button>

        <v-menu
          v-else
          v-model="profileMenuOpen"
          location="bottom end"
          :close-on-content-click="true"
          content-class="profile-menu-content"
        >
          <template #activator="{ props }">
            <button v-bind="props" class="profile-trigger" type="button">
              <v-avatar size="36">
                <v-img :src="avatarUrl" :alt="displayName" />
              </v-avatar>
              <span class="profile-trigger-name">{{ displayName }}</span>
              <v-icon icon="mdi-chevron-down" size="18" />
            </button>
          </template>

          <v-list class="profile-menu-list" bg-color="#111111" density="comfortable">
            <v-list-item
              :title="displayName"
              :subtitle="discordUser?.username"
              prepend-icon="mdi-account-circle-outline"
            />

            <v-divider class="my-2" />

            <v-list-item
              v-if="canOpenProfile()"
              to="/profil"
              prepend-icon="mdi-account-outline"
              title="My profile"
              @click="closeMenus"
            />

            <v-list-item
              v-if="hasPermission('members.manage')"
              to="/members"
              prepend-icon="mdi-account-cog-outline"
              title="Member management"
              @click="closeMenus"
            />

            <v-list-item
              v-if="hasPermission('leadership.manage')"
              to="/organisation"
              prepend-icon="mdi-shield-account-outline"
              title="Leadership"
              @click="closeMenus"
            />

            <v-list-item
              v-if="hasPermission('website.manage')"
              to="/admin"
              prepend-icon="mdi-cog-outline"
              title="Website administration"
              @click="closeMenus"
            />

            <v-divider class="my-2" />

            <v-list-item
              prepend-icon="mdi-logout"
              title="Log out"
              @click="handleLogout"
            />
          </v-list>
        </v-menu>

        <button
          class="mobile-menu-button"
          type="button"
          :aria-expanded="menuOpen"
          aria-label="Toggle navigation"
          @click="menuOpen = !menuOpen"
        >
          <v-icon :icon="menuOpen ? 'mdi-close' : 'mdi-menu'" size="26" />
        </button>
      </div>

      <Transition name="mobile-menu">
        <nav v-if="menuOpen" class="mobile-nav" aria-label="Mobile navigation">
          <RouterLink
            v-for="item in visibleNavigation"
            :key="item.path"
            :to="item.path"
            class="mobile-nav-link"
            @click="closeMenus"
          >
            {{ item.label }}
            <v-icon icon="mdi-arrow-top-right" size="18" />
          </RouterLink>

          <RouterLink
            v-if="isLoggedIn"
            to="/profil"
            class="mobile-nav-link"
            @click="closeMenus"
          >
            My profile
            <v-icon icon="mdi-account-outline" size="18" />
          </RouterLink>

          <button
            v-if="!authLoading && !isLoggedIn"
            class="mobile-apply-link"
            type="button"
            @click="loginWithDiscord"
          >
            Login with Discord
          </button>

          <button
            v-else-if="isLoggedIn"
            class="mobile-apply-link"
            type="button"
            @click="handleLogout"
          >
            Log out
          </button>
        </nav>
      </Transition>
    </header>

    <div v-if="authError" class="auth-error" role="alert">
      {{ authError }}
      <button type="button" @click="authError = ''" aria-label="Dismiss error">×</button>
    </div>

    <RouterView />

    <footer class="app-footer">
      <RouterLink to="/" class="footer-brand" @click="closeMenus">
        <img src="/images/logo.png" alt="" class="footer-logo" />
        <span>
          <strong>DEVILS MERCY</strong>
          <small>MOTORCYCLE CLUB</small>
        </span>
      </RouterLink>

      <span>© {{ new Date().getFullYear() }} DEVILS MERCY MC</span>

      <RouterLink to="/charters">Charters</RouterLink>
    </footer>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --page-bg: #090909;
  --panel-bg: #111111;
  --text-main: #f3f0ed;
  --text-muted: #a19b97;
  --red: #8b0000;
  --red-light: #bb2424;
  --border: rgba(255, 255, 255, .11);
}

.app-shell {
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text-main);
  font-family: 'Inter', sans-serif;
}

.site-header {
  position: relative;
  z-index: 20;
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 0 6.2%;
  border-bottom: 1px solid var(--border);
  background: #090909;
}

.brand, .footer-brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.brand-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.brand-copy, .footer-brand span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brand-name, .footer-brand strong {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 23px;
  font-weight: 800;
  letter-spacing: 1.7px;
  line-height: 1;
}

.brand-subtitle, .footer-brand small {
  color: #a69d98;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 2.8px;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: clamp(16px, 2vw, 32px);
}

.nav-link {
  position: relative;
  padding: 34px 0;
  color: #bcb6b1;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;
}

.nav-link::after {
  position: absolute;
  right: 0;
  bottom: 23px;
  left: 0;
  height: 2px;
  background: var(--red-light);
  content: '';
  transform: scaleX(0);
  transition: transform 180ms ease;
}

.nav-link:hover, .nav-link-active {
  color: #fff;
}

.nav-link-active::after, .nav-link:hover::after {
  transform: scaleX(1);
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.header-cta, .mobile-apply-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 16px;
  border: 0;
  background: var(--red);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
}

.header-cta:hover, .mobile-apply-link:hover {
  background: var(--red-light);
}

.auth-loading {
  color: #bcb6b1;
  font-size: 9px;
  letter-spacing: 1px;
}

.profile-trigger {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 4px 5px;
  border: 1px solid var(--border);
  background: #111;
  color: #fff;
  cursor: pointer;
}

.profile-trigger-name {
  max-width: 125px;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-menu-content {
  border: 1px solid #333;
}

.profile-menu-list {
  min-width: 245px;
  color: #f3f0ed;
}

.mobile-menu-button {
  display: none;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.mobile-nav {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 6% 24px;
  border-bottom: 1px solid var(--border);
  background: #0d0d0d;
}

.mobile-nav-link {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  color: #e8e3df;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;
}

.mobile-apply-link {
  width: 100%;
  margin-top: 16px;
}

.mobile-menu-enter-active, .mobile-menu-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.mobile-menu-enter-from, .mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.auth-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 12px 6.2%;
  border-bottom: 1px solid rgba(187, 36, 36, .5);
  background: #1a0b0b;
  color: #f3b4b4;
  font-size: 12px;
}

.auth-error button {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
}

.app-footer {
  display: flex;
  min-height: 90px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 6.2%;
  border-top: 1px solid var(--border);
  background: #070707;
  color: #918983;
  font-size: 10px;
}

.footer-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.footer-brand strong {
  color: #f3f0ed;
  font-size: 19px;
}

.footer-brand small {
  font-size: 8px;
}

.app-footer > a:last-child {
  color: #d1c8c2;
  text-decoration: none;
}

@media (max-width: 1200px) {
  .site-header {
    gap: 18px;
    padding-right: 4%;
    padding-left: 4%;
  }

  .desktop-nav {
    gap: 15px;
  }

  .brand-subtitle {
    letter-spacing: 2px;
  }
}

@media (max-width: 980px) {
  .site-header {
    min-height: 76px;
  }

  .desktop-nav {
    display: none;
  }

  .mobile-menu-button {
    display: inline-flex;
  }
}

@media (max-width: 600px) {
  .site-header {
    min-height: 70px;
    padding: 0 5%;
  }

  .brand-logo {
    width: 40px;
    height: 40px;
  }

  .brand-name {
    font-size: 20px;
  }

  .brand-subtitle {
    font-size: 8px;
  }

  .profile-trigger-name {
    display: none;
  }

  .app-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
    padding: 25px 6%;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
  }
}
</style>
