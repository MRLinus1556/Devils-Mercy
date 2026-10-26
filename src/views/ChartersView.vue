<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { charters, type Charter } from '@/data/charters'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
type AuthState = { authenticated: boolean; user: { id: string; username: string } | null; roles: string[]; permissions: string[] }

type MemberStatus = 'Active' | 'Prospect' | 'Inactive'
type Member = {
  id: string
  name: string
  rank: string
  charterId: string
  status: MemberStatus
  image: string
  imagePosition: string
  joinedAt: string
  bio: string
}
type MemberForm = Omit<Member, 'id'>

const auth = ref<AuthState>({ authenticated: false, user: null, roles: [], permissions: [] })
const authLoading = ref(true)
const canManageCharters = computed(() => auth.value.authenticated && auth.value.roles.some(role => ['President', 'Vice President', 'Officer'].includes(role)))
const ranks = ['President', 'Vice President', 'Sergeant at Arms', 'Secretary', 'Treasurer', 'Road Captain', 'Enforcer', 'Full Patch', 'Prospect', 'Hangaround']
const statuses: MemberStatus[] = ['Active', 'Prospect', 'Inactive']

const search = ref('')
const selectedCountry = ref('All')
const selectedServer = ref('All servers')
const selectedStatus = ref('All statuses')
const selectedCharter = ref<Charter | null>(null)
const members = ref<Member[]>([])
const managedCharters = ref<Charter[]>([])
const activeModal = ref<'member' | 'charter' | null>(null)
const editingMemberId = ref<string | null>(null)
const selectedMember = ref<Member | null>(null)
const saving = ref(false)
const imageError = ref('')
const toast = ref('')
const memberForm = ref<MemberForm>(defaultForm())
const editingCharterId = ref<string | null>(null)
const charterForm = ref({
  name: '', shortName: '', location: '', country: 'United States', flag: '🇺🇸',
  server: '', status: 'Active', description: '', image: '', founded: '',
})
let toastTimer: ReturnType<typeof setTimeout> | undefined

const route = useRoute()
const mobileMenuOpen = ref(false)

const navigation = [
  { label: 'Home', path: '/' },
  { label: 'Organization', path: '/organisation' },
  { label: 'Charters', path: '/charters' },
  { label: 'Media', path: '/media' },
]
const countryFilters = [
  { label: 'Alla', value: 'All', flag: '✳' },
  { label: 'USA', value: 'United States', flag: '🇺🇸' },
  { label: 'Mexiko', value: 'Mexico', flag: '🇲🇽' },
  { label: 'Brasilien', value: 'Brazil', flag: '🇧🇷' },
  { label: 'Sverige', value: 'Sweden', flag: '🇸🇪' },
  { label: 'Finland', value: 'Finland', flag: '🇫🇮' },
]
function defaultForm(): MemberForm {
  return { name: '', rank: 'Full Patch', charterId: '', status: 'Active', image: '', imagePosition: '50% 35%', joinedAt: '', bio: '' }
}
const allCharters = computed(() => managedCharters.value.length ? managedCharters.value : charters)
const countries = computed(() => ['All', ...new Set(allCharters.value.map(c => c.country))])
const servers = computed(() => ['All servers', ...new Set(allCharters.value.map(c => c.server))])
const filteredCharters = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allCharters.value.filter(c => {
    const text = [c.name, c.shortName, c.location, c.country, c.server, c.description, c.status].join(' ').toLowerCase()
    return (!query || text.includes(query)) &&
      (selectedCountry.value === 'All' || c.country === selectedCountry.value) &&
      (selectedServer.value === 'All servers' || c.server === selectedServer.value) &&
      (selectedStatus.value === 'All statuses' || c.status === selectedStatus.value)
  })
})
function charterMembers(charter: Charter | null) {
  if (!charter) return []
  return members.value.filter(m => m.charterId === charter.id).sort((a, b) => {
    const ai = ranks.indexOf(a.rank), bi = ranks.indexOf(b.rank)
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.name.localeCompare(b.name)
  })
}
function clearFilters() {
  search.value = ''; selectedCountry.value = 'All'; selectedServer.value = 'All servers'; selectedStatus.value = 'All statuses'
}
function openCharter(charter: Charter) { selectedCharter.value = charter }
function closeCharter() { selectedCharter.value = null }
function statusClass(status: string) {
  if (status === 'Recruiting') return 'recruiting'
  if (status === 'Coming soon') return 'upcoming'
  return 'active'
}
function notify(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.value = '', 3000)
}
async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'API-anropet misslyckades.')
  return data
}
async function loadAuth() {
  authLoading.value = true
  try {
    const data = await api('/api/auth/me', { headers: {} })
    auth.value = { authenticated: data.authenticated === true, user: data.user ?? null, roles: Array.isArray(data.roles) ? data.roles : [], permissions: Array.isArray(data.permissions) ? data.permissions : [] }
  } catch {
    auth.value = { authenticated: false, user: null, roles: [], permissions: [] }
  } finally { authLoading.value = false }
}
async function loadData() {
  try {
    const data = await api('/api/charters', { headers: {} })
    managedCharters.value = Array.isArray(data.charters) ? data.charters : (Array.isArray(data) ? data : [])
    members.value = Array.isArray(data.members) ? data.members : []
    if (!members.value.length) {
      const memberData = await api('/api/charter-members', { headers: {} })
      members.value = Array.isArray(memberData.members) ? memberData.members : (Array.isArray(memberData) ? memberData : [])
    }
  } catch (error) { notify(error instanceof Error ? error.message : 'Kunde inte läsa Charters från servern.') }
}
async function persistMembers() { await loadData() }
async function persistCharters() { await loadData() }
function ensureManagedCharters() {
  if (!managedCharters.value.length) managedCharters.value = [...charters]
}
function openNewCharter() {
  if (!canManageCharters.value) { notify('Endast President, Vice President och Officer får ändra Charters.'); return }
  ensureManagedCharters()
  editingCharterId.value = null
  charterForm.value = {
    name: '', shortName: '', location: '', country: 'United States', flag: '🇺🇸',
    server: '', status: 'Active', description: '', image: '', founded: '',
  }
  activeModal.value = 'charter'
}
function openEditCharter(charter: Charter) {
  if (!canManageCharters.value) { notify('Endast President, Vice President och Officer får ändra Charters.'); return }
  ensureManagedCharters()
  editingCharterId.value = charter.id
  charterForm.value = {
    name: charter.name ?? '', shortName: charter.shortName ?? '',
    location: charter.location ?? '', country: charter.country ?? 'United States',
    flag: charter.flag ?? '🇺🇸', server: charter.server ?? '',
    status: charter.status ?? 'Active', description: charter.description ?? '',
    image: charter.image ?? '', founded: charter.founded ?? '',
  }
  closeCharter()
  activeModal.value = 'charter'
}
async function saveCharter() {
  if (!canManageCharters.value) { notify('Du saknar behörighet.'); return }
  if (!charterForm.value.name.trim()) return
  saving.value = true
  try {
    if (editingCharterId.value) await api(`/api/charters/${encodeURIComponent(editingCharterId.value)}`, { method: 'PUT', body: JSON.stringify(charterForm.value) })
    else await api('/api/charters', { method: 'POST', body: JSON.stringify(charterForm.value) })
    await loadData(); closeModal(); notify('Charter sparad.')
  } catch (error) { notify(error instanceof Error ? error.message : 'Kunde inte spara Charter.') }
  finally { saving.value = false }
}
async function deleteCharter(charter: Charter) {
  if (!canManageCharters.value) { notify('Du saknar behörighet.'); return }
  const count = members.value.filter(m => m.charterId === charter.id).length
  if (!window.confirm(count ? `Chartern har ${count} medlem(mar). Ta bort chartern ändå?` : `Ta bort ${charter.name}?`)) return
  try { await api(`/api/charters/${encodeURIComponent(charter.id)}`, { method: 'DELETE' }); await loadData(); if (selectedCharter.value?.id === charter.id) closeCharter(); notify('Charter borttagen.') }
  catch (error) { notify(error instanceof Error ? error.message : 'Kunde inte ta bort Charter.') }
}
function onCharterImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { imageError.value = 'Välj en bildfil.'; input.value = ''; return }
  if (file.size > 12 * 1024 * 1024) { imageError.value = 'Bilden måste vara mindre än 12 MB.'; input.value = ''; return }
  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { imageError.value = 'Kunde inte bearbeta bilden.'; return }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      charterForm.value.image = canvas.toDataURL('image/jpeg', 0.82)
    }
    image.onerror = () => imageError.value = 'Bilden kunde inte öppnas.'
    image.src = String(reader.result)
  }
  reader.readAsDataURL(file)
  input.value = ''
}
function openNewMember(charter?: Charter) {
  if (!canManageCharters.value) { notify('Endast President, Vice President och Officer får ändra Charters.'); return }
  editingMemberId.value = null
  memberForm.value = defaultForm()
  memberForm.value.charterId = charter?.id ?? selectedCharter.value?.id ?? allCharters.value[0]?.id ?? ''
  imageError.value = ''
  activeModal.value = 'member'
}
function openEditMember(member: Member) {
  if (!canManageCharters.value) { notify('Endast President, Vice President och Officer får ändra Charters.'); return }
  editingMemberId.value = member.id
  memberForm.value = { name: member.name, rank: member.rank, charterId: member.charterId, status: member.status, image: member.image, imagePosition: member.imagePosition || '50% 35%', joinedAt: member.joinedAt, bio: member.bio }
  imageError.value = ''
  selectedMember.value = null
  activeModal.value = 'member'
}
function closeModal() { activeModal.value = null; imageError.value = '' }
async function saveMember() {
  if (!canManageCharters.value) { notify('Du saknar behörighet.'); return }
  if (!memberForm.value.name.trim()) { imageError.value = 'Ange medlemmens namn.'; return }
  if (!memberForm.value.charterId) { imageError.value = 'Välj en Charter.'; return }
  saving.value = true
  try {
    if (editingMemberId.value) await api(`/api/charter-members/${encodeURIComponent(editingMemberId.value)}`, { method: 'PUT', body: JSON.stringify(memberForm.value) })
    else await api('/api/charter-members', { method: 'POST', body: JSON.stringify(memberForm.value) })
    await loadData(); closeModal(); notify('Medlemmen sparad.')
  } catch (error) { notify(error instanceof Error ? error.message : 'Kunde inte spara medlemmen.') }
  finally { saving.value = false }
}
async function deleteMember(member: Member) {
  if (!canManageCharters.value) { notify('Du saknar behörighet.'); return }
  if (!window.confirm(`Ta bort ${member.name} från medlemslistan?`)) return
  try { await api(`/api/charter-members/${encodeURIComponent(member.id)}`, { method: 'DELETE' }); await loadData(); selectedMember.value = null; notify('Medlemmen togs bort.') }
  catch (error) { notify(error instanceof Error ? error.message : 'Kunde inte ta bort medlemmen.') }
}
function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  imageError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) { imageError.value = 'Välj en bildfil.'; input.value = ''; return }
  if (file.size > 12 * 1024 * 1024) { imageError.value = 'Bilden måste vara mindre än 12 MB.'; input.value = ''; return }
  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 1100 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { imageError.value = 'Kunde inte bearbeta bilden.'; return }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      memberForm.value.image = canvas.toDataURL('image/jpeg', 0.82)
    }
    image.onerror = () => imageError.value = 'Bilden kunde inte öppnas.'
    image.src = String(reader.result)
  }
  reader.readAsDataURL(file)
  input.value = ''
}
function currentCharterName(id: string) { return allCharters.value.find(c => c.id === id)?.name ?? 'Okänd Charter' }
onMounted(async () => { await loadAuth(); await loadData() })
</script>

<template>
  <main class="charters-page">
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
  

    <section class="charter-hero">
      <div class="hero-backdrop"></div><div class="hero-shade"></div>
      <div class="hero-topline"><span>DM / 001</span><span>FIVEM ROLEPLAY · GLOBAL NETWORK</span></div>
      <div class="hero-main">
        <div class="hero-kicker"><span class="live-dot"></span> THE CHARTER DIRECTORY</div>
        <h1>Beyond <span>Territory<span class="red-period">.</span></span></h1>
        <p class="hero-copy">One identity. Different territories. Explore the Devils Mercy MC network.</p>
        <div class="hero-bottom"><div class="hero-count"><strong>{{ String(allCharters.length).padStart(2, '0') }}</strong><span>CHARTERS LISTED</span></div><span class="hero-rule"></span><span class="hero-location">WORLDWIDE NETWORK</span></div>
      </div>
      <div class="hero-side-label">DEVILS MERCY MC — GLOBAL DIRECTORY</div>
    </section>

    <section class="directory">
      <div class="directory-heading">
        <div><span class="section-overline">EXPLORE THE NETWORK</span><h2>Find your <span>territory.</span></h2><p class="section-description">Explore locations, servers, charter information and members.</p></div>
        <div class="results-count"><strong>{{ String(filteredCharters.length).padStart(2, '0') }}</strong><span>/ {{ String(allCharters.length).padStart(2, '0') }}</span><small>RESULTS</small></div>
      </div>
      <div class="country-filters" aria-label="Filter by country">
        <button v-for="filter in countryFilters" :key="filter.value" type="button" class="country-filter" :class="{ active: selectedCountry === filter.value }" @click="selectedCountry = filter.value"><span class="filter-flag">{{ filter.flag }}</span>{{ filter.label }}</button>
      </div>
      <div class="filter-panel">
        <label class="search-box"><v-icon icon="mdi-magnify" size="20" /><input v-model="search" type="search" placeholder="Sök charter, stad, land eller server..." aria-label="Sök charters" /><button v-if="search" type="button" aria-label="Rensa sökning" @click="search = ''"><v-icon icon="mdi-close" size="16" /></button></label>
        <div class="filter-select"><v-icon icon="mdi-earth" size="17" /><select v-model="selectedCountry" aria-label="Filtrera land"><option value="All">Alla länder</option><option v-for="country in countries.filter(c => c !== 'All')" :key="country" :value="country">{{ country }}</option></select><v-icon icon="mdi-chevron-down" size="16" /></div>
        <div class="filter-select"><v-icon icon="mdi-server-outline" size="17" /><select v-model="selectedServer" aria-label="Filtrera server"><option v-for="server in servers" :key="server" :value="server">{{ server === 'All servers' ? 'Alla servrar' : server }}</option></select><v-icon icon="mdi-chevron-down" size="16" /></div>
        <div class="filter-select"><v-icon icon="mdi-circle-slice-8" size="17" /><select v-model="selectedStatus" aria-label="Filtrera status"><option v-for="status in ['All statuses', 'Active', 'Recruiting', 'Coming soon']" :key="status" :value="status">{{ status === 'All statuses' ? 'Alla statusar' : status }}</option></select><v-icon icon="mdi-chevron-down" size="16" /></div>
        <button type="button" class="reset-button" @click="clearFilters"><v-icon icon="mdi-filter-off-outline" size="16" /><span>Återställ</span></button>
      </div>
      <div class="filter-summary"><span>VISAR {{ filteredCharters.length }} AV {{ allCharters.length }} CHARTERS</span><span>{{ members.length }} REGISTRERADE MEDLEMMAR</span></div>
      <section v-if="canManageCharters" class="charter-admin-strip">
        <div><span class="section-overline">DIRECTORY MANAGEMENT</span><h3>MANAGE <span>CHARTERS.</span></h3><p>Skapa nya Charters eller ändra befintliga uppgifter.</p></div>
        <button type="button" class="button-primary" @click="openNewCharter"><v-icon icon="mdi-plus" size="18" /> CREATE CHARTER</button>
      </section>

      <div v-if="filteredCharters.length" class="charter-grid">
        <button v-for="(charter, index) in filteredCharters" :key="charter.id" type="button" class="charter-card" @click="openCharter(charter)">
          <div class="card-image"><img :src="charter.image || '/images/logo.png'" :alt="charter.name" loading="lazy" /><div class="image-shade"></div><div class="card-top"><span class="card-number">{{ String(index + 1).padStart(2, '0') }}</span><span class="card-flag">{{ charter.flag }}</span></div><span class="image-location"><v-icon icon="mdi-map-marker-outline" size="14" />{{ charter.location }}</span><span class="card-open-icon"><v-icon icon="mdi-arrow-up-right" size="20" /></span></div>
          <div class="card-info"><div class="card-title-row"><div class="card-title-content"><h3>{{ charter.name }}</h3><span class="card-country">{{ charter.country }}</span></div><span class="card-status" :class="statusClass(charter.status)"><span class="status-dot"></span>{{ charter.status }}</span></div><p class="card-description">{{ charter.description }}</p><div class="card-bottom"><span class="card-server"><v-icon icon="mdi-server-outline" size="14" />{{ charter.server }}</span><span class="card-view">LÄS MER <span>↗</span></span></div><div class="member-count"><v-icon icon="mdi-account-group-outline" size="16" />{{ members.filter(m => m.charterId === charter.id).length }} MEDLEMMAR</div></div>
        </button>
      </div>
      <div v-else class="empty-state"><v-icon icon="mdi-map-search-outline" size="38" /><h3>Inga charters hittades.</h3><p>Ändra din sökning eller prova att återställa filtren.</p><button type="button" class="reset-button" @click="clearFilters"><v-icon icon="mdi-refresh" size="16" />Återställ alla filter</button></div>
     
    </section>

    <!-- Charter details and its member roster -->
    <v-dialog :model-value="!!selectedCharter" max-width="900" scrollable content-class="charter-dialog-content" @update:model-value="value => !value && closeCharter()">
      <section v-if="selectedCharter" class="detail-panel">
        <div class="detail-image"><img :src="selectedCharter.image || '/images/logo.png'" :alt="selectedCharter.name" /><div class="detail-image-shade"></div><button type="button" class="detail-close" aria-label="Stäng" @click="closeCharter"><v-icon icon="mdi-close" /></button><div class="detail-heading"><span class="detail-kicker">{{ selectedCharter.flag }} {{ selectedCharter.country }}</span><h2>{{ selectedCharter.name }}<span>.</span></h2><p>{{ selectedCharter.location }}</p></div></div>
        <div class="detail-content">
          <div class="detail-label"><span class="live-dot"></span> CHARTER PROFILE</div>
          <p class="detail-description">{{ selectedCharter.description }}</p>
          <div class="detail-facts"><div><span>FIVEM SERVER</span><strong>{{ selectedCharter.server }}</strong></div><div><span>STATUS</span><strong>{{ selectedCharter.status }}</strong></div><div><span>ESTABLISHED</span><strong>{{ selectedCharter.founded }}</strong></div><div><span>MEMBERS</span><strong>{{ charterMembers(selectedCharter).length }}</strong></div></div>
          <div v-if="canManageCharters" class="charter-detail-actions">
            <button type="button" class="button-secondary" @click="openEditCharter(selectedCharter)"><v-icon icon="mdi-pencil-outline" size="17" /> EDIT CHARTER</button>
            <button type="button" class="button-danger" @click="deleteCharter(selectedCharter)"><v-icon icon="mdi-trash-can-outline" size="17" /> DELETE CHARTER</button>
          </div>
          <div class="roster-heading"><div><span class="section-overline">THE PEOPLE BEHIND THE PATCH</span><h3>CHARTER <span>ROSTER.</span></h3></div><button v-if="canManageCharters" type="button" class="button-primary" @click="openNewMember(selectedCharter)"><v-icon icon="mdi-account-plus-outline" size="18" /> ADD MEMBER</button></div>
          <div v-if="charterMembers(selectedCharter).length" class="roster-grid">
            <article v-for="member in charterMembers(selectedCharter)" :key="member.id" class="roster-card" @click="selectedMember = member">
              <div class="roster-photo"><img v-if="member.image" :src="member.image" :alt="member.name" :style="{ objectPosition: member.imagePosition || '50% 35%' }" /><div v-else class="roster-placeholder"><v-icon icon="mdi-account-outline" size="36" /></div><span class="status-tag" :class="member.status.toLowerCase()">{{ member.status }}</span></div>
              <div class="roster-info"><span class="roster-rank">{{ member.rank }}</span><h4>{{ member.name }}</h4><span v-if="member.joinedAt" class="joined-at">MEMBER SINCE {{ member.joinedAt }}</span><button v-if="canManageCharters" type="button" class="edit-member" @click.stop="openEditMember(member)"><v-icon icon="mdi-pencil-outline" size="16" /> EDIT MEMBER</button></div>
            </article>
          </div>
          <div v-else class="roster-empty"><v-icon icon="mdi-account-group-outline" size="30" /><p>Inga medlemmar är registrerade i denna Charter ännu.</p><button type="button" class="button-secondary" @click="openNewMember(selectedCharter)"><v-icon icon="mdi-plus" size="18" /> Lägg till första medlemmen</button></div>
          <button type="button" class="detail-done" @click="closeCharter">STÄNG PROFIL <span>↗</span></button>
        </div>
      </section>
    </v-dialog>

    <!-- Member profile -->
    <v-dialog :model-value="!!selectedMember" max-width="560" @update:model-value="value => !value && (selectedMember = null)">
      <section v-if="selectedMember" class="member-profile">
        <button type="button" class="detail-close profile-close" @click="selectedMember = null"><v-icon icon="mdi-close" /></button>
        <img v-if="selectedMember.image" class="profile-photo" :src="selectedMember.image" :alt="selectedMember.name" :style="{ objectPosition: selectedMember.imagePosition || '50% 35%' }" />
        <div v-else class="profile-photo profile-placeholder"><v-icon icon="mdi-account-outline" size="60" /></div>
        <div class="profile-copy"><span class="section-overline">{{ currentCharterName(selectedMember.charterId) }} / {{ selectedMember.status }}</span><h2>{{ selectedMember.name }}<span>.</span></h2><h3>{{ selectedMember.rank }}</h3><p v-if="selectedMember.bio">{{ selectedMember.bio }}</p><p v-if="selectedMember.joinedAt" class="joined-at">MEMBER SINCE {{ selectedMember.joinedAt }}</p><div v-if="canManageCharters" class="profile-actions"><button class="button-secondary" type="button" @click="openEditMember(selectedMember!)"><v-icon icon="mdi-pencil-outline" size="17" /> EDIT</button><button class="button-danger" type="button" @click="deleteMember(selectedMember!)"><v-icon icon="mdi-trash-can-outline" size="17" /> REMOVE</button></div></div>
      </section>
    </v-dialog>

    <!-- Existing-style member create/edit form -->
    <v-dialog :model-value="activeModal === 'member'" max-width="760" scrollable @update:model-value="value => !value && closeModal()">
      <section class="member-form-modal">
        <header class="form-header"><div><span class="section-overline">DEVILS MERCY MC / ROSTER MANAGEMENT</span><h2>{{ editingMemberId ? 'EDIT' : 'NEW' }} <span>MEMBER.</span></h2><p>Medlemsuppgifter sparas lokalt i denna webbläsare.</p></div><button class="detail-close" type="button" @click="closeModal"><v-icon icon="mdi-close" /></button></header>
        <form class="form-body" @submit.prevent="saveMember">
          <div class="form-grid">
            <label class="form-field full"><span>FULL NAME *</span><input v-model="memberForm.name" required maxlength="100" placeholder="Medlemmens namn" /></label>
            <label class="form-field"><span>CHARTER *</span><select v-model="memberForm.charterId" required><option value="" disabled>Välj Charter</option><option v-for="charter in allCharters" :key="charter.id" :value="charter.id">{{ charter.name }}</option></select></label>
            <label class="form-field"><span>RANK *</span><select v-model="memberForm.rank" required><option v-for="rank in ranks" :key="rank" :value="rank">{{ rank }}</option></select></label>
            <label class="form-field"><span>STATUS</span><select v-model="memberForm.status"><option v-for="status in statuses" :key="status" :value="status">{{ status }}</option></select></label>
            <label class="form-field"><span>MEMBER SINCE</span><input v-model="memberForm.joinedAt" placeholder="t.ex. 2025" maxlength="30" /></label>
            <label class="form-field full"><span>BIO / NOTES</span><textarea v-model="memberForm.bio" rows="3" maxlength="1000" placeholder="Kort profiltext (valfritt)"></textarea></label>
            <div class="form-field full"><span>PROFILE IMAGE</span><div class="image-upload"><img v-if="memberForm.image" :src="memberForm.image" alt="Förhandsvisning" :style="{ objectPosition: memberForm.imagePosition }" /><div v-else class="upload-placeholder"><v-icon icon="mdi-image-plus-outline" size="30" /><span>Ingen bild vald</span></div><div class="upload-actions"><label class="button-secondary upload-button"><v-icon icon="mdi-upload" size="17" />{{ memberForm.image ? 'BYT BILD' : 'VÄLJ BILD' }}<input type="file" accept="image/*" @change="onImageSelected" /></label><label class="form-field"><span>IMAGE POSITION</span><select v-model="memberForm.imagePosition"><option value="50% 15%">Top</option><option value="50% 35%">Upper centre</option><option value="50% 50%">Centre</option><option value="50% 70%">Lower centre</option><option value="50% 90%">Bottom</option></select></label><button v-if="memberForm.image" class="remove-image" type="button" @click="memberForm.image = ''"><v-icon icon="mdi-trash-can-outline" size="16" /> REMOVE IMAGE</button></div></div></div>
          </div>
          <p v-if="imageError" class="form-error">{{ imageError }}</p>
          <footer class="form-footer"><button class="button-secondary" type="button" @click="closeModal">CANCEL</button><button class="button-primary" type="submit" :disabled="saving"><v-icon icon="mdi-check" size="18" />{{ saving ? 'SAVING...' : editingMemberId ? 'SAVE CHANGES' : 'CREATE MEMBER' }}</button></footer>
        </form>
      </section>
    </v-dialog>
    <v-dialog :model-value="activeModal === 'charter'" max-width="760" scrollable @update:model-value="value => !value && closeModal()">
      <section class="member-form-modal">
        <header class="form-header"><div><span class="section-overline">DEVILS MERCY MC / CHARTER MANAGEMENT</span><h2>{{ editingCharterId ? 'EDIT' : 'NEW' }} <span>CHARTER.</span></h2><p>Charter-information sparas lokalt i denna webbläsare.</p></div><button class="detail-close" type="button" @click="closeModal"><v-icon icon="mdi-close" /></button></header>
        <form class="form-body" @submit.prevent="saveCharter">
          <div class="form-grid">
            <label class="form-field full"><span>CHARTER NAME *</span><input v-model="charterForm.name" required maxlength="80" placeholder="t.ex. Los Santos" /></label>
            <label class="form-field"><span>SHORT NAME</span><input v-model="charterForm.shortName" maxlength="30" placeholder="t.ex. LS" /></label>
            <label class="form-field"><span>LOCATION</span><input v-model="charterForm.location" maxlength="100" placeholder="Stad / region" /></label>
            <label class="form-field"><span>COUNTRY</span><input v-model="charterForm.country" maxlength="80" placeholder="United States" /></label>
            <label class="form-field"><span>FLAG / EMOJI</span><input v-model="charterForm.flag" maxlength="12" placeholder="🇺🇸" /></label>
            <label class="form-field"><span>FIVEM SERVER</span><input v-model="charterForm.server" maxlength="100" placeholder="Servernamn" /></label>
            <label class="form-field"><span>STATUS</span><select v-model="charterForm.status"><option>Active</option><option>Recruiting</option><option>Coming soon</option></select></label>
            <label class="form-field"><span>ESTABLISHED</span><input v-model="charterForm.founded" maxlength="30" placeholder="t.ex. 2024" /></label>
            <label class="form-field full"><span>DESCRIPTION</span><textarea v-model="charterForm.description" rows="3" maxlength="1000" placeholder="Beskriv denna Charter..."></textarea></label>
            <div class="form-field full"><span>CHARTER IMAGE</span><div class="image-upload"><img v-if="charterForm.image" :src="charterForm.image" alt="Förhandsvisning av Charter" /><div v-else class="upload-placeholder"><v-icon icon="mdi-image-plus-outline" size="30" /><span>Ingen bild vald</span></div><div class="upload-actions"><label class="button-secondary upload-button"><v-icon icon="mdi-upload" size="17" />{{ charterForm.image ? 'BYT BILD' : 'VÄLJ BILD' }}<input type="file" accept="image/*" @change="onCharterImageSelected" /></label><button v-if="charterForm.image" class="remove-image" type="button" @click="charterForm.image = ''"><v-icon icon="mdi-trash-can-outline" size="16" /> REMOVE IMAGE</button></div></div></div>
          </div>
          <p v-if="imageError" class="form-error">{{ imageError }}</p>
          <footer class="form-footer"><button class="button-secondary" type="button" @click="closeModal">CANCEL</button><button class="button-primary" type="submit"><v-icon icon="mdi-check" size="18" />{{ editingCharterId ? 'SAVE CHANGES' : 'CREATE CHARTER' }}</button></footer>
        </form>
      </section>
    </v-dialog>
    <Transition name="toast"><div v-if="toast" class="toast-message"><v-icon icon="mdi-check-circle-outline" size="19" />{{ toast }}</div></Transition>
  </main>
</template>

<style scoped>
.charters-page{--bg:#090909;--panel:#111;--line:rgba(255,255,255,.11);--muted:#a19b97;--red:#8b0000;--red-light:#bb2424;position:relative;min-height:100vh;overflow:hidden;background:var(--bg);color:#f3f0ed;font-family:Inter,sans-serif;isolation:isolate}
.ambient{position:absolute;z-index:-1;width:550px;height:550px;border-radius:50%;filter:blur(100px);opacity:.12;pointer-events:none}.ambient-one{top:280px;left:-300px;background:#8b0000}.ambient-two{top:1050px;right:-300px;background:#6f0000}
.site-header{position:relative;z-index:50;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:32px;min-height:88px;padding:16px clamp(24px,6vw,96px);border-bottom:1px solid var(--line);background:rgba(9,9,9,.96);backdrop-filter:blur(18px)}
.brand{display:inline-flex;align-items:center;justify-self:start;gap:13px;min-width:0;color:#fff;text-decoration:none}
.brand-logo{display:block;width:46px;height:46px;flex-shrink:0;object-fit:contain}
.brand-text{display:flex;flex-direction:column;gap:4px}
.brand-text strong{color:#f5f2ef;font-family:'Barlow Condensed',Impact,sans-serif;font-size:21px;font-weight:800;line-height:1;letter-spacing:2px}
.brand-text small{color:#8d8580;font-size:8px;font-weight:700;line-height:1.4;letter-spacing:2.2px}
.main-navigation{display:flex;align-items:center;justify-content:center;gap:clamp(20px,2.5vw,38px);height:100%}
.nav-link{position:relative;display:inline-flex;align-items:center;min-height:48px;color:#a8a19b;text-decoration:none;font-size:10px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;transition:color .2s ease}
.nav-link::after{position:absolute;right:0;bottom:3px;left:0;height:2px;background:#a30b0b;content:'';transform:scaleX(0);transform-origin:left;transition:transform .2s ease}
.nav-link:hover,.nav-link.nav-active{color:#fff}
.nav-link.nav-active::after{transform:scaleX(1)}
.discord-link{display:inline-flex;align-items:center;justify-self:end;gap:9px;padding:11px 15px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.025);color:#eee8e4;text-decoration:none;font-size:10px;font-weight:800;letter-spacing:1px;transition:border-color .2s ease,background .2s ease}
.discord-link:hover{border-color:rgba(177,25,25,.7);background:rgba(139,0,0,.14)}
.mobile-menu-toggle,.mobile-navigation{display:none}
.charter-hero{position:relative;min-height:430px;padding:28px 8% 45px;overflow:hidden;background:#111}.hero-backdrop{position:absolute;inset:0;background:radial-gradient(ellipse at 72% 45%,#3b0808 0%,transparent 45%),linear-gradient(100deg,#080808 10%,#111 65%,#190707)}.hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,#080808f5 0%,#080808b0 54%,#08080840 100%)}.hero-topline{position:relative;display:flex;justify-content:space-between;color:#8b8580;font-size:9px;font-weight:800;letter-spacing:2px}.hero-main{position:relative;max-width:700px;padding-top:58px}.hero-kicker,.section-overline{color:#b8aaa4;font-size:10px;font-weight:800;letter-spacing:2px}.live-dot,.status-dot{display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:#b71818;box-shadow:0 0 12px #b7181880}.hero-main h1{margin:18px 0;font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(58px,8vw,94px);font-weight:800;line-height:.92;letter-spacing:-2px;text-transform:uppercase}.hero-main h1>span{display:block;color:#e6e1dd}.red-period,.detail-heading h2 span,.profile-copy h2 span,.roster-heading h3 span{color:#b71818}.hero-copy{max-width:350px;color:#a9a29d;font-size:14px;line-height:1.8}.hero-bottom{display:flex;align-items:center;gap:22px;margin-top:38px}.hero-count{display:flex;flex-direction:column;gap:4px}.hero-count strong{font-family:'Barlow Condensed',sans-serif;font-size:29px}.hero-count span,.hero-location{color:#928a85;font-size:9px;font-weight:800;letter-spacing:1.5px}.hero-rule{width:70px;height:1px;background:#6e1010}.hero-side-label{position:absolute;right:3%;bottom:50px;writing-mode:vertical-rl;color:#ffffff40;font-size:9px;letter-spacing:3px}
.directory{max-width:1440px;margin:0 auto;padding:65px 6% 35px}.directory-heading{display:flex;align-items:end;justify-content:space-between;gap:25px}.directory-heading h2{margin:10px 0 8px;font-family:'Barlow Condensed',sans-serif;font-size:42px;text-transform:uppercase}.directory-heading h2 span{color:#b71818}.section-description{color:#918983;font-size:13px}.results-count{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:5px 8px;color:#918983}.results-count strong{color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:34px}.results-count small{grid-column:1/-1;font-size:8px;letter-spacing:2px;text-align:right}.country-filters{display:flex;flex-wrap:wrap;gap:8px;margin:28px 0 15px}.country-filter,.reset-button{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid var(--line);background:#101010;color:#a9a29d;font:700 10px Inter,sans-serif;letter-spacing:.4px;cursor:pointer}.country-filter.active,.country-filter:hover{border-color:#7f1515;background:#230b0b;color:#fff}.filter-flag{font-size:14px}.filter-panel{display:grid;grid-template-columns:minmax(200px,1.7fr) repeat(3,minmax(125px,1fr)) auto;gap:9px;padding:13px;border:1px solid var(--line);background:#0f0f0f}.search-box,.filter-select{display:flex;align-items:center;gap:9px;min-width:0;padding:0 11px;border:1px solid #ffffff14;color:#8f8882}.search-box input,.filter-select select{width:100%;min-width:0;padding:12px 0;border:0;outline:0;background:transparent;color:#eee;font:11px Inter,sans-serif}.search-box input::placeholder{color:#716b66}.search-box button{border:0;background:transparent;color:#aaa;cursor:pointer}.filter-select select option{background:#111}.filter-summary{display:flex;justify-content:space-between;gap:12px;margin:14px 1px;color:#77716c;font-size:8px;font-weight:800;letter-spacing:1.4px}.charter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.charter-card{display:block;min-width:0;padding:0;overflow:hidden;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:inherit;text-align:left;font-family:inherit;cursor:pointer;transition:border-color .18s,transform .18s}.charter-card:hover{transform:translateY(-3px);border-color:var(--red-light)}.card-image{position:relative;height:145px;overflow:hidden;background:#141920}.card-image img,.detail-image>img{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(.72);transition:transform .35s}.charter-card:hover .card-image img{transform:scale(1.045)}.image-shade{position:absolute;inset:0;background:linear-gradient(180deg,#05070b75,transparent 34%,#07090de8)}.card-top{position:absolute;top:10px;right:10px;left:10px;display:flex;align-items:center;justify-content:space-between}.card-number{color:#ffffffbb;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800}.card-flag{display:grid;place-items:center;width:27px;height:27px;border:1px solid #ffffff25;border-radius:50%;background:#090c11c9;font-size:14px}.image-location{position:absolute;right:10px;bottom:11px;left:10px;display:flex;align-items:center;gap:5px;color:#d0d5dc;font-size:9px}.card-open-icon{position:absolute;right:10px;bottom:9px;display:grid;place-items:center;width:23px;height:23px;border:1px solid #ffffff40;background:#090c11b0}.card-info{padding:16px 15px 13px}.card-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.card-title-content h3{margin:0;color:#f2efec;font-family:'Barlow Condensed',sans-serif;font-size:23px;font-weight:800;line-height:1.05}.card-country{display:block;margin-top:6px;color:#918983;font-size:9px;letter-spacing:1px;text-transform:uppercase}.card-status{display:flex;align-items:center;white-space:nowrap;color:#d0b6a7;font-size:8px;font-weight:800;text-transform:uppercase}.card-status .status-dot{width:5px;height:5px;margin-right:5px}.card-status.recruiting{color:#e0b85e}.card-status.upcoming{color:#999}.card-description{display:-webkit-box;min-height:37px;margin:13px 0;color:#918983;font-size:10px;line-height:1.7;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.card-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:12px;border-top:1px solid var(--line)}.card-server{display:flex;align-items:center;gap:5px;color:#928a85;font-size:9px}.card-view{color:#d9d3cf;font-size:8px;font-weight:800;letter-spacing:1px}.card-view span{color:#b71818}.member-count{display:flex;align-items:center;gap:7px;margin-top:12px;padding-top:10px;border-top:1px solid #ffffff0d;color:#b9a7a0;font-size:9px;font-weight:800;letter-spacing:1px}.empty-state{display:flex;align-items:center;flex-direction:column;padding:65px 15px;color:#938b85;text-align:center}.empty-state h3{color:#eee;font-family:'Barlow Condensed',sans-serif;font-size:25px}.empty-state p{font-size:12px}.directory-footer{display:flex;align-items:center;gap:18px;margin-top:55px;padding-top:20px;border-top:1px solid var(--line);color:#77716c;font-size:8px;font-weight:800;letter-spacing:1.5px}.footer-line{flex:1;height:1px;background:var(--line)}
.detail-panel,.member-form-modal,.member-profile{overflow:hidden;border:1px solid #ffffff1a;border-radius:7px;background:#0d0d0d;color:#eee}.detail-image{position:relative;height:250px;overflow:hidden;background:#161616}.detail-image>img{filter:saturate(.6)}.detail-image-shade{position:absolute;inset:0;background:linear-gradient(0deg,#090909 0%,#09090920 100%)}.detail-close{position:absolute;top:15px;right:15px;z-index:2;display:grid;place-items:center;width:38px;height:38px;border:1px solid #ffffff35;background:#080808b8;color:#fff;cursor:pointer}.detail-heading{position:absolute;right:25px;bottom:22px;left:25px}.detail-kicker{color:#d6c5bd;font-size:10px;font-weight:800;letter-spacing:2px}.detail-heading h2{margin:8px 0 3px;font-family:'Barlow Condensed',sans-serif;font-size:48px;line-height:1;text-transform:uppercase}.detail-heading p{margin:0;color:#b0a8a1;font-size:12px}.detail-content{padding:25px}.detail-label{color:#a69b95;font-size:9px;font-weight:800;letter-spacing:2px}.detail-description{max-width:680px;color:#b2aaa4;font-size:12px;line-height:1.8}.detail-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:22px 0 28px;padding:16px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.detail-facts div{display:flex;flex-direction:column;gap:7px;min-width:0}.detail-facts span{color:#817973;font-size:8px;font-weight:800;letter-spacing:1px}.detail-facts strong{overflow-wrap:anywhere;color:#eee;font-size:11px}.roster-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:16px}.roster-heading h3{margin:7px 0 0;font-family:'Barlow Condensed',sans-serif;font-size:30px}.button-primary,.button-secondary,.button-danger{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:10px 13px;border:1px solid #8f1111;background:#8b0000;color:#fff;font:800 9px Inter,sans-serif;letter-spacing:.8px;cursor:pointer}.button-primary:hover{background:#a50b0b}.button-secondary{border-color:#ffffff25;background:#151515;color:#e2dcd7}.button-secondary:hover{border-color:#a31a1a}.button-danger{border-color:#652020;background:#240d0d;color:#ffbdbd}.roster-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.roster-card{overflow:hidden;border:1px solid var(--line);background:#121212;cursor:pointer}.roster-photo{position:relative;height:165px;background:#191919}.roster-photo>img{width:100%;height:100%;object-fit:cover;filter:saturate(.75)}.roster-placeholder,.profile-placeholder{display:grid;place-items:center;width:100%;height:100%;color:#6f6560;background:radial-gradient(ellipse,#242020,#111)}.status-tag{position:absolute;top:9px;left:9px;padding:5px 7px;background:#111d;color:#e5e1de;font-size:8px;font-weight:800;text-transform:uppercase}.status-tag.active{border:1px solid #4e8052;color:#a4d8a9}.status-tag.prospect{border:1px solid #94752d;color:#e5c66f}.status-tag.inactive{border:1px solid #6a6262;color:#aaa}.roster-info{padding:13px}.roster-rank{color:#bd6969;font-size:8px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase}.roster-info h4{margin:7px 0 8px;font-family:'Barlow Condensed',sans-serif;font-size:23px;overflow-wrap:anywhere}.joined-at{color:#7f7771;font-size:8px;letter-spacing:1px}.edit-member{display:flex;align-items:center;gap:6px;margin-top:12px;padding:7px 0;border:0;border-top:1px solid var(--line);background:transparent;color:#c7bdb7;font-size:8px;font-weight:800;letter-spacing:1px;cursor:pointer;width:100%}.roster-empty{display:flex;align-items:center;flex-direction:column;gap:12px;padding:35px 15px;border:1px dashed #ffffff22;color:#8e8580;text-align:center}.roster-empty p{font-size:12px}.detail-done{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:28px;padding:14px 16px;border:1px solid var(--line);background:#121212;color:#eee;font-size:9px;font-weight:800;letter-spacing:1.3px;cursor:pointer}.detail-done span{color:#c21d1d;font-size:17px}
.member-profile{position:relative}.profile-photo{display:block;width:100%;height:300px;object-fit:cover;filter:saturate(.75)}.profile-copy{padding:24px}.profile-copy h2{margin:9px 0 2px;font-family:'Barlow Condensed',sans-serif;font-size:42px;text-transform:uppercase}.profile-copy h3{margin:0 0 14px;color:#bd6969;font-size:12px;text-transform:uppercase;letter-spacing:1px}.profile-copy p{color:#b2aaa4;font-size:12px;line-height:1.8}.profile-actions{display:flex;gap:9px;margin-top:20px}.member-form-modal{max-height:90vh;overflow:auto}.form-header{position:relative;display:flex;justify-content:space-between;gap:20px;padding:25px;border-bottom:1px solid var(--line);background:linear-gradient(100deg,#171010,#0d0d0d)}.form-header h2{margin:9px 0 5px;font-family:'Barlow Condensed',sans-serif;font-size:36px}.form-header h2 span{color:#c11c1c}.form-header p{margin:0;color:#918983;font-size:11px}.form-body{padding:24px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.form-field{display:flex;flex-direction:column;gap:8px;min-width:0;color:#a79d97;font-size:8px;font-weight:800;letter-spacing:1.2px}.form-field.full{grid-column:1/-1}.form-field input,.form-field select,.form-field textarea{width:100%;min-width:0;padding:12px;border:1px solid #ffffff20;outline:0;border-radius:0;background:#111;color:#eee;font:12px Inter,sans-serif;letter-spacing:0}.form-field input:focus,.form-field select:focus,.form-field textarea:focus{border-color:#8f1515}.form-field select option{background:#111}.image-upload{display:grid;grid-template-columns:145px minmax(0,1fr);gap:15px;padding:12px;border:1px solid var(--line);background:#101010}.image-upload>img{width:145px;height:175px;object-fit:cover;background:#1a1a1a}.upload-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;min-height:150px;background:#171717;color:#766d68;font-size:9px}.upload-actions{display:flex;align-items:flex-start;flex-direction:column;gap:12px}.upload-button{position:relative;cursor:pointer}.upload-button input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.remove-image{display:flex;align-items:center;gap:6px;border:0;background:transparent;color:#d67c7c;font-size:8px;font-weight:800;cursor:pointer}.form-error{color:#ff8989;font-size:11px}.form-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:25px;padding-top:18px;border-top:1px solid var(--line)}.toast-message{position:fixed;right:22px;bottom:22px;z-index:20;display:flex;align-items:center;gap:9px;padding:13px 16px;border:1px solid #4d2828;background:#170d0d;color:#f0e6e1;font-size:12px;box-shadow:0 10px 35px #0008}.toast-enter-active,.toast-leave-active{transition:opacity .2s,transform .2s}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(8px)}
.charter-admin-strip{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:22px 0;padding:20px;border:1px solid #ffffff18;background:linear-gradient(100deg,#160b0b,#101010)}.charter-admin-strip h3{margin:7px 0 4px;font-family:'Barlow Condensed',sans-serif;font-size:26px}.charter-admin-strip h3 span{color:#b71818}.charter-admin-strip p{margin:0;color:#918983;font-size:11px}.charter-detail-actions{display:flex;flex-wrap:wrap;gap:9px;margin:-12px 0 26px}
@media(max-width:1100px){.charter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.filter-panel{grid-template-columns:repeat(2,minmax(0,1fr))}.search-box{grid-column:1/-1}.reset-button{justify-content:center}.site-header{gap:20px;padding-right:4%;padding-left:4%}.brand-logo{width:40px;height:40px}.brand-text strong{font-size:18px}.brand-text small{font-size:7px;letter-spacing:1.7px}.main-navigation{gap:17px}.nav-link{font-size:9px;letter-spacing:.8px}.discord-link{gap:6px;padding:10px}}
@media(max-width:760px){.charter-admin-strip{align-items:stretch;flex-direction:column}.charter-admin-strip .button-primary{width:100%}.site-header{display:flex;justify-content:space-between;gap:12px;min-height:75px;padding:13px 5%}.brand{gap:10px}.brand-logo{width:39px;height:39px}.brand-text strong{font-size:18px;letter-spacing:1.6px}.brand-text small{font-size:7px;letter-spacing:1.7px}.site-header>.main-navigation,.site-header>.discord-link{display:none}.mobile-menu-toggle{display:grid;place-items:center;width:43px;height:43px;flex-shrink:0;border:1px solid rgba(255,255,255,.15);background:#111;color:#fff;cursor:pointer}.mobile-navigation{position:absolute;top:calc(100% + 1px);right:0;left:0;display:flex;flex-direction:column;padding:12px 5% 20px;border-bottom:1px solid rgba(255,255,255,.12);background:#0b0b0b;box-shadow:0 18px 35px rgba(0,0,0,.4)}.mobile-nav-link{display:flex;align-items:center;justify-content:space-between;padding:17px 4px;border-bottom:1px solid rgba(255,255,255,.08);color:#a8a19b;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase}.mobile-nav-link.nav-active{color:#fff}.mobile-nav-link.nav-active>span{border-left:2px solid #a30b0b;padding-left:10px}.mobile-discord-link{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;padding:14px;border:1px solid rgba(163,11,11,.65);background:rgba(139,0,0,.13);color:#fff;text-decoration:none;font-size:10px;font-weight:800;letter-spacing:1.2px}.mobile-navigation-enter-active,.mobile-navigation-leave-active{transition:opacity .18s ease,transform .18s ease}.mobile-navigation-enter-from,.mobile-navigation-leave-to{opacity:0;transform:translateY(-7px)}.charter-hero{min-height:400px;padding:22px 6% 35px}.hero-main{padding-top:65px}.hero-side-label{display:none}.directory{padding:45px 5% 25px}.directory-heading{align-items:flex-start}.directory-heading h2{font-size:35px}.country-filters{gap:6px}.country-filter{padding:9px}.charter-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.card-image{height:125px}.card-info{padding:12px 10px}.card-title-row{flex-direction:column}.card-title-content h3{font-size:21px}.card-description{font-size:10px}.card-status{font-size:8px}.filter-panel{grid-template-columns:1fr}.search-box{grid-column:auto}.detail-image{height:210px}.detail-content{padding:17px}.detail-heading{left:17px;right:17px}.detail-heading h2{font-size:39px}.detail-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.roster-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.roster-photo{height:140px}.roster-heading{align-items:flex-start;flex-direction:column}.roster-heading .button-primary{width:100%}.image-upload{grid-template-columns:1fr}.image-upload>img{width:min(220px,100%);margin:auto}.form-grid{grid-template-columns:1fr}.form-field.full{grid-column:auto}.form-header,.form-body{padding:19px}.profile-photo{height:240px}}
@media(max-width:420px){.brand-logo{width:35px;height:35px}.brand-text strong{font-size:17px}.brand-text small{font-size:7px}.charter-grid{grid-template-columns:1fr}.card-image{height:170px}.card-title-row{flex-direction:row}.roster-grid{grid-template-columns:1fr 1fr}.roster-photo{height:125px}.roster-info{padding:10px}.roster-info h4{font-size:20px}.detail-facts{gap:15px}.directory-footer{font-size:7px;letter-spacing:.7px}.form-footer{flex-direction:column}.form-footer button{width:100%}}

/* Internal scrolling for the charter profile modal */
.detail-panel { display:flex; flex-direction:column; max-height:85vh; min-height:0; overflow:hidden; }
.detail-image { flex:0 0 auto; }
.detail-content { min-height:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:#6f1717 #111; }
.detail-content::-webkit-scrollbar { width:7px; }
.detail-content::-webkit-scrollbar-track { background:#111; }
.detail-content::-webkit-scrollbar-thumb { background:#6f1717; border-radius:4px; }
@media(max-width:600px) { .detail-panel { max-height:90dvh; } }
</style>
