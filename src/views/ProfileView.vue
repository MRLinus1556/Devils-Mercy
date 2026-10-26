
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAuthStatus,
  logoutFromDiscord,
  type DiscordUser,
  type DiscordRole,
} from '@/services/auth'

const router = useRouter()

const user = ref<DiscordUser | null>(null)
const roles = ref<string[]>([])
const roleDetails = ref<DiscordRole[]>([])
const loading = ref(true)
const error = ref('')
const loggingOut = ref(false)
const copied = ref(false)

const displayName = computed(() =>
  user.value?.global_name || user.value?.username || 'Discord-användare',
)

const avatarUrl = computed(() => {
  if (!user.value) return ''

  if (user.value.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.value.id}/${user.value.avatar}.png?size=256`
  }

  const defaultAvatar = Number((BigInt(user.value.id) >> 22n) % 6n)
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`
})

const sortedRoles = computed(() =>
  [...roleDetails.value].sort((a, b) => b.position - a.position),
)

const shortcuts = [
  {
    title: 'Charters',
    description: 'Utforska klubbens charters.',
    icon: 'mdi-shield-outline',
    path: '/charters',
  },
  {
    title: 'Organisation',
    description: 'Se klubbens organisation.',
    icon: 'mdi-sitemap-outline',
    path: '/organisation',
  },
  {
    title: 'Medlemmar',
    description: 'Visa medlemskatalogen.',
    icon: 'mdi-account-group-outline',
    path: '/members',
  },
  {
    title: 'Ansökningar',
    description: 'Information om medlemsansökningar.',
    icon: 'mdi-file-document-outline',
    path: '/ansok',
  },
]

function roleColor(color: number): string {
  if (!color) return '#85858e'
  return `#${color.toString(16).padStart(6, '0')}`
}

async function copyDiscordId() {
  if (!user.value) return

  try {
    await navigator.clipboard.writeText(user.value.id)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    error.value = 'Kunde inte kopiera Discord-ID.'
  }
}

onMounted(async () => {
  try {
    const status = await getAuthStatus()

    if (!status.authenticated || !status.user) {
      await router.replace('/')
      return
    }

    user.value = status.user
    roles.value = status.roles ?? []
    roleDetails.value = status.roleDetails ?? []
  } catch {
    error.value = 'Kunde inte hämta din profil. Kontrollera att backend är igång.'
  } finally {
    loading.value = false
  }
})

async function handleLogout() {
  loggingOut.value = true
  error.value = ''

  try {
    await logoutFromDiscord()
    user.value = null
    window.location.href = '/'
  } catch {
    error.value = 'Det gick inte att logga ut. Försök igen.'
    loggingOut.value = false
  }
}
</script>

<template>
  <main class="profile-page">
    <div class="profile-container">
      <div v-if="loading" class="state-card">
        <v-progress-circular indeterminate color="red" size="32" />
        <p>Hämtar din profil...</p>
      </div>

      <div v-else-if="error && !user" class="state-card">
        <v-icon icon="mdi-alert-circle-outline" size="36" color="red" />
        <h2>Profilen kunde inte laddas</h2>
        <p>{{ error }}</p>
        <v-btn color="red" variant="tonal" @click="router.go(0)">
          Försök igen
        </v-btn>
      </div>

      <template v-else-if="user">
        <div class="page-heading">
          <div>
            <span class="eyebrow">MEDLEMSPORTAL</span>
            <h1>Min profil<span>.</span></h1>
            <p>Din personliga översikt hos Devils Mercy MC.</p>
          </div>

          <v-btn
            variant="outlined"
            color="red"
            prepend-icon="mdi-logout"
            :loading="loggingOut"
            @click="handleLogout"
          >
            Logga ut
          </v-btn>
        </div>

        <section class="profile-card">
          <div class="profile-cover">
            <div class="cover-mark">DM</div>
          </div>

          <div class="profile-main">
            <div class="avatar-wrap">
              <v-avatar size="104" class="profile-avatar">
                <v-img :src="avatarUrl" :alt="displayName" />
              </v-avatar>
              <span class="online-indicator" />
            </div>

            <div class="identity">
              <span class="eyebrow">DISCORD-KONTO</span>
              <h2>{{ displayName }}</h2>
              <p class="username">@{{ user.username }}</p>
            </div>

            <div class="account-status">
              <v-icon icon="mdi-check-circle" color="success" size="18" />
              <span>Inloggad</span>
            </div>
          </div>

          <div class="profile-details">
            <div class="detail-item">
              <span class="detail-label">Visningsnamn</span>
              <strong>{{ displayName }}</strong>
            </div>

            <div class="detail-item">
              <span class="detail-label">Discord-användarnamn</span>
              <strong>{{ user.username }}</strong>
            </div>

            <div class="detail-item detail-id">
              <span class="detail-label">Discord-ID</span>
              <strong>{{ user.id }}</strong>
              <v-btn
                :icon="copied ? 'mdi-check' : 'mdi-content-copy'"
                variant="text"
                size="small"
                :aria-label="copied ? 'Kopierat' : 'Kopiera Discord-ID'"
                @click="copyDiscordId"
              />
            </div>
          </div>
        </section>

        <section class="section-block">
          <div class="section-heading">
            <div>
              <span class="eyebrow">KONTO OCH MEDLEMSKAP</span>
              <h2>Din information</h2>
            </div>
          </div>

          <v-expansion-panels
            multiple
            variant="accordion"
            class="profile-panels"
          >
            <v-expansion-panel value="roles">
              <v-expansion-panel-title>
                <v-icon
                  icon="mdi-shield-account-outline"
                  class="panel-icon"
                />
                <span class="panel-title">Mina Discord-roller</span>
                <v-spacer />
                <v-chip size="small" class="count-chip">
                  {{ roleDetails.length || roles.length }}
                </v-chip>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div v-if="roleDetails.length" class="role-list">
                  <div
                    v-for="role in sortedRoles"
                    :key="role.id"
                    class="role-item"
                  >
                    <span
                      class="role-dot"
                      :style="{ backgroundColor: roleColor(role.color) }"
                    />
                    <span class="role-name">{{ role.name }}</span>
                    <span class="role-position">
                      #{{ role.position }}
                    </span>
                  </div>
                </div>

                <div v-else-if="roles.length" class="role-list">
                  <div
                    v-for="role in roles"
                    :key="role"
                    class="role-item"
                  >
                    <span class="role-dot" />
                    <span class="role-name">{{ role }}</span>
                  </div>

                  <v-alert
                    type="info"
                    variant="tonal"
                    density="compact"
                    class="panel-alert"
                  >
                    Rollnamnen är hämtade, men backend skickar ännu inte
                    rollernas färger och positioner.
                  </v-alert>
                </div>

                <div v-else class="empty-state">
                  <v-icon icon="mdi-shield-alert-outline" size="28" />
                  <p>Inga Discord-roller kunde hämtas.</p>
                  <span>
                    Kontrollera att backend skickar alla roller från
                    ditt Discord-medlemskap.
                  </span>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel value="membership">
              <v-expansion-panel-title>
                <v-icon icon="mdi-account-outline" class="panel-icon" />
                <span class="panel-title">Medlems- och kontoinformation</span>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div class="information-list">
                  <div class="information-row">
                    <span>Visningsnamn</span>
                    <strong>{{ displayName }}</strong>
                  </div>

                  <div class="information-row">
                    <span>Discord-användarnamn</span>
                    <strong>{{ user.username }}</strong>
                  </div>

                  <div class="information-row">
                    <span>Discord-ID</span>
                    <strong>{{ user.id }}</strong>
                  </div>

                  <div class="information-row">
                    <span>Charter</span>
                    <strong class="muted-value">
                      Inte kopplad ännu
                    </strong>
                  </div>

                  <div class="information-row">
                    <span>Medlemsnummer</span>
                    <strong class="muted-value">
                      Inte registrerat
                    </strong>
                  </div>
                </div>

                <v-alert
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="panel-alert"
                >
                  Charter och medlemsuppgifter kopplas in när
                  medlemsinformationen finns i databasen.
                </v-alert>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </section>

        <section class="section-block">
          <div class="section-heading">
            <div>
              <span class="eyebrow">SNABBLÄNKAR</span>
              <h2>Din portal</h2>
            </div>
            <span class="section-count">{{ shortcuts.length }} sidor</span>
          </div>

          <div class="shortcut-grid">
            <button
              v-for="item in shortcuts"
              :key="item.path"
              class="shortcut-card"
              type="button"
              @click="router.push(item.path)"
            >
              <div class="shortcut-icon">
                <v-icon :icon="item.icon" size="25" />
              </div>

              <div class="shortcut-copy">
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>

              <v-icon
                icon="mdi-arrow-top-right"
                class="shortcut-arrow"
                size="20"
              />
            </button>
          </div>
        </section>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="error-alert"
        >
          {{ error }}
        </v-alert>
      </template>
    </div>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: 75vh;
  padding: 64px 24px 96px;
  color: #f4f4f5;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(160, 20, 35, 0.12), transparent 38%),
    #0c0c0e;
}

.profile-container {
  width: min(1100px, 100%);
  margin: 0 auto;
}

.page-heading,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.page-heading {
  margin-bottom: 32px;
}

.eyebrow {
  display: block;
  margin-bottom: 10px;
  color: #d44a56;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2.4px;
}

.page-heading h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 48px);
  font-weight: 850;
  letter-spacing: -1.8px;
}

.page-heading h1 span {
  color: #c52b3b;
}

.page-heading p,
.shortcut-copy p,
.state-card p {
  color: #92929b;
}

.page-heading p {
  margin-top: 8px;
}

.profile-card,
.state-card {
  overflow: hidden;
  border: 1px solid #29292e;
  border-radius: 16px;
  background: #131316;
}

.profile-cover {
  position: relative;
  display: flex;
  height: 140px;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  padding: 24px;
  background:
    linear-gradient(110deg, rgba(12, 12, 14, 0.1), rgba(12, 12, 14, 0.8)),
    repeating-linear-gradient(135deg, #341218 0, #341218 1px, #1a1013 1px, #1a1013 18px);
}

.cover-mark {
  color: rgba(255, 255, 255, 0.08);
  font-size: 88px;
  font-weight: 950;
  letter-spacing: -8px;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 0 30px 28px;
}

.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
  margin-top: -46px;
}

.profile-avatar {
  border: 4px solid #131316;
  background: #242429;
}

.online-indicator {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 15px;
  height: 15px;
  border: 3px solid #131316;
  border-radius: 50%;
  background: #43b581;
}

.identity {
  min-width: 0;
  padding-top: 14px;
}

.identity h2 {
  overflow-wrap: anywhere;
  font-size: 25px;
  font-weight: 800;
}

.username {
  margin-top: 3px;
  color: #96969f;
}

.account-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  color: #c5c5cb;
  font-size: 13px;
}

.profile-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid #29292e;
}

.detail-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 22px 26px;
  border-right: 1px solid #29292e;
}

.detail-item:last-child {
  border-right: 0;
}

.detail-label {
  color: #8e8e98;
  font-size: 12px;
}

.detail-item strong {
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 650;
}

.detail-id {
  position: relative;
  padding-right: 52px;
}

.detail-id .v-btn {
  position: absolute;
  top: 34px;
  right: 12px;
}

.section-block {
  margin-top: 46px;
}

.section-heading {
  margin-bottom: 20px;
}

.section-heading h2 {
  font-size: 24px;
  font-weight: 800;
}

.section-count {
  color: #85858e;
  font-size: 12px;
}

.profile-panels {
  overflow: hidden;
  border: 1px solid #29292e;
  border-radius: 14px;
  background: #131316;
}

.profile-panels :deep(.v-expansion-panel) {
  color: #f4f4f5;
  background: #131316;
}

.profile-panels :deep(.v-expansion-panel-title) {
  min-height: 68px;
  padding: 16px 22px;
}

.profile-panels :deep(.v-expansion-panel-text__wrapper) {
  padding: 4px 22px 24px;
}

.profile-panels :deep(.v-expansion-panel-title:hover) {
  background: rgba(197, 43, 59, 0.05);
}

.panel-icon {
  margin-right: 14px;
  color: #d44a56;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
}

.count-chip {
  margin-right: 8px;
  background: #281216;
  color: #f16a76;
}

.role-list {
  display: grid;
  gap: 9px;
}

.role-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #29292e;
  border-radius: 9px;
  background: #0f0f12;
}

.role-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 50%;
  background: #85858e;
}

.role-name {
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 600;
}

.role-position {
  margin-left: auto;
  color: #777780;
  font-size: 11px;
}

.information-list {
  display: grid;
}

.information-row {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 15px 0;
  border-bottom: 1px solid #29292e;
}

.information-row:last-child {
  border-bottom: 0;
}

.information-row span {
  color: #92929b;
  font-size: 13px;
}

.information-row strong {
  overflow-wrap: anywhere;
  text-align: right;
  font-size: 13px;
}

.muted-value {
  color: #777780;
  font-weight: 500;
}

.panel-alert {
  margin-top: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 26px 12px;
  color: #92929b;
  text-align: center;
}

.empty-state p {
  color: #f4f4f5;
  font-weight: 650;
}

.empty-state span {
  max-width: 440px;
  font-size: 12px;
  line-height: 1.6;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.shortcut-card {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
  padding: 20px;
  text-align: left;
  border: 1px solid #29292e;
  border-radius: 12px;
  background: #131316;
  color: #f4f4f5;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.shortcut-card:hover {
  transform: translateY(-2px);
  border-color: #82303a;
  background: #191316;
}

.shortcut-icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #482027;
  border-radius: 10px;
  background: #251216;
  color: #df5663;
}

.shortcut-copy {
  min-width: 0;
}

.shortcut-copy h3 {
  font-size: 15px;
  font-weight: 750;
}

.shortcut-copy p {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.5;
}

.shortcut-arrow {
  margin-left: auto;
  color: #777780;
}

.state-card {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  text-align: center;
}

.state-card h2 {
  font-size: 22px;
}

.error-alert {
  margin-top: 24px;
}

@media (max-width: 700px) {
  .profile-page {
    padding: 38px 16px 64px;
  }

  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-main {
    flex-wrap: wrap;
    gap: 14px;
    padding: 0 18px 22px;
  }

  .identity {
    flex: 1;
  }

  .identity h2 {
    font-size: 20px;
  }

  .account-status {
    width: 100%;
    margin-left: 0;
  }

  .profile-details {
    grid-template-columns: 1fr;
  }

  .detail-item {
    padding: 17px 20px;
    border-right: 0;
    border-bottom: 1px solid #29292e;
  }

  .detail-item:last-child {
    border-bottom: 0;
  }

  .detail-id .v-btn {
    top: 28px;
  }

  .profile-panels :deep(.v-expansion-panel-title) {
    padding: 14px;
  }

  .profile-panels :deep(.v-expansion-panel-text__wrapper) {
    padding: 4px 14px 18px;
  }

  .panel-title {
    font-size: 12px;
  }

  .shortcut-grid {
    grid-template-columns: 1fr;
  }

  .information-row {
    flex-direction: column;
    gap: 6px;
  }

  .information-row strong {
    text-align: left;
  }
}
</style>
