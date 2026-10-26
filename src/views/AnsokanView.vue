
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

type ApplicationType = 'hangaround' | 'charter'

const selectedType = ref<ApplicationType | null>(null)
const dialog = ref(false)
const step = ref(0)
const submitted = ref(false)
const submitting = ref(false)
const submitError = ref('')

const answers = ref({
  age: '',
  nationality: '',
  timezone: '',
  heardAbout: '',
  experience: '',
  rules: null as string | null,
  charter: '',
})

const questions = [
  {
    id: 'personal',
    number: '01',
    title: 'Personal Information',
    question: 'What is your age, Nationality and Timezone?',
    description: 'Tell us a little about yourself.',
  },
  {
    id: 'heard',
    number: '02',
    title: 'How You Found Us',
    question: 'How did you hear about us?',
    description: 'Let us know how you discovered Devils Mercy.',
  },
  {
    id: 'experience',
    number: '03',
    title: 'Previous Experience',
    question:
      'What is your previous FiveM RP experience? List clubs, ranks held and reasons for leaving.',
    description: 'Please provide an honest overview of your roleplay history.',
  },
  {
    id: 'rules',
    number: '04',
    title: 'Commitment',
    question:
      'Are you willing to follow all rules and understand we do not do handouts — everything is earned?',
    description: 'We value commitment, respect and earning your place.',
  },
  {
    id: 'charter',
    number: '05',
    title: 'Charter Selection',
    question: 'What Charter are you applying for?',
    description: 'Tell us which Charter this application is for.',
  },
]

const currentQuestion = computed(() => questions[step.value] ?? questions[0]!)
const progress = computed(() => ((step.value + 1) / questions.length) * 100)

function openApplication(type: ApplicationType) {
  selectedType.value = type
  step.value = 0
  submitted.value = false
  submitting.value = false
  submitError.value = ''
  answers.value = { age: '', nationality: '', timezone: '', heardAbout: '', experience: '', rules: null, charter: '' }
  dialog.value = true
}

function closeApplication() {
  dialog.value = false
}

async function nextStep() {
  if (!canContinue.value || submitting.value) return

  if (step.value < questions.length - 1) {
    step.value++
    return
  }

  submitting.value = true
  submitError.value = ''
  try {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
    const response = await fetch(`${apiBase}/api/applications`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: selectedType.value,
        answers: {
          age: String(answers.value.age).trim(),
          nationality: answers.value.nationality.trim(),
          timezone: answers.value.timezone.trim(),
          heardAbout: answers.value.heardAbout.trim(),
          experience: answers.value.experience.trim(),
          rules: answers.value.rules,
          charter: answers.value.charter.trim(),
        },
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'Ansökan kunde inte skickas. Kontrollera att du är inloggad med Discord.')
    submitted.value = true
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Ett okänt fel uppstod.'
  } finally {
    submitting.value = false
  }
}

function previousStep() {
  if (step.value > 0) step.value--
}

const canContinue = computed(() => {
  switch (step.value) {
    case 0:
      return (
        String(answers.value.age).trim() !== '' &&
        answers.value.nationality.trim() !== '' &&
        answers.value.timezone.trim() !== ''
      )
    case 1:
      return answers.value.heardAbout.trim() !== ''
    case 2:
      return answers.value.experience.trim() !== ''
    case 3:
      return answers.value.rules === 'yes'
    case 4:
      return answers.value.charter.trim() !== ''
    default:
      return false
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeApplication()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <main class="application-page">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="background-grid"></div>


    <section class="selection-section">
      <div class="eyebrow">
        <span class="eyebrow-line"></span>
        RECRUITMENT DIVISION
        <span class="eyebrow-line"></span>
      </div>

      <h1>YOUR NEXT STEP <span>STARTS HERE.</span></h1>

      <p class="intro">
        Choose the type of application you wish to submit.
        Select a category below to get started.
      </p>

      <div class="selection-cards">
        <button
          v-for="item in [
            {
              id: 'hangaround',
              number: '01',
              title: 'Hangaround',
              subtitle: 'INDIVIDUAL APPLICATION',
              description:
                'Apply to become a Hangaround and begin your journey with Devils Mercy.',
              icon: 'mdi-account-outline',
              tag: 'PERSONAL APPLICATION',
            },
            {
              id: 'charter',
              number: '02',
              title: 'Probationary Charter',
              subtitle: 'CHARTER APPLICATION',
              description:
                'Apply on behalf of your club for Probationary Charter status.',
              icon: 'mdi-shield-outline',
              tag: 'CLUB APPLICATION',
            },
          ]"
          :key="item.id"
          class="application-card"
          type="button"
          @click="openApplication(item.id as ApplicationType)"
        >
          <div class="card-topline">
            <span class="card-number">{{ item.number }}</span>
            <span class="card-tag">{{ item.tag }}</span>
          </div>

          <div class="card-icon">
            <v-icon :icon="item.icon" size="36" />
          </div>

          <div class="card-content">
            <span class="card-subtitle">{{ item.subtitle }}</span>
            <h2>{{ item.title }}</h2>
            <p>{{ item.description }}</p>
          </div>

          <div class="card-action">
            <span>SELECT APPLICATION</span>
            <span class="action-circle">
              <v-icon icon="mdi-arrow-up-right" size="21" />
            </span>
          </div>
        </button>
      </div>

      <div class="bottom-note">
        <v-icon icon="mdi-lock-outline" size="16" />
        <span>DEVILS MERCY · APPLICATIONS</span>
      </div>
    </section>


    <v-dialog
      v-model="dialog"
      max-width="740"
      width="calc(100% - 32px)"
      transition="dialog-transition"
      scrim="#000000"
      scrollable
    >
      <section v-if="selectedType" class="application-dialog">
        <div class="dialog-topline">
          <div class="dialog-brand">
            <span class="dialog-brand-dot"></span>
            DEVILS MERCY
          </div>

          <button
            class="close-button"
            type="button"
            aria-label="Close"
            @click="closeApplication"
          >
            <v-icon icon="mdi-close" size="21" />
          </button>
        </div>

        <template v-if="selectedType === 'hangaround' && !submitted">
          <div class="dialog-body">
            <span class="dialog-eyebrow">HANGAROUND APPLICATION</span>

            <div class="progress-meta">
              <span>STEP {{ step + 1 }} OF {{ questions.length }}</span>
              <span>{{ Math.round(progress) }}% COMPLETE</span>
            </div>

            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>

            <div class="question-heading">
              <span class="question-number">{{ currentQuestion.number }}</span>
              <div>
                <span class="question-category">{{ currentQuestion.title }}</span>
                <h2>{{ currentQuestion.question }}</h2>
                <p>{{ currentQuestion.description }}</p>
              </div>
            </div>

            <div class="answer-area">
              <template v-if="step === 0">
                <label class="field-label" for="age">Age</label>
                <input
                  id="age"
                  v-model="answers.age"
                  class="form-input"
                  type="number"
                  min="1"
                  max="120"
                  placeholder="Enter your age"
                />

                <label class="field-label" for="nationality">Nationality</label>
                <input
                  id="nationality"
                  v-model="answers.nationality"
                  class="form-input"
                  placeholder="Enter your nationality"
                />

                <label class="field-label" for="timezone">Timezone</label>
                <input
                  id="timezone"
                  v-model="answers.timezone"
                  class="form-input"
                  placeholder="e.g. GMT+1 / CET"
                />
              </template>

              <template v-else-if="step === 1">
                <label class="field-label" for="heard">
                  Your answer
                </label>
                <textarea
                  id="heard"
                  v-model="answers.heardAbout"
                  class="form-input form-textarea"
                  rows="4"
                  placeholder="Tell us how you heard about Devils Mercy..."
                ></textarea>
              </template>

              <template v-else-if="step === 2">
                <label class="field-label" for="experience">
                  Your roleplay experience
                </label>
                <textarea
                  id="experience"
                  v-model="answers.experience"
                  class="form-input form-textarea"
                  rows="6"
                  placeholder="List previous clubs, ranks held and reasons for leaving..."
                ></textarea>
              </template>

              <template v-else-if="step === 3">
                <div class="commitment-box">
                  <v-icon icon="mdi-information-outline" size="22" />
                  <p>
                    Everything is earned. Make sure you understand the
                    expectations before confirming.
                  </p>
                </div>

                <label class="choice-option">
                  <input
                    v-model="answers.rules"
                    type="radio"
                    value="yes"
                  />
                  <span>
                    <strong>Yes, I agree.</strong>
                    <small>I will follow all rules and understand everything is earned.</small>
                  </span>
                </label>

                <label class="choice-option">
                  <input
                    v-model="answers.rules"
                    type="radio"
                    value="no"
                  />
                  <span>
                    <strong>No, I do not agree.</strong>
                    <small>I do not accept these expectations.</small>
                  </span>
                </label>

                <p v-if="answers.rules === 'no'" class="validation-note">
                  You must agree to the requirements to continue.
                </p>
              </template>

              <template v-else-if="step === 4">
                <label class="field-label" for="charter">
                  Charter
                </label>
                <input
                  id="charter"
                  v-model="answers.charter"
                  class="form-input"
                  placeholder="Enter the Charter you are applying for"
                />
              </template>
            </div>

            <p v-if="submitError" class="submit-error" role="alert">{{ submitError }}</p>
            <div class="dialog-actions">
              <button
                v-if="step > 0"
                class="dialog-back-button"
                type="button"
                @click="previousStep"
              >
                <v-icon icon="mdi-arrow-left" size="18" />
                BACK
              </button>
              <span v-else></span>

              <button
                class="dialog-next-button"
                type="button"
                :disabled="!canContinue"
                @click="nextStep"
              >
                {{ submitting ? 'SUBMITTING…' : step === questions.length - 1 ? 'REVIEW COMPLETE' : 'CONTINUE' }}
                <v-icon icon="mdi-arrow-right" size="18" />
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="selectedType === 'hangaround' && submitted">
          <div class="dialog-body success-state">
            <div class="success-icon">
              <v-icon icon="mdi-check" size="34" />
            </div>
            <span class="dialog-eyebrow">APPLICATION SUBMITTED</span>
            <h2>Questions completed.</h2>
            <p>
              Your Hangaround application has been sent to the Devils Mercy leadership team for review. You will receive your decision through Discord.
            </p>

            <button
              class="dialog-next-button"
              type="button"
              @click="closeApplication"
            >
              CLOSE
              <v-icon icon="mdi-check" size="18" />
            </button>
          </div>
        </template>

        <template v-else>
          <div class="dialog-body">
            <span class="dialog-eyebrow">CHARTER APPLICATION</span>
            <div class="dialog-icon">
              <v-icon icon="mdi-shield-outline" size="32" />
            </div>
            <h2>Probationary Charter</h2>
            <p class="dialog-description">
              The questions for this application will be added when you send them.
            </p>
            <div class="form-placeholder">
              <v-icon
                icon="mdi-file-document-edit-outline"
                size="28"
                class="placeholder-icon"
              />
              <h3>Application form coming next</h3>
              <p>This form is being prepared.</p>
            </div>
            <button
              class="dialog-back-button"
              type="button"
              @click="closeApplication"
            >
              <v-icon icon="mdi-arrow-left" size="18" />
              BACK TO APPLICATION TYPES
            </button>
          </div>
        </template>

        <div class="dialog-footer">
          <span>DEVILS MERCY</span>
          <span>
            APPLICATION
            {{ selectedType === 'hangaround' ? '01' : '02' }}
          </span>
        </div>
      </section>
    </v-dialog>
  </main>
</template>

<style scoped>
.application-page {
  --red: #c51f30;
  --red-light: #e33142;
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  overflow: hidden;
  isolation: isolate;
  color: #f5f5f5;
  background:
    radial-gradient(ellipse at 50% 38%, #191013 0%, transparent 50%),
    #09090b;
  font-family: 'Inter', Arial, sans-serif;
}

.background-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  opacity: 0.16;
  background-image:
    linear-gradient(#ffffff08 1px, transparent 1px),
    linear-gradient(90deg, #ffffff08 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
}

.ambient {
  position: absolute;
  z-index: -1;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.13;
  pointer-events: none;
}

.ambient-one {
  top: 180px;
  left: -240px;
  background: #bd1528;
}

.ambient-two {
  top: 400px;
  right: -250px;
  background: #7c1420;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 27px clamp(22px, 6vw, 88px);
  border-bottom: 1px solid #ffffff10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 13px;
  color: inherit;
  text-decoration: none;
}

.brand-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.brand-name {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 2.5px;
}

.brand-caption {
  color: #88858a;
  font-size: 9px;
  letter-spacing: 1.8px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #aaa7ac;
  text-decoration: none;
  font-size: 12px;
}

.back-link:hover {
  color: white;
}

.selection-section {
  width: min(1080px, calc(100% - 40px));
  margin: auto;
  padding: 90px 0 70px;
}

.eyebrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--red-light);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 3px;
  text-align: center;
}

.eyebrow-line {
  width: 28px;
  height: 1px;
  background: var(--red);
}

.selection-section > h1 {
  margin: 25px 0 0;
  font-size: clamp(34px, 6vw, 65px);
  font-weight: 950;
  line-height: 1.08;
  letter-spacing: -2.5px;
  text-align: center;
}

.selection-section > h1 span {
  display: block;
  color: var(--red-light);
}

.intro {
  max-width: 540px;
  margin: 23px auto 0;
  color: #a6a2a8;
  font-size: 14px;
  line-height: 1.8;
  text-align: center;
}

.selection-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  margin-top: 55px;
}

.application-card {
  position: relative;
  display: flex;
  min-height: 350px;
  flex-direction: column;
  overflow: hidden;
  padding: 27px;
  border: 1px solid #ffffff17;
  border-radius: 9px;
  color: #f6f5f5;
  background:
    radial-gradient(ellipse at 100% 0%, #b71e2b12, transparent 55%),
    linear-gradient(145deg, #151416, #0d0c0e 80%);
  text-align: left;
  cursor: pointer;
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}

.application-card::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--red-light);
  content: '';
  transition: width 0.3s;
}

.application-card:hover {
  transform: translateY(-5px);
  border-color: #c51f3070;
  box-shadow: 0 20px 65px #0005;
}

.application-card:hover::before {
  width: 100%;
}

.application-card:focus-visible {
  outline: 2px solid var(--red-light);
  outline-offset: 4px;
}

.card-topline,
.card-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-number {
  color: #6f6b71;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

.card-tag {
  padding: 7px 9px;
  border: 1px solid #ffffff13;
  border-radius: 3px;
  color: #aaa4aa;
  font-size: 8px;
  letter-spacing: 1px;
}

.card-icon,
.dialog-icon {
  display: grid;
  width: 64px;
  height: 64px;
  margin-top: 32px;
  place-items: center;
  border: 1px solid #c51f3040;
  border-radius: 7px;
  color: var(--red-light);
  background: #c51f3010;
}

.card-subtitle {
  display: block;
  margin-top: 24px;
  color: #8d888f;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2px;
}

.card-content h2 {
  margin: 8px 0 0;
  font-size: clamp(21px, 2.7vw, 29px);
  font-weight: 850;
  letter-spacing: -0.8px;
}

.card-content p {
  max-width: 390px;
  margin: 12px 0 25px;
  color: #a5a0a7;
  font-size: 12px;
  line-height: 1.8;
}

.card-action {
  margin-top: auto;
  padding-top: 19px;
  border-top: 1px solid #ffffff12;
  color: #ddd8dd;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.action-circle {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #ffffff24;
  border-radius: 50%;
  transition: all 0.2s;
}

.application-card:hover .action-circle {
  border-color: var(--red);
  background: var(--red);
  transform: rotate(45deg);
}

.bottom-note {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  margin-top: 35px;
  color: #716d73;
  font-size: 9px;
  letter-spacing: 2px;
}

.page-footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 22px clamp(22px, 6vw, 88px);
  border-top: 1px solid #ffffff10;
  color: #777279;
  font-size: 9px;
  letter-spacing: 1.6px;
}

/* Popup */

.application-dialog {
  overflow: hidden;
  border: 1px solid #ffffff1a;
  border-radius: 10px;
  color: #f5f5f5;
  background:
    radial-gradient(ellipse at 50% 0%, #c51f3015, transparent 45%),
    #101012;
  box-shadow: 0 30px 100px #000a;
}

.dialog-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #ffffff12;
}

.dialog-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
}

.dialog-brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red-light);
  box-shadow: 0 0 12px #c51f3070;
}

.close-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #ffffff1a;
  border-radius: 5px;
  color: #aaa;
  background: #ffffff05;
  cursor: pointer;
}

.close-button:hover {
  border-color: #c51f3070;
  color: white;
  background: #c51f3018;
}

.dialog-body {
  padding: 35px clamp(22px, 6vw, 44px) 32px;
}

.dialog-eyebrow {
  color: var(--red-light);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2.5px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-top: 24px;
  color: #969199;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
}

.progress-track {
  height: 3px;
  margin-top: 11px;
  overflow: hidden;
  border-radius: 5px;
  background: #ffffff13;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--red-light);
  box-shadow: 0 0 12px #c51f3060;
  transition: width 0.25s;
}

.question-heading {
  display: grid;
  grid-template-columns: 43px 1fr;
  gap: 15px;
  margin-top: 33px;
}

.question-number {
  display: grid;
  width: 43px;
  height: 43px;
  place-items: center;
  border: 1px solid #c51f3050;
  border-radius: 5px;
  color: var(--red-light);
  font-size: 12px;
  font-weight: 900;
}

.question-category {
  color: #a5a0a7;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.7px;
  text-transform: uppercase;
}

.question-heading h2 {
  margin: 10px 0 0;
  color: #f5f5f5;
  font-size: clamp(20px, 4vw, 27px);
  font-weight: 850;
  line-height: 1.35;
  letter-spacing: -0.5px;
}

.question-heading p {
  margin: 10px 0 0;
  color: #969199;
  font-size: 12px;
  line-height: 1.7;
}

.answer-area {
  margin-top: 30px;
}

.field-label {
  display: block;
  margin: 17px 0 9px;
  color: #d8d3da;
  font-size: 11px;
  font-weight: 700;
}

.form-input {
  display: block;
  width: 100%;
  min-height: 47px;
  padding: 13px 14px;
  border: 1px solid #ffffff20;
  border-radius: 5px;
  outline: none;
  color: #f5f5f5;
  background: #08080980;
  font: inherit;
  font-size: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input::placeholder {
  color: #68636b;
}

.form-input:focus {
  border-color: #c51f30b0;
  box-shadow: 0 0 0 3px #c51f3015;
}

.form-textarea {
  min-height: 125px;
  resize: vertical;
  line-height: 1.7;
}

.commitment-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #c51f3035;
  border-radius: 5px;
  color: var(--red-light);
  background: #c51f300a;
}

.commitment-box p {
  margin: 0;
  color: #b9b3bc;
  font-size: 12px;
  line-height: 1.7;
}

.choice-option {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  margin-top: 13px;
  padding: 16px;
  border: 1px solid #ffffff1b;
  border-radius: 5px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.choice-option:has(input:checked) {
  border-color: #c51f3070;
  background: #c51f300d;
}

.choice-option input {
  margin-top: 4px;
  accent-color: var(--red-light);
}

.choice-option span {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.choice-option strong {
  color: #efebf0;
  font-size: 12px;
}

.choice-option small {
  color: #969199;
  font-size: 11px;
  line-height: 1.6;
}

.validation-note {
  margin: 12px 0 0;
  color: #f06b76;
  font-size: 11px;
}

.dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 30px;
  padding-top: 22px;
  border-top: 1px solid #ffffff12;
}

.dialog-back-button,
.dialog-next-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid #ffffff20;
  border-radius: 5px;
  color: #ded9df;
  background: transparent;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.dialog-back-button:hover {
  border-color: #c51f3070;
  background: #c51f3010;
}

.dialog-next-button {
  border-color: var(--red);
  color: white;
  background: var(--red);
}

.dialog-next-button:hover:not(:disabled) {
  border-color: var(--red-light);
  background: var(--red-light);
}

.dialog-next-button:disabled {
  border-color: #ffffff12;
  color: #777279;
  background: #ffffff08;
  cursor: not-allowed;
}

.form-placeholder {
  margin-top: 25px;
  padding: 27px 18px;
  border: 1px dashed #ffffff24;
  border-radius: 7px;
  background: #ffffff03;
  text-align: center;
}

.placeholder-icon {
  color: var(--red-light);
}

.form-placeholder h3 {
  margin: 12px 0 0;
  font-size: 15px;
  font-weight: 800;
}

.form-placeholder p {
  max-width: 350px;
  margin: 9px auto 0;
  color: #99949b;
  font-size: 12px;
  line-height: 1.8;
}

.dialog-description {
  margin: 13px auto 0;
  color: #a8a3aa;
  font-size: 13px;
  line-height: 1.8;
  text-align: center;
}

.dialog-icon {
  margin: 22px auto 17px;
}

.submit-error { color: #ff7b86; margin: 12px 0; font-size: 13px; }
.success-state {
  text-align: center;
}

.success-icon {
  display: grid;
  width: 66px;
  height: 66px;
  margin: 0 auto 22px;
  place-items: center;
  border: 1px solid #4b986c70;
  border-radius: 50%;
  color: #72d59a;
  background: #4b986c15;
}

.success-state h2 {
  margin: 16px 0 0;
  font-size: 27px;
  font-weight: 900;
}

.success-state p {
  max-width: 420px;
  margin: 14px auto 24px;
  color: #a8a3aa;
  font-size: 13px;
  line-height: 1.8;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 15px 24px;
  border-top: 1px solid #ffffff12;
  color: #777279;
  font-size: 8px;
  letter-spacing: 1.5px;
}

/* Premium application modal refresh */
.application-dialog {
  position: relative;
  border: 1px solid #ffffff20;
  border-radius: 16px;
  background:
    radial-gradient(ellipse at 50% -10%, #d5283b24 0%, transparent 48%),
    linear-gradient(145deg, #151518 0%, #0d0d0f 72%);
  box-shadow: 0 36px 110px #000d, 0 0 0 1px #0008, inset 0 1px 0 #ffffff0b;
}

.application-dialog::before {
  position: absolute;
  top: 0;
  right: 12%;
  left: 12%;
  height: 2px;
  border-radius: 0 0 10px 10px;
  background: linear-gradient(90deg, transparent, #e33142, transparent);
  content: "";
}

.dialog-topline {
  padding: 21px 28px;
  background: #ffffff02;
}

.dialog-brand {
  gap: 12px;
  font-size: 10px;
  letter-spacing: 2.6px;
}

.dialog-brand-dot {
  width: 9px;
  height: 9px;
  box-shadow: 0 0 0 5px #c51f3017, 0 0 18px #e3314280;
}

.close-button {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  transition: 0.2s ease;
}

.dialog-body {
  padding: 36px clamp(24px, 6vw, 50px) 34px;
}

.dialog-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 9px;
  letter-spacing: 2.3px;
}

.dialog-eyebrow::before {
  width: 18px;
  height: 1px;
  background: currentColor;
  content: "";
}

.progress-meta {
  margin-top: 26px;
  font-size: 9px;
  letter-spacing: 1.15px;
}

.progress-track {
  height: 4px;
  margin-top: 12px;
  border-radius: 99px;
  background: #ffffff0c;
}

.progress-fill {
  border-radius: 99px;
  box-shadow: 0 0 12px #e3314260;
}

.question-heading {
  grid-template-columns: 48px 1fr;
  gap: 17px;
  margin-top: 35px;
}

.question-number {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(145deg, #c51f301d, #c51f3005);
  box-shadow: inset 0 1px 0 #ffffff0b;
}

.question-heading h2 {
  margin-top: 9px;
  font-size: clamp(22px, 4vw, 29px);
  letter-spacing: -0.8px;
}

.question-heading p {
  max-width: 490px;
  font-size: 12px;
}

.answer-area {
  margin-top: 32px;
}

.field-label {
  margin: 18px 0 9px;
  color: #e1dce3;
  font-size: 11px;
  letter-spacing: 0.15px;
}

.form-input {
  min-height: 50px;
  padding: 14px 15px;
  border-color: #ffffff17;
  border-radius: 9px;
  background: #08080ab8;
  font-size: 12px;
}

.form-input:hover {
  border-color: #ffffff30;
}

.form-input:focus {
  border-color: #e33142b8;
  background: #0b090b;
  box-shadow: 0 0 0 4px #c51f3017;
}

.form-textarea {
  min-height: 138px;
}

.commitment-box,
.choice-option,
.form-placeholder {
  border-radius: 10px;
}

.commitment-box {
  padding: 17px;
  background: linear-gradient(110deg, #c51f3015, #c51f3005);
}

.choice-option {
  padding: 17px;
  background: #ffffff03;
}

.choice-option:hover {
  border-color: #ffffff35;
  background: #ffffff06;
}

.choice-option:has(input:checked) {
  border-color: #e33142a0;
  background: linear-gradient(110deg, #c51f3019, #c51f3008);
  box-shadow: inset 3px 0 0 #e33142;
}

.dialog-actions {
  margin-top: 34px;
  padding-top: 24px;
  border-top-color: #ffffff14;
}

.dialog-back-button,
.dialog-next-button {
  min-height: 48px;
  padding: 0 19px;
  border-radius: 9px;
  font-size: 10px;
  letter-spacing: 1.15px;
}

.dialog-back-button {
  background: #ffffff04;
}

.dialog-next-button {
  border-color: #d3273a;
  background: linear-gradient(135deg, #d3273a, #a91527);
  box-shadow: 0 7px 22px #c51f3025, inset 0 1px 0 #ffffff20;
}

.dialog-next-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 28px #c51f3040, inset 0 1px 0 #ffffff25;
}

.dialog-next-button:disabled {
  box-shadow: none;
}

.dialog-footer {
  padding: 16px 28px;
  background: #00000020;
  font-size: 8px;
  letter-spacing: 1.7px;
}

.success-icon {
  border-radius: 20px;
  box-shadow: 0 0 30px #4b986c12;
}

.success-state .dialog-next-button {
  min-width: 160px;
}

.form-placeholder {
  padding: 32px 20px;
  background: linear-gradient(145deg, #ffffff06, #ffffff02);
}

@media (max-width: 650px) {
  .page-header {
    padding: 20px;
  }

  .brand-caption {
    font-size: 7px;
    letter-spacing: 1px;
  }

  .back-link span {
    display: none;
  }

  .selection-section {
    padding: 65px 0 50px;
  }

  .selection-section > h1 {
    letter-spacing: -1.5px;
  }

  .intro {
    font-size: 13px;
  }

  .selection-cards {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-top: 35px;
  }

  .application-card {
    min-height: 310px;
    padding: 22px;
  }

  .page-footer {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .dialog-topline {
    padding: 16px 18px;
  }

  .dialog-body {
    padding: 28px 20px 25px;
  }

  .question-heading {
    grid-template-columns: 40px 1fr;
    gap: 12px;
    margin-top: 28px;
  }

  .question-number {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .dialog-actions {
    margin-top: 26px;
    padding-top: 18px;
  }

  .dialog-back-button,
  .dialog-next-button {
    min-height: 45px;
    padding: 0 13px;
  }

  .dialog-footer {
    padding: 14px 18px;
  }
}

/* Modern modal polish: restrained glass, clearer hierarchy, and responsive controls */
.application-dialog {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 22px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(197, 31, 48, 0.13), transparent 42%),
    linear-gradient(150deg, #17171b 0%, #101013 54%, #0c0c0f 100%);
  box-shadow: 0 42px 120px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(255,255,255,.025), inset 0 1px 0 rgba(255,255,255,.06);
  backdrop-filter: blur(24px);
}

.application-dialog::before {
  right: 7%;
  left: 7%;
  height: 2px;
  opacity: .95;
  background: linear-gradient(90deg, transparent, #f04455 30%, #a71326 70%, transparent);
}

.dialog-topline {
  min-height: 76px;
  padding: 17px 27px;
  border-bottom: 1px solid rgba(255,255,255,.065);
  background: linear-gradient(90deg, rgba(255,255,255,.025), transparent 70%);
}

.dialog-brand {
  color: #f1edf0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2.8px;
}

.dialog-brand-dot {
  background: #e33142;
  box-shadow: 0 0 0 5px rgba(227,49,66,.11), 0 0 20px rgba(227,49,66,.5);
}

.close-button {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 12px;
  color: #aaa6ad;
  background: rgba(255,255,255,.035);
  transition: color .18s ease, border-color .18s ease, background .18s ease, transform .18s ease;
}

.close-button:hover {
  transform: rotate(4deg);
  border-color: rgba(227,49,66,.45);
  color: #fff;
  background: rgba(197,31,48,.13);
}

.dialog-body {
  padding: 34px clamp(22px, 5vw, 46px) 32px;
  animation: modal-content-in .28s ease both;
}

.dialog-eyebrow {
  color: #f06a77;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2.15px;
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 25px;
  color: #99949e;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.15px;
}

.progress-meta span:last-child { color: #e8e1e5; }

.progress-track {
  height: 5px;
  margin-top: 11px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.035);
  border-radius: 99px;
  background: rgba(255,255,255,.07);
}

.progress-fill {
  min-width: 5px;
  background: linear-gradient(90deg, #941222, #e33142 65%, #ff6975);
  box-shadow: 0 0 16px rgba(227,49,66,.42);
  transition: width .3s cubic-bezier(.2,.75,.25,1);
}

.question-heading {
  align-items: start;
  margin-top: 31px;
}

.question-number {
  display: grid;
  place-items: center;
  border: 1px solid rgba(227,49,66,.23);
  color: #ff6675;
  font-size: 12px;
  font-weight: 800;
  background: linear-gradient(145deg, rgba(197,31,48,.16), rgba(197,31,48,.035));
}

.question-category {
  color: #a7a1ab;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.8px;
  text-transform: uppercase;
}

.question-heading h2 {
  margin-top: 7px;
  color: #f8f5f7;
  font-size: clamp(23px, 3.8vw, 31px);
  font-weight: 750;
  line-height: 1.15;
  letter-spacing: -1px;
}

.question-heading p {
  margin-top: 10px;
  color: #a5a0a9;
  font-size: 12px;
  line-height: 1.75;
}

.answer-area { margin-top: 28px; }

.field-label {
  display: block;
  margin: 17px 0 8px;
  color: #e4dfe5;
  font-size: 11px;
  font-weight: 650;
}

.form-input,
.form-textarea {
  width: 100%;
  border: 1px solid rgba(255,255,255,.105);
  border-radius: 12px;
  outline: none;
  color: #f8f5f7;
  background: rgba(5,5,7,.58);
  transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
}

.form-input { min-height: 52px; padding: 14px 16px; }
.form-textarea { padding: 15px 16px; }
.form-input::placeholder,
.form-textarea::placeholder { color: #66616b; }

.form-input:hover,
.form-textarea:hover { border-color: rgba(255,255,255,.2); }

.form-input:focus,
.form-textarea:focus {
  border-color: rgba(227,49,66,.8);
  background: rgba(12,9,12,.95);
  box-shadow: 0 0 0 4px rgba(197,31,48,.12), 0 8px 25px rgba(0,0,0,.12);
}

.commitment-box,
.choice-option,
.form-placeholder {
  border: 1px solid rgba(255,255,255,.085);
  border-radius: 13px;
}

.commitment-box {
  padding: 18px;
  color: #d9d3dc;
  background: linear-gradient(120deg, rgba(197,31,48,.11), rgba(255,255,255,.018));
}

.choice-option {
  position: relative;
  padding: 17px 18px;
  background: rgba(255,255,255,.025);
  transition: border-color .18s ease, background .18s ease, transform .18s ease;
}

.choice-option:hover {
  transform: translateY(-1px);
  border-color: rgba(255,255,255,.22);
  background: rgba(255,255,255,.045);
}

.choice-option:has(input:checked) {
  border-color: rgba(227,49,66,.7);
  background: linear-gradient(105deg, rgba(197,31,48,.15), rgba(197,31,48,.045));
  box-shadow: inset 3px 0 0 #e33142, 0 8px 24px rgba(0,0,0,.12);
}

.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 31px;
  padding-top: 22px;
  border-top: 1px solid rgba(255,255,255,.085);
}

.dialog-back-button,
.dialog-next-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 49px;
  padding: 0 19px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease, opacity .18s ease;
}

.dialog-back-button {
  border: 1px solid rgba(255,255,255,.1);
  color: #d1cbd3;
  background: rgba(255,255,255,.035);
}

.dialog-back-button:hover {
  border-color: rgba(255,255,255,.22);
  color: #fff;
  background: rgba(255,255,255,.07);
}

.dialog-next-button {
  border: 1px solid rgba(255,105,117,.38);
  color: #fff;
  background: linear-gradient(135deg, #d92d40, #a91427);
  box-shadow: 0 8px 22px rgba(197,31,48,.22), inset 0 1px 0 rgba(255,255,255,.17);
}

.dialog-next-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(197,31,48,.3), inset 0 1px 0 rgba(255,255,255,.2);
}

.dialog-next-button:active:not(:disabled) { transform: translateY(0); }
.dialog-next-button:disabled { opacity: .34; cursor: not-allowed; box-shadow: none; }

.dialog-footer {
  padding: 15px 27px;
  border-top: 1px solid rgba(255,255,255,.065);
  color: #77717b;
  background: rgba(0,0,0,.17);
  font-weight: 700;
}

.success-state { text-align: center; }
.success-state .dialog-eyebrow { justify-content: center; }
.success-state .dialog-next-button { min-width: 160px; margin-top: 20px; }

.success-icon {
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  margin: 0 auto 24px;
  border: 1px solid rgba(99,201,143,.28);
  border-radius: 22px;
  color: #82e0a8;
  background: rgba(68,165,109,.1);
  box-shadow: 0 0 35px rgba(68,165,109,.08);
}

.form-placeholder {
  padding: 30px 20px;
  background: linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.012));
}

@keyframes modal-content-in {
  from { opacity: 0; transform: translateY(7px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 650px) {
  .application-dialog { border-radius: 18px; }
  .dialog-topline { min-height: 66px; padding: 13px 17px; }
  .dialog-body { padding: 25px 18px 22px; }
  .progress-meta { font-size: 8px; }
  .question-heading { margin-top: 25px; }
  .question-heading h2 { font-size: 24px; }
  .dialog-actions { margin-top: 25px; padding-top: 18px; }
  .dialog-back-button, .dialog-next-button { min-height: 46px; padding: 0 13px; font-size: 9px; }
  .dialog-footer { padding: 13px 17px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
