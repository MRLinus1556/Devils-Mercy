<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type MediaType = 'image' | 'video'
type Category = 'All' | 'Photos' | 'Videos' | 'Events'
interface MediaItem {
  id: number; title: string; description: string; category: string
  type: MediaType; url: string; date: string; author: string; file?: File
}
interface ClubEvent {
  id: number; title: string; date: string; location: string
  description: string; status: 'Upcoming' | 'Completed'
}
const menuOpen = ref(false)
const navigation = [
  { label: 'Home', path: '/' }, { label: 'Organization', path: '/organisation' },
  { label: 'Charters', path: '/charters' }, { label: 'Members', path: '/members' },
  { label: 'Media', path: '/media' },
]
const closeMenu = () => { menuOpen.value = false }

// Bind these props to the signed-in user's role/name in your authentication system.
const props = withDefaults(defineProps<{
  userRole?: 'guest' | 'member' | 'admin'; userName?: string
}>(), { userRole: 'member', userName: 'Club Member' })
const canUpload = computed(() => props.userRole === 'member' || props.userRole === 'admin')
const isAdmin = computed(() => props.userRole === 'admin')
const activeCategory = ref<Category>('All')
const searchQuery = ref('')
const uploadDialog = ref(false)
const eventDialog = ref(false)
const selectedMedia = ref<MediaItem | null>(null)
const uploadError = ref('')
const uploadTitle = ref('')
const uploadDescription = ref('')
const uploadCategory = ref('Club Life')
const selectedFiles = ref<File[]>([])
const uploadPreviews = ref<string[]>([])
const eventTitle = ref('')
const eventDate = ref('')
const eventLocation = ref('')
const eventDescription = ref('')
const eventError = ref('')
const toast = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | undefined
let nextId = 20

const media = ref<MediaItem[]>([
  { id: 1, title: 'The Brotherhood', description: 'A moment with the club and the people behind the patch.', category: 'Club Life', type: 'image', url: '/images/intro.png', date: '2026-10-12', author: 'Media Team' },
  { id: 2, title: 'Night Ride', description: 'Engines on, lights low, and the road ahead.', category: 'Rides', type: 'image', url: '/images/hero.png', date: '2026-10-08', author: 'Media Team' },
  { id: 3, title: 'Club Gathering', description: 'An evening together at the clubhouse.', category: 'Events', type: 'image', url: '/images/statement.png', date: '2026-09-27', author: 'Media Team' },
  { id: 4, title: 'Road Stories', description: 'A short film from a ride with the crew.', category: 'Videos', type: 'video', url: '', date: '2026-09-18', author: 'Media Team' },
  { id: 5, title: 'The Devils Mercy Identity', description: 'The details that make the club our own.', category: 'Club Life', type: 'image', url: '/images/logo.png', date: '2026-09-10', author: 'Media Team' },
  { id: 6, title: 'Charter Meet', description: 'Connected charters, one brotherhood.', category: 'Events', type: 'image', url: '/images/brazil.png', date: '2026-08-29', author: 'Media Team' },
])
const events = ref<ClubEvent[]>([
  { id: 1, title: 'Monthly Club Meet', date: '2026-11-07', location: 'Clubhouse', description: 'A club-wide meet to catch up and plan upcoming rides.', status: 'Upcoming' },
  { id: 2, title: 'Autumn Night Ride', date: '2026-11-14', location: 'Meet-up location announced to members', description: 'An evening ride followed by a stop to gather and share stories.', status: 'Upcoming' },
  { id: 3, title: 'Charter Gathering', date: '2026-09-27', location: 'Clubhouse', description: 'A gathering with members from across the club.', status: 'Completed' },
])
const categories: Category[] = ['All', 'Photos', 'Videos', 'Events']
const filteredMedia = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return media.value.filter(item => {
    const categoryMatch = activeCategory.value === 'All' ||
      (activeCategory.value === 'Photos' && item.type === 'image') ||
      (activeCategory.value === 'Videos' && item.type === 'video') ||
      (activeCategory.value === 'Events' && item.category === 'Events')
    return categoryMatch && (!query || `${item.title} ${item.description} ${item.category} ${item.author}`.toLowerCase().includes(query))
  })
})
const photoCount = computed(() => media.value.filter(x => x.type === 'image').length)
const videoCount = computed(() => media.value.filter(x => x.type === 'video').length)
const upcomingEvents = computed(() => events.value.filter(x => x.status === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date)))
const nextEvent = computed(() => upcomingEvents.value[0] ?? null)
function notify(message: string) {
  toast.value = message; toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3200)
}
function openUpload() {
  if (!canUpload.value) return notify('Sign in as a member to contribute to the gallery.')
  uploadError.value = ''; uploadDialog.value = true
}
function clearPreviews() {
  uploadPreviews.value.forEach(url => URL.revokeObjectURL(url))
  uploadPreviews.value = []
}
function onFilesChanged(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  const accepted = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
  uploadError.value = accepted.length !== files.length ? 'Only image and video files are supported.' : ''
  clearPreviews()
  selectedFiles.value = accepted.slice(0, 8)
  uploadPreviews.value = selectedFiles.value.map(f => URL.createObjectURL(f))
}
function submitUpload() {
  if (!selectedFiles.value.length) return uploadError.value = 'Choose at least one image or video first.'
  if (selectedFiles.value.some(f => f.size > 100 * 1024 * 1024)) return uploadError.value = 'Each file must be smaller than 100 MB.'
  if (!uploadTitle.value.trim()) return uploadError.value = 'Add a title for this post.'
  selectedFiles.value.forEach((file, i) => media.value.unshift({
    id: nextId++, title: selectedFiles.value.length > 1 ? `${uploadTitle.value.trim()} ${i + 1}` : uploadTitle.value.trim(),
    description: uploadDescription.value.trim(), category: uploadCategory.value,
    type: file.type.startsWith('video/') ? 'video' : 'image', url: uploadPreviews.value[i] ?? '',
    date: new Date().toISOString().slice(0, 10), author: props.userName, file,
  }))
  uploadDialog.value = false; uploadTitle.value = ''; uploadDescription.value = ''
  selectedFiles.value = []; uploadPreviews.value = []
  notify('Media added to this browser session.')
}
function removeMedia(item: MediaItem) {
  if (!isAdmin.value && item.author !== props.userName) return notify('You can only remove your own posts.')
  media.value = media.value.filter(x => x.id !== item.id)
  if (selectedMedia.value?.id === item.id) selectedMedia.value = null
  notify('Media removed from this session.')
}
function openEventDialog() {
  if (!canUpload.value) return notify('Sign in as a member to add an event.')
  eventError.value = ''; eventDialog.value = true
}
function submitEvent() {
  if (!eventTitle.value.trim() || !eventDate.value || !eventLocation.value.trim())
    return eventError.value = 'Add an event title, date and location.'
  events.value.unshift({
    id: nextId++, title: eventTitle.value.trim(), date: eventDate.value,
    location: eventLocation.value.trim(), description: eventDescription.value.trim(),
    status: eventDate.value >= new Date().toISOString().slice(0, 10) ? 'Upcoming' : 'Completed',
  })
  eventDialog.value = false; eventTitle.value = ''; eventDate.value = ''
  eventLocation.value = ''; eventDescription.value = ''
  notify('Event added to this session.')
}
function removeEvent(event: ClubEvent) {
  if (!isAdmin.value) return notify('Only administrators can remove events.')
  events.value = events.value.filter(x => x.id !== event.id); notify('Event removed from this session.')
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}
onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
  media.value.forEach(item => { if (item.file && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url) })
  clearPreviews()
})
</script>

<template>
  <div class="site-shell">

    <main>
      <section class="media-hero">
        <div class="hero-backdrop"></div><div class="hero-shade"></div>
        <div class="media-hero-content">
          <div class="eyebrow"><span class="eyebrow-line"></span> DEVILS MERCY MC · OFFICIAL MEDIA</div>
          <h1>THE CLUB.<span>UNFILTERED.</span></h1>
          <p class="hero-description">Moments on the road, behind the patch and with the people who make this club what it is. Welcome to the Devils Mercy MC media archive.</p>
          <div class="hero-buttons">
            <a href="#gallery" class="button-primary">EXPLORE THE GALLERY <v-icon icon="mdi-arrow-down" size="18" /></a>
            <button class="button-secondary" type="button" @click="openUpload" :disabled="!canUpload"><v-icon icon="mdi-cloud-upload-outline" size="18" /> CONTRIBUTE MEDIA</button>
          </div>
        </div>
        <div class="hero-index"><span>01</span><span class="index-line"></span><span>03</span></div>
        <div class="hero-bottom"><span>PHOTOGRAPHS · FILM · CLUB LIFE</span><span>DEVILS MERCY MC</span></div>
      </section>

      <section class="stats-strip">
        <div class="stat"><span class="stat-number">{{ photoCount.toString().padStart(2, '0') }}</span><span class="stat-label">PHOTOGRAPHS</span></div>
        <div class="stat-divider"></div>
        <div class="stat"><span class="stat-number">{{ videoCount.toString().padStart(2, '0') }}</span><span class="stat-label">VIDEOS</span></div>
        <div class="stat-divider"></div>
        <div class="stat"><span class="stat-number">{{ events.length.toString().padStart(2, '0') }}</span><span class="stat-label">EVENTS</span></div>
        <div class="stats-note"><v-icon icon="mdi-shield-outline" size="21" /> BROTHERHOOD. LOYALTY. RESPECT.</div>
      </section>

      <section id="gallery" class="gallery-section section-padding">
        <div class="section-heading-row"><div><div class="section-label"><span>01</span><span class="section-label-line"></span> THE ARCHIVE</div><h2 class="section-title">MOMENTS THAT <span>MATTER.</span></h2></div><p class="section-description">The rides, the gatherings and the stories that live beyond the road.</p></div>
        <div class="gallery-toolbar">
          <div class="category-tabs" role="tablist" aria-label="Media category">
            <button v-for="category in categories" :key="category" type="button" class="category-tab" :class="{ 'category-tab-active': activeCategory === category }" @click="activeCategory = category">{{ category }}</button>
          </div>
          <div class="search-box"><v-icon icon="mdi-magnify" size="19" /><input v-model="searchQuery" type="search" placeholder="Search the archive..." aria-label="Search media" /></div>
        </div>
        <div v-if="filteredMedia.length" class="media-grid">
          <article v-for="(item, index) in filteredMedia" :key="item.id" class="media-card" :class="{ 'media-card-featured': index === 0 }">
            <button class="media-visual" type="button" @click="selectedMedia = item" :aria-label="`Open ${item.title}`">
              <img v-if="item.type === 'image'" :src="item.url" :alt="item.title" loading="lazy" />
              <video v-else-if="item.url" :src="item.url" muted playsinline preload="metadata"></video>
              <div v-else class="video-placeholder"><v-icon icon="mdi-filmstrip" size="54" /><span>VIDEO ENTRY</span></div>
              <span class="media-type"><v-icon :icon="item.type === 'video' ? 'mdi-play-circle-outline' : 'mdi-image-outline'" size="15" /> {{ item.type === 'video' ? 'VIDEO' : 'PHOTO' }}</span>
              <span v-if="item.type === 'video'" class="play-button"><v-icon icon="mdi-play" size="27" /></span><span class="media-open"><v-icon icon="mdi-arrow-top-right" size="19" /></span>
            </button>
            <div class="media-card-copy"><div class="media-meta"><span>{{ item.category }}</span><span>{{ formatDate(item.date) }}</span></div><h3>{{ item.title }}</h3><p>{{ item.description || 'A moment from the Devils Mercy MC archive.' }}</p>
              <div class="media-card-footer"><span><v-icon icon="mdi-account-outline" size="14" /> {{ item.author }}</span><button v-if="isAdmin || item.author === userName" class="icon-action" type="button" aria-label="Remove media" title="Remove media" @click="removeMedia(item)"><v-icon icon="mdi-trash-can-outline" size="17" /></button></div>
            </div>
          </article>
        </div>
        <div v-else class="empty-state"><v-icon icon="mdi-image-search-outline" size="42" /><h3>NOTHING IN THE FRAME.</h3><p>Try another search or choose a different category.</p><button class="text-button" type="button" @click="activeCategory = 'All'; searchQuery = ''">CLEAR FILTERS</button></div>
        <div class="gallery-footnote"><span class="footnote-line"></span> A LIVING ARCHIVE OF DEVILS MERCY MC <span class="footnote-line"></span></div>
      </section>

      <section class="events-section section-padding">
        <div class="section-heading-row"><div><div class="section-label"><span>02</span><span class="section-label-line"></span> ON THE CALENDAR</div><h2 class="section-title">CLUB <span>EVENTS.</span></h2></div>
          <div class="events-heading-action"><p class="section-description">Meet-ups, rides and moments worth putting on the calendar.</p><button v-if="canUpload" class="outline-action" type="button" @click="openEventDialog"><v-icon icon="mdi-plus" size="18" /> ADD EVENT</button></div>
        </div>
        <div v-if="nextEvent" class="featured-event">
          <div class="featured-event-mark"><v-icon icon="mdi-calendar-star" size="31" /></div>
          <div class="featured-event-info"><span class="event-kicker">NEXT UP · CLUB CALENDAR</span><h3>{{ nextEvent.title }}</h3><p>{{ nextEvent.description }}</p><div class="event-location"><v-icon icon="mdi-map-marker-outline" size="17" /> {{ nextEvent.location }}</div></div>
          <div class="featured-event-date"><span>{{ new Date(`${nextEvent.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() }}</span><strong>{{ new Date(`${nextEvent.date}T12:00:00`).getDate().toString().padStart(2, '0') }}</strong><small>{{ new Date(`${nextEvent.date}T12:00:00`).getFullYear() }}</small></div>
        </div>
        <div v-if="events.length" class="event-list">
          <article v-for="event in events.slice().sort((a, b) => a.date.localeCompare(b.date))" :key="event.id" class="event-row">
            <div class="event-row-date"><span>{{ new Date(`${event.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() }}</span><strong>{{ new Date(`${event.date}T12:00:00`).getDate().toString().padStart(2, '0') }}</strong></div>
            <div class="event-row-copy"><h3>{{ event.title }}</h3><p><v-icon icon="mdi-map-marker-outline" size="14" /> {{ event.location }}</p></div>
            <span class="event-status" :class="{ 'event-status-completed': event.status === 'Completed' }">{{ event.status }}</span>
            <button v-if="isAdmin" class="icon-action event-delete" type="button" title="Remove event" aria-label="Remove event" @click="removeEvent(event)"><v-icon icon="mdi-trash-can-outline" size="17" /></button>
          </article>
        </div>
        <div v-else class="empty-state compact-empty"><v-icon icon="mdi-calendar-blank-outline" size="36" /><p>No events have been added yet.</p></div>
      </section>

      <section class="contribute-section"><div class="contribute-background"></div><div class="contribute-overlay"></div>
        <div class="contribute-content"><div class="section-label"><span>03</span><span class="section-label-line"></span> PART OF THE STORY</div><h2>YOU WERE THERE.<span>SHARE IT.</span></h2><p>Got photos or videos from a ride, a meet or a moment with the club? Add them to the archive and help tell the Devils Mercy story.</p><button class="button-primary" type="button" @click="openUpload" :disabled="!canUpload">CONTRIBUTE TO THE ARCHIVE <v-icon icon="mdi-arrow-up-right" size="18" /></button><small v-if="!canUpload">Sign in with a member account to contribute media.</small></div>
      </section>
    </main>

     

    <v-dialog v-model="uploadDialog" max-width="760" scrollable>
      <v-card class="dialog-card"><div class="dialog-heading"><div><span class="dialog-kicker">MEDIA CONTRIBUTION</span><h2>ADD TO THE ARCHIVE.</h2></div><v-btn icon="mdi-close" variant="text" aria-label="Close dialog" @click="uploadDialog = false" /></div>
        <v-card-text><div class="form-grid">
          <label class="field-label">POST TITLE<input v-model="uploadTitle" class="form-input" maxlength="90" placeholder="e.g. Saturday Night Ride" /></label>
          <label class="field-label">CATEGORY<select v-model="uploadCategory" class="form-input"><option>Club Life</option><option>Rides</option><option>Events</option><option>Videos</option><option>Members</option></select></label>
          <label class="field-label field-wide">CAPTION<textarea v-model="uploadDescription" class="form-input" rows="3" maxlength="400" placeholder="Add a short caption or story..." /></label>
          <div class="field-wide"><label class="field-label">PHOTOS OR VIDEOS <span class="field-hint">Up to 8 files · 100 MB per file</span></label>
            <label class="file-drop"><v-icon icon="mdi-cloud-upload-outline" size="30" /><strong>Choose files to upload</strong><span>Images and video files supported</span><input type="file" accept="image/*,video/*" multiple @change="onFilesChanged" /></label>
            <div v-if="uploadPreviews.length" class="preview-strip"><div v-for="(preview, index) in uploadPreviews" :key="preview" class="upload-preview"><img v-if="selectedFiles[index]?.type.startsWith('image/')" :src="preview" alt="Upload preview" /><video v-else :src="preview" muted /><span>{{ selectedFiles[index]?.name }}</span></div></div>
          </div>
        </div><p v-if="uploadError" class="form-error">{{ uploadError }}</p><p class="local-notice"><v-icon icon="mdi-information-outline" size="17" /> Demo mode: uploads stay in this page session. Connect a backend to store files permanently and share them with other users.</p></v-card-text>
        <v-card-actions class="dialog-actions"><v-btn variant="text" @click="uploadDialog = false">CANCEL</v-btn><v-spacer /><v-btn class="dialog-submit" @click="submitUpload">ADD TO GALLERY <v-icon end icon="mdi-arrow-up-right" /></v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="eventDialog" max-width="620"><v-card class="dialog-card">
      <div class="dialog-heading"><div><span class="dialog-kicker">CLUB CALENDAR</span><h2>ADD AN EVENT.</h2></div><v-btn icon="mdi-close" variant="text" aria-label="Close dialog" @click="eventDialog = false" /></div>
      <v-card-text><div class="form-grid">
        <label class="field-label field-wide">EVENT TITLE<input v-model="eventTitle" class="form-input" maxlength="100" placeholder="Event name" /></label>
        <label class="field-label">DATE<input v-model="eventDate" class="form-input" type="date" /></label>
        <label class="field-label">LOCATION<input v-model="eventLocation" class="form-input" maxlength="120" placeholder="Meeting point" /></label>
        <label class="field-label field-wide">DESCRIPTION<textarea v-model="eventDescription" class="form-input" rows="3" maxlength="500" placeholder="What should members know?" /></label>
      </div><p v-if="eventError" class="form-error">{{ eventError }}</p><p class="local-notice"><v-icon icon="mdi-information-outline" size="17" /> Demo mode: events are stored in this page session only.</p></v-card-text>
      <v-card-actions class="dialog-actions"><v-btn variant="text" @click="eventDialog = false">CANCEL</v-btn><v-spacer /><v-btn class="dialog-submit" @click="submitEvent">SAVE EVENT <v-icon end icon="mdi-arrow-up-right" /></v-btn></v-card-actions>
    </v-card></v-dialog>

    <v-dialog :model-value="selectedMedia !== null" @update:model-value="(open) => { if (!open) selectedMedia = null }" max-width="1080"><v-card v-if="selectedMedia" class="lightbox-card">
      <div class="lightbox-top"><span>{{ selectedMedia.category }} · {{ formatDate(selectedMedia.date) }}</span><v-btn icon="mdi-close" variant="text" aria-label="Close media viewer" @click="selectedMedia = null" /></div>
      <img v-if="selectedMedia.type === 'image'" :src="selectedMedia.url" :alt="selectedMedia.title" class="lightbox-image" />
      <video v-else-if="selectedMedia.url" :src="selectedMedia.url" controls autoplay class="lightbox-video"></video>
      <div v-else class="lightbox-video-placeholder"><v-icon icon="mdi-filmstrip" size="60" /><p>Sample video entry — attach a video file to publish the clip.</p></div>
      <div class="lightbox-copy"><h2>{{ selectedMedia.title }}</h2><p>{{ selectedMedia.description }}</p><span>ADDED BY {{ selectedMedia.author.toUpperCase() }}</span></div>
    </v-card></v-dialog>
    <v-snackbar v-model="toastVisible" timeout="3200" color="surface" location="bottom right">{{ toast }}<template #actions><v-btn variant="text" @click="toastVisible = false">CLOSE</v-btn></template></v-snackbar>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');
:root{--page-bg:#090909;--panel-bg:#111;--panel-raised:#171717;--text-main:#f3f0ed;--text-muted:#a19b97;--red:#8b0000;--red-light:#bb2424;--border:rgba(255,255,255,.11);--content-width:1440px}
*{box-sizing:border-box}html{scroll-behavior:smooth;background:var(--page-bg)}body{margin:0;min-width:320px;background:var(--page-bg);color:var(--text-main);font-family:Inter,sans-serif}body,button,a{-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}button{font:inherit}.site-shell{min-height:100vh;overflow:hidden;background:var(--page-bg)}
/* Header matches HomeView */
.site-header{position:relative;z-index:20;display:flex;min-height:88px;align-items:center;justify-content:space-between;gap:32px;padding:0 6.2%;border-bottom:1px solid var(--border);background:#090909}.brand{display:inline-flex;flex-shrink:0;align-items:center;gap:12px}.brand-logo{display:block;width:48px;height:48px;object-fit:contain}.brand-copy{display:flex;flex-direction:column;gap:3px}.brand-name{font-family:'Barlow Condensed',sans-serif;font-size:23px;font-weight:800;letter-spacing:1.7px;line-height:1}.brand-subtitle{color:#a69d98;font-size:9px;font-weight:600;letter-spacing:2.8px}.desktop-nav{display:flex;align-items:center;gap:clamp(18px,2.6vw,42px)}.nav-link{position:relative;padding:34px 0;color:#bcb6b1;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;transition:color 180ms ease}.nav-link::after{position:absolute;right:0;bottom:23px;left:0;height:2px;background:var(--red-light);content:'';transform:scaleX(0);transform-origin:left;transition:transform 180ms ease}.nav-link:hover,.nav-link-active{color:#fff}.nav-link-active::after,.nav-link:hover::after{transform:scaleX(1)}.header-actions{display:flex;flex-shrink:0;align-items:center;gap:12px}.header-cta,.button-primary,.button-secondary{display:inline-flex;min-height:48px;align-items:center;justify-content:center;gap:13px;padding:0 19px;font-size:10px;font-weight:700;letter-spacing:1.15px;transition:background 180ms ease,border-color 180ms ease,transform 180ms ease;cursor:pointer}.header-cta,.button-primary{border:0;background:var(--red);color:#fff}.header-cta:hover,.button-primary:hover{background:var(--red-light);transform:translateY(-2px)}.mobile-menu-button{display:none;width:42px;height:42px;align-items:center;justify-content:center;border:1px solid var(--border);background:transparent;color:#fff;cursor:pointer}.mobile-nav{position:absolute;top:100%;right:0;left:0;display:flex;flex-direction:column;padding:14px 6% 24px;border-bottom:1px solid var(--border);background:#0d0d0d}.mobile-nav-link{display:flex;min-height:52px;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);color:#e8e3df;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase}.mobile-apply-link{margin-top:16px;padding:15px;background:var(--red);color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;text-align:center;text-transform:uppercase}.mobile-menu-enter-active,.mobile-menu-leave-active{transition:opacity 160ms ease,transform 160ms ease}.mobile-menu-enter-from,.mobile-menu-leave-to{opacity:0;transform:translateY(-8px)}
/* Hero */
.media-hero{position:relative;display:flex;min-height:570px;align-items:center;padding:90px 10%;isolation:isolate;background:#090909}.hero-backdrop,.hero-shade,.contribute-background,.contribute-overlay{position:absolute;z-index:-1;inset:0}.hero-backdrop{background:url('/images/hero.png') center 42%/cover;filter:saturate(.35);opacity:.5}.hero-shade{background:linear-gradient(90deg,#090909 0%,rgba(9,9,9,.92) 30%,rgba(9,9,9,.45) 100%),linear-gradient(0deg,#090909 0%,transparent 30%,rgba(9,9,9,.3) 100%)}.media-hero-content{max-width:790px}.eyebrow,.section-label{display:flex;align-items:center;gap:12px;color:#c3bbb5;font-size:10px;font-weight:600;letter-spacing:2px}.eyebrow-line,.section-label-line{width:34px;height:2px;flex-shrink:0;background:var(--red-light)}.media-hero h1{margin:27px 0 24px;font-family:'Barlow Condensed',sans-serif;font-size:clamp(72px,10vw,136px);font-weight:900;letter-spacing:-2px;line-height:.82}.media-hero h1 span{display:block;margin-top:15px;color:var(--red-light)}.hero-description{max-width:530px;margin:0;color:#b7b0aa;font-size:13px;line-height:1.9}.hero-buttons{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.button-primary{min-height:52px;padding:0 22px}.button-secondary{min-height:52px;border:1px solid rgba(255,255,255,.28);background:rgba(0,0,0,.18);color:#f2eeeb}.button-secondary:hover{border-color:var(--red-light);background:rgba(139,0,0,.15)}.button-secondary:disabled,.button-primary:disabled{opacity:.45;cursor:not-allowed;transform:none}.hero-index{position:absolute;top:50%;right:4%;display:flex;align-items:center;gap:10px;color:#d0c7c1;font-size:9px;letter-spacing:1px;transform:rotate(90deg) translateX(50%)}.index-line{width:45px;height:1px;background:var(--red-light)}.hero-bottom{position:absolute;right:6.2%;bottom:25px;left:6.2%;display:flex;justify-content:space-between;gap:20px;color:#b5ada7;font-size:9px;font-weight:600;letter-spacing:1.5px}
/* Stats and gallery */
.stats-strip{display:flex;align-items:center;gap:35px;padding:27px 10%;border-block:1px solid var(--border);background:#0d0d0d}.stat{display:flex;align-items:baseline;gap:12px}.stat-number{color:#f5f0ed;font-family:'Barlow Condensed',sans-serif;font-size:34px;font-weight:800}.stat-label{color:#9b938d;font-size:9px;font-weight:700;letter-spacing:1.5px}.stat-divider{width:1px;height:30px;background:var(--border)}.stats-note{display:flex;align-items:center;gap:10px;margin-left:auto;color:#b7aea8;font-size:9px;font-weight:700;letter-spacing:1.2px}.stats-note .v-icon{color:var(--red-light)}.section-padding{padding:100px 10%}.gallery-section{max-width:var(--content-width);margin:0 auto}.section-heading-row{display:flex;align-items:end;justify-content:space-between;gap:40px;margin-bottom:38px}.section-label>span:first-child{color:var(--red-light)}.section-title{margin:23px 0 0;font-family:'Barlow Condensed',sans-serif;font-size:clamp(44px,5.5vw,70px);font-weight:800;letter-spacing:-1px;line-height:.95}.section-title span{color:var(--red-light)}.section-description{max-width:350px;margin:0 0 4px;color:var(--text-muted);font-size:12px;line-height:1.9}.gallery-toolbar{display:flex;align-items:center;justify-content:space-between;gap:22px;margin-bottom:25px;padding-bottom:17px;border-bottom:1px solid var(--border)}.category-tabs{display:flex;flex-wrap:wrap;gap:7px}.category-tab{min-height:38px;padding:0 16px;border:1px solid transparent;background:transparent;color:#a69e98;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer}.category-tab:hover,.category-tab-active{border-color:rgba(187,36,36,.65);background:rgba(139,0,0,.16);color:#fff}.search-box{display:flex;min-width:220px;align-items:center;gap:9px;padding:0 12px;border:1px solid var(--border);color:#9b938d}.search-box input{width:100%;min-height:38px;border:0;outline:0;background:transparent;color:#f3f0ed;font:inherit;font-size:11px}.media-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.media-card{min-width:0;border:1px solid var(--border);background:#101010;transition:border-color 180ms ease,transform 180ms ease}.media-card:hover{border-color:rgba(187,36,36,.65);transform:translateY(-3px)}.media-card-featured{grid-column:span 2}.media-visual{position:relative;display:block;width:100%;height:235px;overflow:hidden;padding:0;border:0;background:#1b1717;cursor:pointer;text-align:left}.media-card-featured .media-visual{height:330px}.media-visual>img,.media-visual>video{width:100%;height:100%;object-fit:cover;filter:saturate(.5);opacity:.8;transition:transform 350ms ease,opacity 180ms ease}.media-card:hover .media-visual>img,.media-card:hover .media-visual>video{transform:scale(1.035);opacity:1}.media-type{position:absolute;top:14px;left:14px;display:inline-flex;align-items:center;gap:6px;padding:8px 10px;background:rgba(0,0,0,.72);color:#fff;font-size:8px;font-weight:700;letter-spacing:1.2px}.play-button{position:absolute;top:50%;left:50%;display:flex;width:56px;height:56px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(0,0,0,.48);color:#fff;transform:translate(-50%,-50%)}.media-open{position:absolute;right:14px;bottom:14px;display:flex;width:36px;height:36px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.55);color:white}.video-placeholder{display:flex;width:100%;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:radial-gradient(ellipse at center,#2a1717,#111);color:#a9a09b}.video-placeholder span{font-size:9px;font-weight:700;letter-spacing:2px}.media-card-copy{padding:20px 20px 16px}.media-meta{display:flex;justify-content:space-between;gap:10px;color:#9b938d;font-size:8px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase}.media-meta span:first-child{color:var(--red-light)}.media-card-copy h3{margin:13px 0 8px;font-family:'Barlow Condensed',sans-serif;font-size:27px;font-weight:700;text-transform:uppercase}.media-card-copy p{min-height:38px;margin:0;color:var(--text-muted);font-size:11px;line-height:1.8}.media-card-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:17px;padding-top:13px;border-top:1px solid var(--border);color:#a69e98;font-size:9px}.media-card-footer>span{display:inline-flex;align-items:center;gap:5px}.icon-action{display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;border:1px solid var(--border);background:transparent;color:#b9b0aa;cursor:pointer}.icon-action:hover{border-color:var(--red-light);color:#fff}.empty-state{display:flex;min-height:260px;align-items:center;justify-content:center;flex-direction:column;border:1px dashed rgba(255,255,255,.15);color:#9b938d;text-align:center}.empty-state h3{margin:15px 0 5px;color:#f3f0ed;font-family:'Barlow Condensed',sans-serif;font-size:26px}.empty-state p{font-size:12px}.text-button{margin-top:10px;padding:10px 14px;border:1px solid var(--border);background:transparent;color:white;font-size:9px;font-weight:700;letter-spacing:1px;cursor:pointer}.gallery-footnote{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:45px;color:#827a74;font-size:8px;font-weight:700;letter-spacing:1.8px;text-align:center}.footnote-line{width:35px;height:1px;background:var(--red)}
/* Events */
.events-section{border-top:1px solid var(--border);background:#0d0d0d}.events-heading-action{display:flex;align-items:end;flex-direction:column;gap:18px}.outline-action{display:inline-flex;min-height:42px;align-items:center;gap:8px;padding:0 15px;border:1px solid rgba(187,36,36,.7);background:transparent;color:#fff;font-size:9px;font-weight:700;letter-spacing:1px;cursor:pointer}.outline-action:hover{background:rgba(139,0,0,.2)}.featured-event{display:grid;grid-template-columns:70px 1fr 120px;gap:25px;align-items:center;padding:32px;border:1px solid rgba(187,36,36,.45);background:linear-gradient(110deg,rgba(139,0,0,.13),rgba(17,17,17,.8) 45%)}.featured-event-mark{display:flex;width:65px;height:65px;align-items:center;justify-content:center;border:1px solid rgba(187,36,36,.6);color:var(--red-light)}.event-kicker{color:var(--red-light);font-size:8px;font-weight:700;letter-spacing:1.6px}.featured-event-info h3{margin:10px 0 8px;font-family:'Barlow Condensed',sans-serif;font-size:34px;text-transform:uppercase}.featured-event-info p{max-width:550px;margin:0 0 12px;color:var(--text-muted);font-size:11px;line-height:1.8}.event-location{display:flex;align-items:center;gap:6px;color:#c1b8b2;font-size:10px}.event-location .v-icon{color:var(--red-light)}.featured-event-date{display:flex;align-items:center;flex-direction:column;border-left:1px solid var(--border);color:#c4bbb5}.featured-event-date span,.featured-event-date small{font-size:9px;font-weight:700;letter-spacing:1.3px}.featured-event-date strong{color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:56px;line-height:1.1}.event-list{margin-top:18px;border-top:1px solid var(--border)}.event-row{display:flex;min-height:95px;align-items:center;gap:22px;padding:17px 20px;border-bottom:1px solid var(--border)}.event-row-date{display:flex;width:55px;flex-shrink:0;align-items:center;flex-direction:column}.event-row-date span{color:var(--red-light);font-size:8px;font-weight:700;letter-spacing:1px}.event-row-date strong{color:#f3f0ed;font-family:'Barlow Condensed',sans-serif;font-size:30px}.event-row-copy{flex:1}.event-row-copy h3{margin:0 0 7px;font-family:'Barlow Condensed',sans-serif;font-size:23px;text-transform:uppercase}.event-row-copy p{display:flex;align-items:center;gap:5px;margin:0;color:#a49b95;font-size:10px}.event-status{padding:7px 10px;border:1px solid rgba(187,36,36,.55);color:#e2c7c7;font-size:8px;font-weight:700;letter-spacing:.7px;text-transform:uppercase}.event-status-completed{border-color:var(--border);color:#8d8580}
/* Contribute, footer and dialogs */
.contribute-section{position:relative;display:flex;min-height:390px;align-items:center;padding:75px 10%;isolation:isolate;background:#090909}.contribute-background{background:url('/images/statement.png') center/cover;filter:saturate(.25);opacity:.4}.contribute-overlay{background:linear-gradient(90deg,#090909 0%,rgba(9,9,9,.92) 36%,rgba(9,9,9,.5) 100%)}.contribute-content{max-width:650px}.contribute-content h2{margin:25px 0 17px;font-family:'Barlow Condensed',sans-serif;font-size:clamp(48px,6vw,74px);font-weight:900;line-height:.92}.contribute-content h2 span{display:block;margin-top:8px;color:var(--red-light)}.contribute-content p{max-width:520px;margin:0 0 25px;color:#b7b0aa;font-size:12px;line-height:1.9}.contribute-content small{display:block;margin-top:12px;color:#a69e98;font-size:10px}.site-footer{padding:45px 6.2% 0;border-top:1px solid var(--border);background:#070707}.footer-main{display:flex;align-items:center;justify-content:space-between;gap:35px;padding-bottom:35px}.footer-description{max-width:280px;margin:0;color:#918983;font-size:10px;line-height:1.9}.footer-nav{display:flex;flex-wrap:wrap;gap:22px}.footer-nav a{color:#c0b8b2;font-size:10px;font-weight:600;transition:color 180ms ease}.footer-nav a:hover{color:var(--red-light)}.footer-bottom{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid var(--border);color:#807872;font-size:9px;font-weight:600;letter-spacing:.8px}.footer-bottom a{color:#d1c8c2}.dialog-card,.lightbox-card{border:1px solid rgba(255,255,255,.12)!important;border-radius:0!important;background:#101010!important;color:#f3f0ed!important}.dialog-heading{display:flex;align-items:center;justify-content:space-between;padding:25px 28px 18px;border-bottom:1px solid var(--border)}.dialog-kicker{color:var(--red-light);font-size:8px;font-weight:700;letter-spacing:1.8px}.dialog-heading h2{margin:7px 0 0;font-family:'Barlow Condensed',sans-serif;font-size:34px;font-weight:800}.dialog-card .v-card-text{padding:24px 28px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.field-label{display:flex;flex-direction:column;gap:9px;color:#c4bbb5;font-size:9px;font-weight:700;letter-spacing:1.2px}.field-wide{grid-column:1/-1}.form-input{width:100%;min-height:44px;padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:0;outline:none;background:#090909;color:#f3f0ed;font:inherit;font-size:12px;letter-spacing:0}.form-input:focus{border-color:var(--red-light)}textarea.form-input{resize:vertical}.field-hint{color:#89817b;font-weight:400;letter-spacing:0;text-transform:none}.file-drop{display:flex;min-height:140px;align-items:center;justify-content:center;flex-direction:column;gap:8px;border:1px dashed rgba(255,255,255,.23);background:#0b0b0b;color:#b9b0aa;cursor:pointer;text-align:center}.file-drop .v-icon{color:var(--red-light)}.file-drop strong{color:#f3f0ed;font-size:12px}.file-drop span{font-size:10px}.file-drop input{max-width:230px;color:#9b938d;font-size:10px}.preview-strip{display:flex;gap:10px;overflow-x:auto;padding-top:12px}.upload-preview{display:flex;width:100px;flex-shrink:0;flex-direction:column;gap:5px}.upload-preview img,.upload-preview video{width:100px;height:70px;object-fit:cover;background:#222}.upload-preview span{overflow:hidden;color:#9b938d;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.form-error{margin:15px 0 0;color:#ff7b7b;font-size:11px}.local-notice{display:flex;align-items:flex-start;gap:8px;margin:22px 0 0;color:#9d948e;font-size:10px;line-height:1.7}.local-notice .v-icon{flex-shrink:0;color:var(--red-light)}.dialog-actions{padding:15px 28px 22px!important;border-top:1px solid var(--border)}.dialog-submit{border-radius:0!important;background:var(--red)!important;color:white!important;font-size:10px!important;font-weight:700;letter-spacing:1px}.lightbox-top{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;color:#a69e98;font-size:9px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase}.lightbox-image,.lightbox-video{display:block;width:100%;max-height:68vh;object-fit:contain;background:#050505}.lightbox-video-placeholder{display:flex;min-height:300px;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:#080808;color:#9b938d}.lightbox-copy{padding:22px 26px 27px}.lightbox-copy h2{margin:0 0 8px;font-family:'Barlow Condensed',sans-serif;font-size:32px;text-transform:uppercase}.lightbox-copy p{margin:0 0 15px;color:var(--text-muted);font-size:12px;line-height:1.8}.lightbox-copy span{color:var(--red-light);font-size:8px;font-weight:700;letter-spacing:1.3px}
@media(min-width:1600px){.media-hero{padding-right:max(10%,calc((100vw - 1300px)/2));padding-left:max(10%,calc((100vw - 1300px)/2))}}
@media(max-width:1200px){.site-header{gap:20px;padding-right:4%;padding-left:4%}.desktop-nav{gap:18px}.header-cta{padding:0 13px;font-size:9px}.section-padding{padding-right:6%;padding-left:6%}.media-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.stats-strip{padding-right:6%;padding-left:6%;gap:23px}}
@media(max-width:900px){.site-header{min-height:76px}.desktop-nav{display:none}.header-cta{min-height:42px}.mobile-menu-button{display:flex}.media-hero{min-height:590px;padding:85px 8%}.hero-index{display:none}.section-heading-row{align-items:flex-start;flex-direction:column;gap:18px}.section-description{max-width:500px}.stats-strip{flex-wrap:wrap}.stats-note{width:100%;margin:5px 0 0}.featured-event{grid-template-columns:55px 1fr 80px;gap:15px;padding:23px}.featured-event-mark{width:52px;height:52px}.footer-main{align-items:flex-start;flex-direction:column;gap:22px}}
@media(max-width:600px){.site-header{min-height:70px;padding:0 5%}.brand{gap:9px}.brand-logo{width:40px;height:40px}.brand-name{font-size:20px}.brand-subtitle{font-size:8px;letter-spacing:2px}.header-cta{display:none}.media-hero{min-height:620px;padding:70px 6% 100px}.media-hero h1{font-size:clamp(68px,18vw,100px)}.hero-description{font-size:12px}.hero-buttons{align-items:stretch;flex-direction:column}.hero-buttons>*{width:100%}.hero-bottom{right:6%;bottom:18px;left:6%;flex-direction:column;gap:9px;font-size:8px}.section-padding{padding:70px 6%}.section-title{font-size:49px}.gallery-toolbar{align-items:stretch;flex-direction:column}.category-tabs{gap:3px}.category-tab{padding:0 10px}.search-box{min-width:0}.media-grid{grid-template-columns:1fr}.media-card-featured{grid-column:auto}.media-visual,.media-card-featured .media-visual{height:235px}.stats-strip{gap:13px;padding:20px 6%}.stat{align-items:flex-start;flex-direction:column;gap:3px}.stat-number{font-size:28px}.stat-label{font-size:7px;letter-spacing:.8px}.stat-divider{height:32px}.stats-note{font-size:8px}.events-heading-action{align-items:flex-start}.featured-event{grid-template-columns:1fr 75px;gap:15px;padding:20px}.featured-event-mark{display:none}.featured-event-info h3{font-size:28px}.featured-event-date strong{font-size:44px}.event-row{gap:12px;padding:15px 4px}.event-row-copy h3{font-size:20px}.event-status{display:none}.event-delete{flex-shrink:0}.contribute-section{min-height:400px;padding:65px 6%}.contribute-content h2{font-size:53px}.site-footer{padding:35px 6% 0}.footer-nav{gap:16px}.footer-bottom{align-items:flex-start;flex-direction:column;justify-content:center;gap:12px;padding:18px 0;font-size:8px}.dialog-heading{padding:20px 18px 15px}.dialog-card .v-card-text{padding:20px 18px}.form-grid{grid-template-columns:1fr}.field-wide{grid-column:auto}.dialog-actions{padding-right:18px!important;padding-left:18px!important}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
</style>
