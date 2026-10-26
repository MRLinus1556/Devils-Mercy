
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Chapter = {
  id: string
  name: string
  location: string
  leader: string
}

type Member = {
  id: string
  name: string
  rank: string
  chapterId: string
  status: 'Active' | 'Probationary' | 'Inactive'
  image: string
  imagePosition: string
  joinedAt: string
  bio: string
}

type MemberForm = {
  name: string
  rank: string
  chapterId: string
  status: Member['status']
  image: string
  imagePosition: string
  joinedAt: string
  bio: string
}

const MEMBER_KEY = 'devils-mercy-members-v2'
const CHAPTER_KEY = 'devils-mercy-chapters-v2'

const navigation = [
  { label: 'Home', path: '/' },
  { label: 'Organization', path: '/organisation' },
  { label: 'Charters', path: '/charters' },
  { label: 'Members', path: '/members' },
  { label: 'Media', path: '/media' },
]

const ranks = [
  'President',
  'Vice President',
  'Sergeant at Arms',
  'Secretary',
  'Treasurer',
  'Road Captain',
  'Enforcer',
  'Full Patch',
  'Prospect',
  'Hangaround',
]

const defaultForm = (): MemberForm => ({
  name: '',
  rank: 'Full Patch',
  chapterId: '',
  status: 'Active',
  image: '',
  imagePosition: '50% 35%',
  joinedAt: '',
  bio: '',
})

const chapters = ref<Chapter[]>([])
const members = ref<Member[]>([])
const menuOpen = ref(false)
const search = ref('')
const selectedChapter = ref('all')
const selectedStatus = ref('all')

const activeModal = ref<'member' | 'chapter' | 'manage' | null>(null)
const editingMemberId = ref<string | null>(null)
const editingChapterId = ref<string | null>(null)
const selectedMember = ref<Member | null>(null)

const memberForm = ref<MemberForm>(defaultForm())
const chapterForm = ref({ name: '', location: '', leader: '' })
const imageError = ref('')
const saving = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
let currentObjectUrl = ''

const visibleMembers = computed(() => {
  const query = search.value.trim().toLowerCase()

  return members.value.filter((member) => {
    const chapter = chapters.value.find((item) => item.id === member.chapterId)
    const matchesQuery =
      !query ||
      member.name.toLowerCase().includes(query) ||
      member.rank.toLowerCase().includes(query) ||
      (chapter?.name ?? '').toLowerCase().includes(query)

    const matchesChapter =
      selectedChapter.value === 'all' ||
      member.chapterId === selectedChapter.value

    const matchesStatus =
      selectedStatus.value === 'all' ||
      member.status === selectedStatus.value

    return matchesQuery && matchesChapter && matchesStatus
  })
})

const activeCount = computed(
  () => members.value.filter((member) => member.status === 'Active').length,
)

const prospectCount = computed(
  () => members.value.filter((member) => member.status === 'Probationary').length,
)

const currentChapterName = (id: string) =>
  chapters.value.find((chapter) => chapter.id === id)?.name ?? 'Unassigned'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function notify(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 3000)
}

function persistMembers() {
  try {
    localStorage.setItem(MEMBER_KEY, JSON.stringify(members.value))
  } catch {
    notify('Could not save. The image may be too large.')
  }
}

function persistChapters() {
  try {
    localStorage.setItem(CHAPTER_KEY, JSON.stringify(chapters.value))
  } catch {
    notify('Could not save chapters in this browser.')
  }
}

function loadData() {
  try {
    const savedChapters = localStorage.getItem(CHAPTER_KEY)
    const savedMembers = localStorage.getItem(MEMBER_KEY)

    if (savedChapters) chapters.value = JSON.parse(savedChapters)
    if (savedMembers) members.value = JSON.parse(savedMembers)
  } catch {
    notify('Some saved data could not be loaded.')
  }

  if (!chapters.value.length) {
    chapters.value = [
      {
        id: makeId(),
        name: 'Los Santos',
        location: 'Los Santos',
        leader: '',
      },
      {
        id: makeId(),
        name: 'Blaine County',
        location: 'Blaine County',
        leader: '',
      },
    ]
    persistChapters()
  }

const firstChapter = chapters.value[0]

if (!memberForm.value.chapterId && firstChapter) {
  memberForm.value.chapterId = firstChapter.id
}
}

function closeMenu() {
  menuOpen.value = false
}

function releaseObjectUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = ''
  }
}

function openNewMember() {
  editingMemberId.value = null
  memberForm.value = defaultForm()
  memberForm.value.chapterId = chapters.value[0]?.id ?? ''
  imageError.value = ''
  releaseObjectUrl()
  activeModal.value = 'member'
}

function openEditMember(member: Member) {
  editingMemberId.value = member.id
  memberForm.value = {
    name: member.name,
    rank: member.rank,
    chapterId: member.chapterId,
    status: member.status,
    image: member.image,
    imagePosition: member.imagePosition || '50% 35%',
    joinedAt: member.joinedAt,
    bio: member.bio,
  }
  imageError.value = ''
  releaseObjectUrl()
  selectedMember.value = null
  activeModal.value = 'member'
}

function openNewChapter() {
  editingChapterId.value = null
  chapterForm.value = { name: '', location: '', leader: '' }
  activeModal.value = 'chapter'
}

function openEditChapter(chapter: Chapter) {
  editingChapterId.value = chapter.id
  chapterForm.value = {
    name: chapter.name,
    location: chapter.location,
    leader: chapter.leader,
  }
  activeModal.value = 'chapter'
}

function openManageChapters() {
  activeModal.value = 'manage'
}

function closeModal() {
  activeModal.value = null
  imageError.value = ''
  releaseObjectUrl()
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (selectedMember.value) selectedMember.value = null
    else closeModal()
  }
}

function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  imageError.value = ''

  if (!file) return

  if (!file.type.startsWith('image/')) {
    imageError.value = 'Please select an image file.'
    input.value = ''
    return
  }

  if (file.size > 12 * 1024 * 1024) {
    imageError.value = 'Choose an image smaller than 12 MB.'
    input.value = ''
    return
  }

  releaseObjectUrl()
  currentObjectUrl = URL.createObjectURL(file)

  const image = new Image()
  image.onload = () => {
    const maxSide = 1100
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)

    const context = canvas.getContext('2d')
    if (!context) {
      imageError.value = 'Could not prepare this image.'
      return
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    memberForm.value.image = canvas.toDataURL('image/jpeg', 0.82)
    releaseObjectUrl()
  }
  image.onerror = () => {
    imageError.value = 'Could not open this image.'
    releaseObjectUrl()
  }
  image.src = currentObjectUrl
  input.value = ''
}

function removeMemberImage() {
  memberForm.value.image = ''
  memberForm.value.imagePosition = '50% 35%'
  imageError.value = ''
  releaseObjectUrl()
}

function saveMember() {
  if (!memberForm.value.name.trim()) {
    imageError.value = 'Enter the member’s name before saving.'
    return
  }

  if (!memberForm.value.chapterId) {
    imageError.value = 'Create a chapter first, then assign the member.'
    return
  }

  saving.value = true

  const payload: Member = {
    id: editingMemberId.value ?? makeId(),
    name: memberForm.value.name.trim(),
    rank: memberForm.value.rank,
    chapterId: memberForm.value.chapterId,
    status: memberForm.value.status,
    image: memberForm.value.image,
    imagePosition: memberForm.value.imagePosition,
    joinedAt: memberForm.value.joinedAt,
    bio: memberForm.value.bio.trim(),
  }

  if (editingMemberId.value) {
    members.value = members.value.map((member) =>
      member.id === editingMemberId.value ? payload : member,
    )
  } else {
    members.value = [payload, ...members.value]
  }

  persistMembers()
  saving.value = false
  closeModal()
  notify(editingMemberId.value ? 'Member updated.' : 'New member added.')
}

function saveChapter() {
  if (!chapterForm.value.name.trim()) {
    notify('Enter a chapter name.')
    return
  }

  const payload: Chapter = {
    id: editingChapterId.value ?? makeId(),
    name: chapterForm.value.name.trim(),
    location: chapterForm.value.location.trim(),
    leader: chapterForm.value.leader.trim(),
  }

  const duplicate = chapters.value.some(
    (chapter) =>
      chapter.name.toLowerCase() === payload.name.toLowerCase() &&
      chapter.id !== payload.id,
  )

  if (duplicate) {
    notify('A chapter with that name already exists.')
    return
  }

  if (editingChapterId.value) {
    chapters.value = chapters.value.map((chapter) =>
      chapter.id === editingChapterId.value ? payload : chapter,
    )
  } else {
    chapters.value = [...chapters.value, payload]
  }

  persistChapters()

  if (!memberForm.value.chapterId) {
    memberForm.value.chapterId = payload.id
  }

  closeModal()
  notify(editingChapterId.value ? 'Chapter updated.' : 'New chapter created.')
}

function deleteChapter(chapter: Chapter) {
  const assignedMembers = members.value.filter(
    (member) => member.chapterId === chapter.id,
  ).length

  if (assignedMembers > 0) {
    notify(`Move the ${assignedMembers} assigned member(s) before deleting.`)
    return
  }

  if (!window.confirm(`Delete chapter "${chapter.name}"?`)) return

  chapters.value = chapters.value.filter((item) => item.id !== chapter.id)
  persistChapters()
  notify('Chapter deleted.')
}

function deleteMember(member: Member) {
  if (!window.confirm(`Remove ${member.name} from the directory?`)) return

  members.value = members.value.filter((item) => item.id !== member.id)
  persistMembers()
  selectedMember.value = null
  notify('Member removed.')
}

function statusClass(status: Member['status']) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

onMounted(() => {
  loadData()
  window.addEventListener('keydown', onEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEscape)
  if (toastTimer) clearTimeout(toastTimer)
  releaseObjectUrl()
})

watch(
  () => memberForm.value.chapterId,
  (value) => {
    if (value && !chapters.value.some((chapter) => chapter.id === value)) {
      memberForm.value.chapterId = chapters.value[0]?.id ?? ''
    }
  },
)
</script>

<template>
  <div class="members-page">

    <main class="main-content">
      <section class="page-intro">
        <div class="eyebrow">
          <span class="eyebrow-line"></span>
          THE PEOPLE BEHIND THE PATCH
        </div>

        <div class="intro-row">
          <div>
            <h1>OUR <span>MEMBERS.</span></h1>
            <p class="intro-description">
              The people, ranks and chapters that make Devils Mercy MC.
            </p>
          </div>

          <div class="intro-actions">
            <button
              class="button-secondary"
              type="button"
              @click="openManageChapters"
            >
              <v-icon icon="mdi-shield-outline" size="18" />
              MANAGE CHAPTERS
            </button>
            <button
              class="button-primary"
              type="button"
              @click="openNewChapter"
            >
              <v-icon icon="mdi-plus" size="19" />
              NEW CHAPTER
            </button>
            <button
              class="button-primary"
              type="button"
              :disabled="chapters.length === 0"
              @click="openNewMember"
            >
              <v-icon icon="mdi-account-plus-outline" size="19" />
              NEW MEMBER
            </button>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-number">{{ members.length }}</span>
            <span class="stat-label">REGISTERED MEMBERS</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ activeCount }}</span>
            <span class="stat-label">ACTIVE MEMBERS</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ prospectCount }}</span>
            <span class="stat-label">PROSPECTS</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ chapters.length }}</span>
            <span class="stat-label">CHAPTERS</span>
          </div>
        </div>
      </section>

      <section class="directory">
        <div class="directory-heading">
          <div>
            <div class="section-label">
              <span class="section-label-line"></span>
              THE DIRECTORY
            </div>
            <h2>CLUB <span>ROSTER.</span></h2>
          </div>
          <span class="results-count">
            {{ visibleMembers.length }} MEMBER{{ visibleMembers.length === 1 ? '' : 'S' }}
          </span>
        </div>

        <div class="filters">
          <label class="search-field">
            <v-icon icon="mdi-magnify" size="21" />
            <input
              v-model="search"
              type="search"
              placeholder="Search name, rank or chapter..."
              aria-label="Search members"
            />
          </label>

          <label class="filter-field">
            <span>CHAPTER</span>
            <select v-model="selectedChapter">
              <option value="all">All Chapters</option>
              <option
                v-for="chapter in chapters"
                :key="chapter.id"
                :value="chapter.id"
              >
                {{ chapter.name }}
              </option>
            </select>
          </label>

          <label class="filter-field">
            <span>STATUS</span>
            <select v-model="selectedStatus">
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Prospect">Prospect</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>

        <div v-if="visibleMembers.length" class="member-grid">
          <article
            v-for="member in visibleMembers"
            :key="member.id"
            class="member-card"
            @click="selectedMember = member"
          >
            <div class="member-image">
              <img
                v-if="member.image"
                :src="member.image"
                :alt="member.name"
                :style="{ objectPosition: member.imagePosition || '50% 35%' }"
              />
              <div v-else class="image-placeholder">
                <img src="/images/logo.png" alt="" />
                <span>NO IMAGE</span>
              </div>

              <span class="status-tag" :class="statusClass(member.status)">
                {{ member.status }}
              </span>

              <button
                class="card-edit"
                type="button"
                aria-label="Edit member"
                @click.stop="openEditMember(member)"
              >
                <v-icon icon="mdi-pencil-outline" size="18" />
              </button>
            </div>

            <div class="member-info">
              <span class="member-chapter">
                {{ currentChapterName(member.chapterId) }}
              </span>
              <h3>{{ member.name }}</h3>
              <p class="member-rank">{{ member.rank }}</p>

              <div class="member-card-footer">
                <span>VIEW PROFILE</span>
                <v-icon icon="mdi-arrow-up-right" size="18" />
              </div>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          <img src="/images/logo.png" alt="" />
          <h3>{{ members.length ? 'NO MATCHES FOUND' : 'THE ROSTER IS EMPTY' }}</h3>
          <p>
            {{
              members.length
                ? 'Try changing the search or filters.'
                : 'Create your first member to start building the directory.'
            }}
          </p>
          <button
            v-if="!members.length && chapters.length"
            class="button-primary"
            type="button"
            @click="openNewMember"
          >
            <v-icon icon="mdi-account-plus-outline" size="18" />
            ADD FIRST MEMBER
          </button>
          <button
            v-if="!chapters.length"
            class="button-primary"
            type="button"
            @click="openNewChapter"
          >
            <v-icon icon="mdi-plus" size="18" />
            CREATE A CHAPTER
          </button>
        </div>
      </section>

      <section class="admin-strip">
        <div class="admin-copy">
          <span class="section-label">
            <span class="section-label-line"></span>
            DIRECTORY SETTINGS
          </span>
          <h2>KEEP THE <span>ROSTER UPDATED.</span></h2>
          <p>
            Add members, create chapters and manage the club directory from
            one place.
          </p>
        </div>
        <div class="admin-actions">
          <button class="button-secondary" type="button" @click="openManageChapters">
            MANAGE CHAPTERS
          </button>
          <button class="button-primary" type="button" @click="openNewChapter">
            + NEW CHAPTER
          </button>
          <button
            class="button-primary"
            type="button"
            :disabled="chapters.length === 0"
            @click="openNewMember"
          >
            + NEW MEMBER
          </button>
        </div>
      </section>
    </main>

     

    <!-- NEW / EDIT MEMBER MODAL -->
    <Transition name="modal">
      <div
        v-if="activeModal === 'member'"
        class="modal-backdrop"
        @click.self="closeModal"
      >
        <section
          class="modal-window member-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
        >
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">DEVILS MERCY MC / DIRECTORY</span>
              <h2 id="member-modal-title">
                {{ editingMemberId ? 'EDIT' : 'NEW' }} <span>MEMBER.</span>
              </h2>
              <p>Enter the member details and prepare their profile image.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" @click="closeModal">
              <v-icon icon="mdi-close" size="23" />
            </button>
          </div>

          <form class="modal-body member-form" @submit.prevent="saveMember">
            <div class="form-grid">
              <label class="form-field full-width">
                <span>MEMBER NAME *</span>
                <input
                  v-model="memberForm.name"
                  required
                  maxlength="80"
                  placeholder="Enter full name"
                />
              </label>

              <label class="form-field">
                <span>RANK</span>
                <select v-model="memberForm.rank">
                  <option v-for="rank in ranks" :key="rank" :value="rank">
                    {{ rank }}
                  </option>
                </select>
              </label>

              <label class="form-field">
                <span>CHAPTER *</span>
                <select v-model="memberForm.chapterId" required>
                  <option disabled value="">Select chapter</option>
                  <option
                    v-for="chapter in chapters"
                    :key="chapter.id"
                    :value="chapter.id"
                  >
                    {{ chapter.name }}
                  </option>
                </select>
              </label>

              <label class="form-field">
                <span>STATUS</span>
                <select v-model="memberForm.status">
                  <option value="Active">Active</option>
                  <option value="Prospect">Prospect</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label class="form-field">
                <span>JOINED DATE</span>
                <input v-model="memberForm.joinedAt" type="date" />
              </label>

              <label class="form-field full-width">
                <span>SHORT BIO</span>
                <textarea
                  v-model="memberForm.bio"
                  rows="3"
                  maxlength="500"
                  placeholder="Optional information about this member..."
                ></textarea>
              </label>
            </div>

            <div class="image-editor">
              <div class="image-editor-heading">
                <div>
                  <span class="modal-eyebrow">PROFILE CUSTOMIZATION</span>
                  <h3>MEMBER <span>IMAGE.</span></h3>
                </div>
                <span class="image-step">01 / 01</span>
              </div>

              <div class="image-editor-grid">
                <div class="image-preview-wrap">
                  <div class="image-preview">
                    <img
                      v-if="memberForm.image"
                      :src="memberForm.image"
                      :style="{ objectPosition: memberForm.imagePosition }"
                      alt="Member image preview"
                    />
                    <div v-else class="image-placeholder">
                      <img src="/images/logo.png" alt="" />
                      <span>IMAGE PREVIEW</span>
                    </div>
                    <span class="preview-overlay">LIVE PREVIEW</span>
                  </div>
                </div>

                <div class="image-controls">
                  <label class="upload-button">
                    <v-icon icon="mdi-cloud-upload-outline" size="20" />
                    {{ memberForm.image ? 'CHANGE IMAGE' : 'CHOOSE IMAGE' }}
                    <input
                      type="file"
                      accept="image/*"
                      @change="onImageSelected"
                    />
                  </label>

                  <p class="control-help">
                    Select a JPG, PNG or WebP image. The image is resized and
                    compressed before it is saved.
                  </p>

                  <label class="form-field">
                    <span>IMAGE POSITION</span>
                    <select v-model="memberForm.imagePosition">
                      <option value="50% 15%">Top</option>
                      <option value="50% 35%">Upper centre</option>
                      <option value="50% 50%">Centre</option>
                      <option value="50% 70%">Lower centre</option>
                      <option value="50% 90%">Bottom</option>
                    </select>
                  </label>

                  <button
                    v-if="memberForm.image"
                    class="remove-image"
                    type="button"
                    @click="removeMemberImage"
                  >
                    <v-icon icon="mdi-trash-can-outline" size="17" />
                    REMOVE IMAGE
                  </button>
                </div>
              </div>

              <p v-if="imageError" class="form-error">{{ imageError }}</p>
            </div>

            <div class="modal-footer">
              <button class="button-secondary" type="button" @click="closeModal">
                CANCEL
              </button>
              <button class="button-primary" type="submit" :disabled="saving">
                <v-icon icon="mdi-check" size="18" />
                {{ saving ? 'SAVING...' : editingMemberId ? 'SAVE CHANGES' : 'CREATE MEMBER' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Transition>

    <!-- NEW / EDIT CHAPTER MODAL -->
    <Transition name="modal">
      <div
        v-if="activeModal === 'chapter'"
        class="modal-backdrop"
        @click.self="closeModal"
      >
        <section
          class="modal-window chapter-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chapter-modal-title"
        >
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">DEVILS MERCY MC / ORGANIZATION</span>
              <h2 id="chapter-modal-title">
                {{ editingChapterId ? 'EDIT' : 'NEW' }} <span>CHAPTER.</span>
              </h2>
              <p>Create a chapter and make it available in the member directory.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" @click="closeModal">
              <v-icon icon="mdi-close" size="23" />
            </button>
          </div>

          <form class="modal-body" @submit.prevent="saveChapter">
            <div class="chapter-emblem">
              <v-icon icon="mdi-shield-star-outline" size="44" />
              <span>CHAPTER REGISTRATION</span>
            </div>

            <div class="form-grid">
              <label class="form-field full-width">
                <span>CHAPTER NAME *</span>
                <input
                  v-model="chapterForm.name"
                  required
                  maxlength="80"
                  placeholder="e.g. Los Santos"
                />
              </label>

              <label class="form-field full-width">
                <span>LOCATION</span>
                <input
                  v-model="chapterForm.location"
                  maxlength="100"
                  placeholder="City, state or territory"
                />
              </label>

              <label class="form-field full-width">
                <span>CHAPTER LEADER</span>
                <input
                  v-model="chapterForm.leader"
                  maxlength="80"
                  placeholder="Optional leader name"
                />
              </label>
            </div>

            <div class="modal-footer">
              <button class="button-secondary" type="button" @click="closeModal">
                CANCEL
              </button>
              <button class="button-primary" type="submit">
                <v-icon icon="mdi-check" size="18" />
                {{ editingChapterId ? 'SAVE CHANGES' : 'CREATE CHAPTER' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Transition>

    <!-- CHAPTER MANAGEMENT MODAL -->
    <Transition name="modal">
      <div
        v-if="activeModal === 'manage'"
        class="modal-backdrop"
        @click.self="closeModal"
      >
        <section
          class="modal-window manage-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-modal-title"
        >
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">DEVILS MERCY MC / ADMINISTRATION</span>
              <h2 id="manage-modal-title">MANAGE <span>CHAPTERS.</span></h2>
              <p>Edit chapter details or create a new chapter.</p>
            </div>
            <button class="modal-close" type="button" aria-label="Close" @click="closeModal">
              <v-icon icon="mdi-close" size="23" />
            </button>
          </div>

          <div class="modal-body">
            <button class="button-primary create-chapter-wide" type="button" @click="openNewChapter">
              <v-icon icon="mdi-plus" size="19" />
              CREATE NEW CHAPTER
            </button>

            <div v-if="chapters.length" class="chapter-list">
              <article
                v-for="chapter in chapters"
                :key="chapter.id"
                class="chapter-row"
              >
                <div class="chapter-icon">
                  <v-icon icon="mdi-shield-outline" size="24" />
                </div>
                <div class="chapter-details">
                  <h3>{{ chapter.name }}</h3>
                  <p>{{ chapter.location || 'Location not specified' }}</p>
                  <span>
                    {{ members.filter((member) => member.chapterId === chapter.id).length }}
                    REGISTERED MEMBER(S)
                  </span>
                </div>
                <div class="chapter-row-actions">
                  <button
                    class="icon-action"
                    type="button"
                    aria-label="Edit chapter"
                    @click="openEditChapter(chapter)"
                  >
                    <v-icon icon="mdi-pencil-outline" size="19" />
                  </button>
                  <button
                    class="icon-action danger"
                    type="button"
                    aria-label="Delete chapter"
                    @click="deleteChapter(chapter)"
                  >
                    <v-icon icon="mdi-trash-can-outline" size="19" />
                  </button>
                </div>
              </article>
            </div>

            <div v-else class="chapter-empty">
              <v-icon icon="mdi-shield-off-outline" size="35" />
              <p>No chapters created yet.</p>
            </div>

            <div class="modal-footer">
              <button class="button-secondary" type="button" @click="closeModal">
                CLOSE
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <!-- MEMBER PROFILE MODAL -->
    <Transition name="modal">
      <div
        v-if="selectedMember"
        class="modal-backdrop"
        @click.self="selectedMember = null"
      >
        <section class="modal-window profile-modal" role="dialog" aria-modal="true">
          <button
            class="modal-close profile-close"
            type="button"
            aria-label="Close"
            @click="selectedMember = null"
          >
            <v-icon icon="mdi-close" size="23" />
          </button>

          <div class="profile-image">
            <img
              v-if="selectedMember.image"
              :src="selectedMember.image"
              :alt="selectedMember.name"
              :style="{ objectPosition: selectedMember.imagePosition || '50% 35%' }"
            />
            <div v-else class="image-placeholder">
              <img src="/images/logo.png" alt="" />
              <span>NO IMAGE</span>
            </div>
          </div>

          <div class="profile-details">
            <span class="modal-eyebrow">{{ currentChapterName(selectedMember.chapterId) }}</span>
            <h2>{{ selectedMember.name }}<span>.</span></h2>
            <p class="profile-rank">{{ selectedMember.rank }}</p>
            <span class="status-tag profile-status" :class="statusClass(selectedMember.status)">
              {{ selectedMember.status }}
            </span>

            <div v-if="selectedMember.joinedAt" class="profile-meta">
              <span>JOINED</span>
              <strong>{{ selectedMember.joinedAt }}</strong>
            </div>

            <p v-if="selectedMember.bio" class="profile-bio">{{ selectedMember.bio }}</p>

            <div class="modal-footer">
              <button class="button-secondary" type="button" @click="selectedMember = null">
                CLOSE
              </button>
              <button class="button-primary" type="button" @click="openEditMember(selectedMember)">
                <v-icon icon="mdi-pencil-outline" size="18" />
                EDIT MEMBER
              </button>
              <button
                class="remove-image"
                type="button"
                @click="deleteMember(selectedMember)"
              >
                REMOVE
              </button>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="toast">
      <div v-if="toast" class="toast-message">
        <v-icon icon="mdi-check-circle-outline" size="20" />
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.members-page {
  --page-bg: #090909;
  --panel-bg: #111111;
  --panel-raised: #171717;
  --text-main: #f3f0ed;
  --text-muted: #a19b97;
  --red: #8b0000;
  --red-light: #bb2424;
  --border: rgba(255, 255, 255, 0.11);
  min-height: 100vh;
  overflow: hidden;
  background: var(--page-bg);
  color: var(--text-main);
  font-family: 'Inter', sans-serif;
}

.members-page *,
.members-page *::before,
.members-page *::after {
  box-sizing: border-box;
}

.members-page button,
.members-page input,
.members-page select,
.members-page textarea {
  font: inherit;
}

.members-page button {
  cursor: pointer;
}

.members-page button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.members-page a {
  color: inherit;
  text-decoration: none;
}

.site-header {
  position: relative;
  z-index: 20;
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 0 6.2%;
  border-bottom: 1px solid var(--border);
  background: #090909;
}

.brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  display: block;
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brand-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 23px;
  font-weight: 800;
  letter-spacing: 1.7px;
  line-height: 1;
}

.brand-subtitle {
  color: #a69d98;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 2.8px;
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: clamp(18px, 2.6vw, 42px);
}

.nav-link {
  position: relative;
  padding: 34px 0;
  color: #bcb6b1;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  transition: color 180ms ease;
}

.nav-link:hover,
.nav-link-active {
  color: #fff;
}

.nav-link-active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--red-light);
  content: '';
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-cta {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  padding: 14px 17px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  transition: background 180ms ease;
}

.header-cta:hover {
  background: var(--red);
}

.mobile-menu-button,
.mobile-nav {
  display: none;
}

.main-content {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 0 6.2%;
}

.page-intro {
  padding: 75px 0 35px;
}

.eyebrow,
.section-label {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #c1b9b3;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2.1px;
}

.eyebrow-line,
.section-label-line {
  display: inline-block;
  width: 33px;
  height: 1px;
  background: var(--red-light);
}

.intro-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 35px;
  margin-top: 19px;
}

.page-intro h1,
.directory-heading h2,
.admin-copy h2,
.modal-header h2 {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(46px, 6vw, 78px);
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 0.98;
}

.page-intro h1 span,
.directory-heading h2 span,
.admin-copy h2 span,
.modal-header h2 span {
  color: var(--red-light);
}

.intro-description {
  margin: 17px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.8;
}

.intro-actions,
.admin-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 9px;
}

.button-primary,
.button-secondary {
  display: inline-flex;
  min-height: 45px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
  border: 1px solid transparent;
  border-radius: 0;
  font-size: 9px !important;
  font-weight: 700 !important;
  letter-spacing: 1px;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.button-primary {
  background: var(--red);
  color: #fff;
}

.button-primary:hover:not(:disabled) {
  background: #ad1717;
  transform: translateY(-1px);
}

.button-secondary {
  border-color: rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #f4f0ed;
}

.button-secondary:hover {
  border-color: var(--red-light);
  background: rgba(139, 0, 0, 0.13);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 42px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.stat-item {
  display: flex;
  min-height: 85px;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 15px 22px;
  border-right: 1px solid var(--border);
}

.stat-item:first-child {
  padding-left: 0;
}

.stat-item:last-child {
  border-right: 0;
}

.stat-number {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 31px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.directory {
  padding: 65px 0 75px;
}

.directory-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 25px;
}

.directory-heading h2 {
  margin-top: 14px;
  font-size: clamp(38px, 4.3vw, 56px);
}

.results-count {
  padding-bottom: 5px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.filters {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) 210px 180px;
  gap: 12px;
  margin: 30px 0 25px;
}

.search-field,
.filter-field {
  display: flex;
  min-height: 48px;
  align-items: center;
  border: 1px solid var(--border);
  background: #101010;
}

.search-field {
  gap: 11px;
  padding: 0 14px;
  color: #99918b;
}

.search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f5f2ef;
  font-size: 11px;
}

.search-field input::placeholder {
  color: #716b67;
}

.filter-field {
  position: relative;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 3px;
  padding: 6px 12px;
}

.filter-field span,
.form-field > span {
  color: #a69e98;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.3px;
}

.filter-field select,
.form-field select,
.form-field input,
.form-field textarea {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f2efec;
  font-size: 11px;
}

.filter-field select option,
.form-field select option {
  background: #151515;
  color: #fff;
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 17px;
}

.member-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #101010;
  cursor: pointer;
  transition:
    border-color 200ms ease,
    transform 200ms ease,
    background 200ms ease;
}

.member-card:hover {
  transform: translateY(-4px);
  border-color: rgba(187, 36, 36, 0.75);
  background: #141414;
}

.member-image {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: #171717;
}

.member-image > img,
.profile-image > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-image > img {
  display: block;
  transition: transform 350ms ease;
}

.member-card:hover .member-image > img {
  transform: scale(1.035);
}

.image-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background:
    radial-gradient(ellipse at center, rgba(139, 0, 0, 0.14), transparent 60%),
    #121212;
  color: #736c67;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
}

.image-placeholder img {
  width: 65px;
  height: 65px;
  object-fit: contain;
  opacity: 0.35;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 9px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.member-image .status-tag {
  position: absolute;
  bottom: 12px;
  left: 12px;
}

.status-tag.active {
  border-left: 2px solid #638e65;
}

.status-tag.prospect {
  border-left: 2px solid #d09a3c;
}

.status-tag.inactive {
  border-left: 2px solid #777;
}

.card-edit {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  opacity: 0;
  transition: opacity 180ms ease;
}

.member-card:hover .card-edit,
.card-edit:focus-visible {
  opacity: 1;
}

.member-info {
  padding: 19px 17px 0;
}

.member-chapter {
  color: #b42a2a;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.6px;
  text-transform: uppercase;
}

.member-info h3 {
  margin: 9px 0 3px;
  overflow-wrap: anywhere;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.1;
  text-transform: uppercase;
}

.member-rank {
  margin: 0;
  color: var(--text-muted);
  font-size: 10px;
}

.member-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding: 13px 0;
  border-top: 1px solid var(--border);
  color: #d8d1cc;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.member-card-footer .v-icon {
  color: var(--red-light);
}

.empty-state {
  display: flex;
  min-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  border: 1px dashed rgba(255, 255, 255, 0.17);
  text-align: center;
}

.empty-state > img {
  width: 55px;
  height: 55px;
  margin-bottom: 20px;
  object-fit: contain;
  opacity: 0.45;
}

.empty-state h3 {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 28px;
  letter-spacing: 1px;
}

.empty-state p {
  max-width: 370px;
  margin: 10px 0 22px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.8;
}

.admin-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 35px;
  margin: 0 0 80px;
  padding: 30px;
  border: 1px solid var(--border);
  background:
    linear-gradient(105deg, rgba(139, 0, 0, 0.12), transparent 50%),
    #101010;
}

.admin-copy h2 {
  margin-top: 12px;
  font-size: clamp(28px, 3vw, 39px);
}

.admin-copy p {
  max-width: 440px;
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.8;
}

.admin-actions {
  flex-shrink: 0;
}

.site-footer {
  padding: 38px 6.2% 0;
  border-top: 1px solid var(--border);
  background: #080808;
}

.footer-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding-bottom: 34px;
}

.footer-description {
  max-width: 250px;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.8;
}

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
}

.footer-nav a,
.footer-bottom {
  color: #a49c96;
  font-size: 9px;
}

.footer-nav a:hover,
.footer-bottom a:hover {
  color: #fff;
}

.footer-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 15px;
  padding: 19px 0;
  border-top: 1px solid var(--border);
  font-size: 8px;
  letter-spacing: 1px;
}

/* MODALS */

.modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 25px;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(9px);
}

.modal-window {
  position: relative;
  width: min(760px, 100%);
  max-height: min(90vh, 950px);
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #101010;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.6);
}

.member-modal {
  width: min(860px, 100%);
}

.chapter-modal {
  width: min(570px, 100%);
}

.manage-modal {
  width: min(690px, 100%);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 30px 32px 25px;
  border-bottom: 1px solid var(--border);
  background:
    linear-gradient(110deg, rgba(139, 0, 0, 0.16), transparent 65%),
    #111;
}

.modal-eyebrow {
  display: block;
  margin-bottom: 11px;
  color: #bb3434;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.8px;
}

.modal-header h2 {
  font-size: clamp(35px, 5vw, 48px);
}

.modal-header p {
  max-width: 470px;
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.8;
}

.modal-close {
  display: grid;
  width: 39px;
  height: 39px;
  flex: 0 0 39px;
  place-items: center;
  border: 1px solid var(--border);
  background: #161616;
  color: #fff;
  transition:
    border-color 180ms ease,
    background 180ms ease;
}

.modal-close:hover {
  border-color: var(--red-light);
  background: #250b0b;
}

.modal-body {
  padding: 27px 32px 30px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px;
}

.form-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 9px;
}

.full-width {
  grid-column: 1 / -1;
}

.form-field input,
.form-field select,
.form-field textarea {
  min-height: 44px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 0;
  outline: 0;
  background: #151515;
  color: #f4f0ed;
  font-size: 11px;
  transition: border-color 180ms ease;
}

.form-field textarea {
  min-height: 88px;
  resize: vertical;
  line-height: 1.7;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: #9f2424;
}

.form-field input::placeholder,
.form-field textarea::placeholder {
  color: #716b67;
}

.image-editor {
  margin-top: 28px;
  padding: 20px;
  border: 1px solid var(--border);
  background: #0c0c0c;
}

.image-editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 18px;
}

.image-editor-heading h3 {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 26px;
  font-weight: 800;
}

.image-editor-heading h3 span {
  color: var(--red-light);
}

.image-step {
  color: #77716c;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.image-editor-grid {
  display: grid;
  grid-template-columns: minmax(140px, 0.8fr) minmax(0, 1.2fr);
  gap: 20px;
}

.image-preview-wrap {
  min-width: 0;
}

.image-preview {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #171717;
}

.image-preview > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.75);
  color: #ddd;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1px;
}

.image-controls {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 15px;
}

.upload-button {
  display: flex;
  min-height: 45px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid #792020;
  background: rgba(139, 0, 0, 0.15);
  color: #f3efec;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  transition: background 180ms ease;
}

.upload-button:hover {
  background: rgba(139, 0, 0, 0.32);
}

.upload-button input {
  display: none;
}

.control-help {
  margin: -5px 0 0;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.8;
}

.remove-image {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 7px;
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: #d56b6b;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
}

.remove-image:hover {
  color: #ff9090;
}

.form-error {
  margin: 12px 0 0;
  color: #ff9696;
  font-size: 10px;
  line-height: 1.7;
}

.modal-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.chapter-emblem {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 23px;
  border: 1px solid var(--border);
  background:
    radial-gradient(ellipse at center, rgba(139, 0, 0, 0.16), transparent 65%),
    #0c0c0c;
  color: #b52d2d;
}

.chapter-emblem span {
  color: #c9c0ba;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
}

.create-chapter-wide {
  width: 100%;
  margin-bottom: 18px;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.chapter-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px;
  border: 1px solid var(--border);
  background: #141414;
}

.chapter-icon {
  display: grid;
  width: 43px;
  height: 43px;
  flex: 0 0 43px;
  place-items: center;
  border: 1px solid rgba(187, 36, 36, 0.4);
  background: rgba(139, 0, 0, 0.12);
  color: #c64a4a;
}

.chapter-details {
  flex: 1;
  min-width: 0;
}

.chapter-details h3 {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 700;
  text-transform: uppercase;
}

.chapter-details p {
  margin: 4px 0 7px;
  color: var(--text-muted);
  font-size: 10px;
}

.chapter-details > span {
  color: #a82b2b;
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1px;
}

.chapter-row-actions {
  display: flex;
  gap: 6px;
}

.icon-action {
  display: grid;
  width: 35px;
  height: 35px;
  flex: 0 0 35px;
  place-items: center;
  border: 1px solid var(--border);
  background: #191919;
  color: #ddd;
}

.icon-action:hover {
  border-color: var(--red-light);
}

.icon-action.danger {
  color: #d76a6a;
}

.chapter-empty {
  padding: 35px;
  color: var(--text-muted);
  text-align: center;
}

.chapter-empty p {
  font-size: 11px;
}

.profile-modal {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  width: min(790px, 100%);
  overflow: hidden;
}

.profile-close {
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 14px;
}

.profile-image {
  min-height: 420px;
  overflow: hidden;
  background: #171717;
}

.profile-details {
  align-self: center;
  padding: 40px 30px;
}

.profile-details h2 {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(35px, 4vw, 49px);
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.profile-details h2 span {
  color: var(--red-light);
}

.profile-rank {
  margin: 10px 0 17px;
  color: var(--text-muted);
  font-size: 12px;
}

.profile-status {
  position: static;
}

.profile-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 22px;
  padding-top: 17px;
  border-top: 1px solid var(--border);
}

.profile-meta span {
  color: var(--text-muted);
  font-size: 8px;
  letter-spacing: 1.5px;
}

.profile-meta strong {
  font-size: 11px;
  font-weight: 500;
}

.profile-bio {
  color: #b7afaa;
  font-size: 11px;
  line-height: 1.9;
  overflow-wrap: anywhere;
}

.profile-details .modal-footer {
  justify-content: flex-start;
}

.toast-message {
  position: fixed;
  z-index: 1200;
  right: 25px;
  bottom: 25px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: calc(100vw - 50px);
  padding: 15px 19px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #171717;
  color: #f4f0ed;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  font-size: 11px;
}

.toast-message .v-icon {
  color: #b82a2a;
}

/* ANIMATIONS */

.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}

.modal-enter-active .modal-window,
.modal-leave-active .modal-window {
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-window,
.modal-leave-to .modal-window {
  transform: translateY(12px) scale(0.99);
  opacity: 0;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active,
.toast-enter-active,
.toast-leave-active {
  transition: all 180ms ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to,
.toast-enter-from,
.toast-leave-to {
  transform: translateY(8px);
  opacity: 0;
}

/* RESPONSIVE */

@media (max-width: 1150px) {
  .site-header {
    gap: 20px;
  }

  .desktop-nav {
    gap: 18px;
  }

  .member-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .intro-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .intro-actions {
    justify-content: flex-start;
  }

  .admin-strip {
    align-items: flex-start;
    flex-direction: column;
  }

  .admin-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 850px) {
  .desktop-nav,
  .header-cta {
    display: none;
  }

  .mobile-menu-button {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid var(--border);
    background: transparent;
    color: #fff;
  }

  .mobile-nav {
    position: absolute;
    top: 100%;
    right: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    padding: 10px 6.2% 20px;
    border-bottom: 1px solid var(--border);
    background: #0c0c0c;
  }

  .mobile-nav-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 17px 0;
    border-bottom: 1px solid var(--border);
    color: #e7e0db;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .filters {
    grid-template-columns: 1fr 1fr;
  }

  .search-field {
    grid-column: 1 / -1;
  }

  .member-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-main {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }

  .footer-description {
    margin: 0;
  }
}

@media (max-width: 560px) {
  .site-header {
    min-height: 75px;
    padding: 0 5%;
  }

  .brand-logo {
    width: 42px;
    height: 42px;
  }

  .brand-name {
    font-size: 20px;
  }

  .brand-subtitle {
    font-size: 8px;
    letter-spacing: 2px;
  }

  .main-content {
    padding: 0 5%;
  }

  .page-intro {
    padding-top: 50px;
  }

  .page-intro h1 {
    font-size: 51px;
  }

  .intro-actions {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr;
  }

  .intro-actions button {
    width: 100%;
  }

  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-item {
    padding: 15px !important;
    border-bottom: 1px solid var(--border);
  }

  .stat-item:nth-child(2) {
    border-right: 0;
  }

  .stat-item:nth-child(n + 3) {
    border-bottom: 0;
  }

  .directory {
    padding: 45px 0 55px;
  }

  .directory-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .filters {
    grid-template-columns: 1fr;
  }

  .search-field {
    grid-column: auto;
  }

  .member-grid {
    gap: 10px;
  }

  .member-info {
    padding: 13px 11px 0;
  }

  .member-info h3 {
    font-size: 22px;
  }

  .member-chapter {
    font-size: 7px;
    letter-spacing: 1px;
  }

  .member-card-footer {
    font-size: 7px;
  }

  .card-edit {
    opacity: 1;
  }

  .admin-strip {
    margin-bottom: 55px;
    padding: 20px;
  }

  .admin-actions {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr;
  }

  .admin-actions button {
    width: 100%;
  }

  .site-footer {
    padding: 30px 5% 0;
  }

  .footer-bottom {
    flex-direction: column;
  }

  .modal-backdrop {
    align-items: flex-start;
    padding: 12px;
  }

  .modal-window {
    max-height: calc(100dvh - 24px);
    margin: auto 0;
  }

  .modal-header {
    padding: 23px 19px 20px;
  }

  .modal-body {
    padding: 22px 19px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .full-width {
    grid-column: auto;
  }

  .image-editor {
    padding: 13px;
  }

  .image-editor-grid {
    grid-template-columns: 1fr;
  }

  .image-preview {
    width: min(230px, 100%);
    margin: 0 auto;
  }

  .modal-footer {
    align-items: stretch;
  }

  .modal-footer > button {
    flex: 1;
  }

  .chapter-row {
    gap: 9px;
    padding: 10px;
  }

  .chapter-icon {
    width: 35px;
    height: 35px;
    flex-basis: 35px;
  }

  .chapter-row-actions {
    flex-direction: column;
  }

  .profile-modal {
    grid-template-columns: 1fr;
  }

  .profile-image {
    min-height: 0;
    aspect-ratio: 4 / 3;
  }

  .profile-details {
    padding: 27px 20px;
  }

  .profile-details .modal-footer {
    justify-content: flex-start;
  }
}
</style>
