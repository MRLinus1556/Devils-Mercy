<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getAuthStatus,
  loginWithDiscord,
  logoutFromDiscord,
  type DiscordUser,
} from '@/services/auth'

const discordUser = ref<DiscordUser | null>(null)
const authLoading = ref(true)
const authError = ref('')
const menuOpen = ref(false)
const isLoggedIn = computed(() => discordUser.value !== null)

const navigation = computed(() => {
  const publicLinks = [
    { label: 'Home', path: '/' },
    { label: 'Charters', path: '/charters' },
  ]

  if (!isLoggedIn.value) return publicLinks

  return [
    { label: 'Home', path: '/' },
    { label: 'Organization', path: '/organisation' },
    { label: 'Charters', path: '/charters' },
    { label: 'Members', path: '/members' },
    { label: 'Media', path: '/media' },
  ]
})

const destinations = computed(() => {
  const charter = {
    number: '01',
    title: 'Our Charters',
    description: 'Explore our charters and their presence across connected roleplay servers.',
    path: '/charters',
    icon: 'mdi-shield-outline',
  }

  if (!isLoggedIn.value) return [charter]

  return [
    {
      number: '01',
      title: 'Organization',
      description: 'Discover the structure, identity and organization behind Devils Mercy MC.',
      path: '/organisation',
      icon: 'mdi-sitemap-outline',
    },
    charter,
    {
      number: '03',
      title: 'Members',
      description: 'Explore the club directory and its registered members.',
      path: '/members',
      icon: 'mdi-account-group-outline',
    },
    {
      number: '04',
      title: 'Applications',
      description: 'Learn about joining the club and submitting an application.',
      path: '/ansok',
      icon: 'mdi-file-document-outline',
    },
  ]
})

const closeMenu = () => {
  menuOpen.value = false
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
  try {
    await logoutFromDiscord()
    discordUser.value = null
    closeMenu()
    window.location.href = '/'
  } catch {
    authError.value = 'Det gick inte att logga ut. Försök igen.'
  }
}
</script>

<template>
  <div class="site-shell">
  

    <div v-if="authError" class="auth-error" role="alert">{{ authError }}</div>

    <main>
      <section class="hero">
        <div class="hero-image" aria-hidden="true"></div>
        <div class="hero-overlay" aria-hidden="true"></div>
        <div class="hero-content">
          <div class="eyebrow"><span class="eyebrow-line"></span> FIVEM ROLEPLAY ORGANIZATION</div>
          <h1>DEVILS <span>MERCY</span></h1>
          <div class="hero-divider">
            <span></span><v-icon icon="mdi-shield-outline" size="18" /><span></span>
          </div>
          <p class="hero-tagline">BROTHERHOOD. LOYALTY. RESPECT.</p>
          <p class="hero-description">
            An independent motorcycle club built around its members, its identity and the stories created in roleplay.
          </p>
          <div class="hero-actions">
            <RouterLink v-if="isLoggedIn" to="/organisation" class="button-primary">
              EXPLORE THE CLUB <v-icon icon="mdi-arrow-right" size="18" />
            </RouterLink>
            <button v-else class="button-primary" type="button" @click="loginWithDiscord">
              LOGIN WITH DISCORD <v-icon icon="mdi-discord" size="18" />
            </button>
            <RouterLink to="/charters" class="button-secondary">DISCOVER OUR CHARTERS</RouterLink>
          </div>
        </div>
        <div class="hero-bottom">
          <div class="hero-location"><v-icon icon="mdi-map-marker-outline" size="17" /><span>DEVILS MERCY MC</span></div>
          <div class="hero-scroll"><span>SCROLL TO EXPLORE</span><v-icon icon="mdi-arrow-down" size="17" /></div>
        </div>
        <div class="hero-index"><span>01</span><span class="hero-index-line"></span><span>04</span></div>
      </section>

      <section class="introduction section-padding">
        <div class="section-label"><span>01</span><span class="section-label-line"></span> WHO WE ARE</div>
        <div class="intro-grid">
          <div class="intro-heading"><h2>MORE THAN <span>A PATCH.</span></h2></div>
          <div class="intro-copy">
            <p class="intro-lead">Devils Mercy MC is a motorcycle club created for immersive FiveM roleplay.</p>
            <p>This is the official place to explore the club's public charter information. Members-only areas become available after Discord login.</p>
            <RouterLink to="/charters" class="text-link">DISCOVER OUR CHARTERS <v-icon icon="mdi-arrow-right" size="18" /></RouterLink>
          </div>
        </div>
        <div class="intro-image">
          <img src="/images/intro.png" alt="Devils Mercy MC" />
          <div class="image-caption"><span>DEVILS MERCY MC</span><span>OFFICIAL ROLEPLAY WEBSITE</span></div>
        </div>
      </section>

      <section class="destinations section-padding">
        <div class="section-heading-row">
          <div>
            <div class="section-label"><span>02</span><span class="section-label-line"></span> EXPLORE DEVILS MERCY</div>
            <h2 class="section-title">INSIDE THE <span>CLUB.</span></h2>
          </div>
          <p class="section-heading-description">Discover the club's public charter information, with more areas available to signed-in members.</p>
        </div>
        <div class="destination-grid">
          <RouterLink v-for="destination in destinations" :key="destination.number" :to="destination.path" class="destination-card">
            <div class="destination-image">
              <img src="/images/logo.png" alt="" class="destination-image-placeholder" />
              <span class="destination-number">{{ destination.number }}</span>
              <span class="destination-icon"><v-icon :icon="destination.icon" size="23" /></span>
            </div>
            <div class="destination-content">
              <h3>{{ destination.title }}</h3>
              <p>{{ destination.description }}</p>
              <span class="destination-link">EXPLORE <v-icon icon="mdi-arrow-top-right" size="17" /></span>
            </div>
          </RouterLink>
        </div>
      </section>

      <section class="club-statement">
        <div class="statement-image" aria-hidden="true"></div>
        <div class="statement-overlay" aria-hidden="true"></div>
        <div class="statement-content">
          <div class="section-label"><span>03</span><span class="section-label-line"></span> THE DEVILS MERCY IDENTITY</div>
          <h2>BUILT ON <span>LOYALTY.</span></h2>
          <p>A club identity shaped by the members, the choices they make and the roleplay stories they create together.</p>
          <RouterLink to="/charters" class="button-primary">EXPLORE OUR CHARTERS <v-icon icon="mdi-arrow-right" size="18" /></RouterLink>
        </div>
      </section>

      <section class="application-section section-padding">
        <div class="application-panel">
          <div class="application-image" aria-hidden="true"></div>
          <div class="application-content">
            <div class="section-label"><span>04</span><span class="section-label-line"></span> MEMBER ACCESS</div>
            <h2>STEP INTO <span>THE CLUB.</span></h2>
            <p>Sign in with Discord to access the member areas of the Devils Mercy MC website.</p>
            <button v-if="!isLoggedIn" class="button-primary" type="button" @click="loginWithDiscord">
              LOGIN WITH DISCORD <v-icon icon="mdi-discord" size="18" />
            </button>
            <RouterLink v-else to="/members" class="button-primary">
              OPEN MEMBERS <v-icon icon="mdi-arrow-right" size="18" />
            </RouterLink>
          </div>
          <div class="application-mark"><img src="/images/logo.png" alt="Devils Mercy MC" /></div>
        </div>
      </section>
    </main>

  
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --page-bg: #090909;
  --panel-bg: #111111;
  --panel-raised: #171717;
  --text-main: #f3f0ed;
  --text-muted: #a19b97;
  --red: #8b0000;
  --red-light: #bb2424;
  --border: rgba(255, 255, 255, 0.11);
  --content-width: 1440px;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; background: var(--page-bg); }
body { margin: 0; min-width: 320px; background: var(--page-bg); color: var(--text-main); font-family: 'Inter', sans-serif; }
body, button, a { -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button { font: inherit; cursor: pointer; }
.site-shell { min-height: 100vh; overflow: hidden; background: var(--page-bg); }
.site-header { position: relative; z-index: 20; display: flex; min-height: 88px; align-items: center; justify-content: space-between; gap: 32px; padding: 0 6.2%; border-bottom: 1px solid var(--border); background: #090909; }
.brand { display: inline-flex; flex-shrink: 0; align-items: center; gap: 12px; }
.brand-logo { display: block; width: 48px; height: 48px; object-fit: contain; }
.brand-copy { display: flex; flex-direction: column; gap: 3px; }
.brand-name { font-family: 'Barlow Condensed', sans-serif; font-size: 23px; font-weight: 800; letter-spacing: 1.7px; line-height: 1; }
.brand-subtitle { color: #a69d98; font-size: 9px; font-weight: 600; letter-spacing: 2.8px; }
.desktop-nav { display: flex; align-items: center; gap: clamp(18px, 2.6vw, 42px); }
.nav-link { position: relative; padding: 34px 0; color: #bcb6b1; font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; transition: color 180ms ease; }
.nav-link::after { position: absolute; right: 0; bottom: 23px; left: 0; height: 2px; background: var(--red-light); content: ''; transform: scaleX(0); transform-origin: left; transition: transform 180ms ease; }
.nav-link:hover, .nav-link-active { color: #fff; }
.nav-link-active::after, .nav-link:hover::after { transform: scaleX(1); }
.header-actions { display: flex; flex-shrink: 0; align-items: center; gap: 12px; }
.header-cta, .button-primary, .button-secondary { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; gap: 13px; padding: 0 19px; border: 0; font-size: 10px; font-weight: 700; letter-spacing: 1.15px; transition: background 180ms ease, border-color 180ms ease, transform 180ms ease; }
.header-cta, .button-primary { background: var(--red); color: #fff; }
.header-cta:hover, .button-primary:hover { background: var(--red-light); transform: translateY(-2px); }
.auth-loading { color: #bcb6b1; font-size: 9px; letter-spacing: 1px; }
.mobile-menu-button { display: none; width: 42px; height: 42px; align-items: center; justify-content: center; border: 1px solid var(--border); background: transparent; color: #fff; }
.mobile-nav { position: absolute; top: 100%; right: 0; left: 0; display: flex; flex-direction: column; padding: 14px 6% 24px; border-bottom: 1px solid var(--border); background: #0d0d0d; }
.mobile-nav-link { display: flex; min-height: 52px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); color: #e8e3df; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
.mobile-apply-link { margin-top: 16px; padding: 15px; border: 0; background: var(--red); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-align: center; text-transform: uppercase; }
.mobile-menu-enter-active, .mobile-menu-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
.mobile-menu-enter-from, .mobile-menu-leave-to { opacity: 0; transform: translateY(-8px); }
.auth-error { padding: 12px 6.2%; border-bottom: 1px solid rgba(187, 36, 36, .5); background: #1a0b0b; color: #f3b4b4; font-size: 12px; }
.hero { position: relative; display: flex; min-height: min(760px, calc(100svh - 88px)); align-items: center; padding: 100px 11%; isolation: isolate; background: #090909; }
.hero-image, .hero-overlay, .statement-image, .statement-overlay, .application-image { position: absolute; z-index: -1; inset: 0; }
.hero-image { background-image: url('/images/hero.png'); background-position: center; background-size: cover; filter: saturate(.5); opacity: .5; }
.hero-overlay { background: linear-gradient(90deg, #090909 0%, rgba(9,9,9,.92) 26%, rgba(9,9,9,.45) 68%, rgba(9,9,9,.25) 100%), linear-gradient(0deg, #090909 0%, transparent 25%, transparent 75%, rgba(9,9,9,.35) 100%); }
.hero-content { width: 100%; max-width: 800px; padding-bottom: 28px; }
.eyebrow, .section-label { display: flex; align-items: center; gap: 12px; color: #c3bbb5; font-size: 10px; font-weight: 600; letter-spacing: 2px; }
.eyebrow-line, .section-label-line { width: 34px; height: 2px; flex-shrink: 0; background: var(--red-light); }
.hero h1 { margin: 25px 0 9px; font-family: 'Barlow Condensed', sans-serif; font-size: clamp(88px, 13.5vw, 178px); font-weight: 900; letter-spacing: -3px; line-height: .72; }
.hero h1 span { display: block; margin-top: 17px; color: var(--red-light); }
.hero-divider { display: flex; width: 260px; align-items: center; gap: 12px; margin: 32px 0 22px; color: #a9a09b; }
.hero-divider span { height: 1px; flex: 1; background: rgba(255,255,255,.24); }
.hero-tagline { margin: 0 0 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 23px; font-weight: 700; letter-spacing: 4px; }
.hero-description { max-width: 460px; margin: 0; color: #b7b0aa; font-size: 13px; line-height: 1.9; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
.button-primary { min-height: 52px; padding: 0 22px; }
.button-secondary { min-height: 52px; border: 1px solid rgba(255,255,255,.28); background: rgba(0,0,0,.18); color: #f2eeeb; }
.button-secondary:hover { border-color: var(--red-light); background: rgba(139,0,0,.15); }
.hero-bottom { position: absolute; right: 6.2%; bottom: 30px; left: 6.2%; display: flex; align-items: center; justify-content: space-between; gap: 20px; color: #b5ada7; font-size: 9px; font-weight: 600; letter-spacing: 1.6px; }
.hero-location, .hero-scroll { display: flex; align-items: center; gap: 9px; }
.hero-location .v-icon { color: var(--red-light); }
.hero-index { position: absolute; top: 50%; right: 4%; display: flex; align-items: center; gap: 10px; color: #d0c7c1; font-size: 9px; letter-spacing: 1px; transform: rotate(90deg) translateX(50%); }
.hero-index-line { width: 45px; height: 1px; background: var(--red-light); }
.section-padding { padding: 105px 10%; }
.section-label > span:first-child { color: var(--red-light); }
.introduction { max-width: var(--content-width); margin: 0 auto; }
.intro-grid { display: grid; grid-template-columns: 1fr .8fr; gap: 8%; align-items: start; margin-top: 34px; }
.intro-heading h2, .section-title, .statement-content h2, .application-content h2 { margin: 0; font-family: 'Barlow Condensed', sans-serif; font-size: clamp(48px, 6vw, 78px); font-weight: 800; letter-spacing: -1px; line-height: .95; }
.intro-heading h2 span, .section-title span, .statement-content h2 span, .application-content h2 span { color: var(--red-light); }
.intro-copy { padding-top: 5px; }
.intro-lead { margin: 0 0 18px; color: #f1ece8; font-size: 17px; font-weight: 600; line-height: 1.7; }
.intro-copy > p:not(.intro-lead) { margin: 0; color: var(--text-muted); font-size: 12px; line-height: 2; }
.text-link { display: inline-flex; align-items: center; gap: 12px; margin-top: 26px; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 1.3px; }
.text-link .v-icon { color: var(--red-light); transition: transform 180ms ease; }
.text-link:hover .v-icon { transform: translateX(5px); }
.intro-image { position: relative; height: 300px; margin-top: 55px; overflow: hidden; border: 1px solid var(--border); background: #141414; }
.intro-image img { width: 100%; height: 100%; object-fit: cover; opacity: .6; filter: saturate(.5); }
.image-caption { position: absolute; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 18px 22px; background: linear-gradient(transparent, rgba(0,0,0,.9)); color: #f3eeea; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; }
.destinations { border-top: 1px solid var(--border); background: #0d0d0d; }
.section-heading-row { display: flex; align-items: end; justify-content: space-between; gap: 40px; margin-bottom: 42px; }
.section-title { margin-top: 24px; font-size: clamp(45px, 5vw, 68px); }
.section-heading-description { max-width: 340px; margin: 0 0 4px; color: var(--text-muted); font-size: 12px; line-height: 1.9; }
.destination-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.destination-card { display: flex; min-width: 0; flex-direction: column; border: 1px solid var(--border); background: #111; transition: border-color 180ms ease, transform 180ms ease, background 180ms ease; }
.destination-card:hover { border-color: rgba(187,36,36,.7); background: #151313; transform: translateY(-5px); }
.destination-image { position: relative; height: 175px; overflow: hidden; background: #1b1717; }
.destination-image::after { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,.7), transparent 70%); content: ''; }
.destination-image-placeholder { width: 100%; height: 100%; object-fit: cover; opacity: .55; filter: saturate(.45); transition: opacity 180ms ease, transform 350ms ease; }
.destination-card:hover .destination-image-placeholder { opacity: .8; transform: scale(1.05); }
.destination-number, .destination-icon { position: absolute; z-index: 1; }
.destination-number { top: 15px; left: 16px; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 700; }
.destination-icon { right: 15px; bottom: 15px; display: flex; width: 38px; height: 38px; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.3); background: rgba(0,0,0,.55); color: #fff; }
.destination-content { display: flex; flex: 1; flex-direction: column; padding: 22px 19px 20px; }
.destination-content h3 { margin: 0 0 11px; font-family: 'Barlow Condensed', sans-serif; font-size: 26px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
.destination-content p { flex: 1; margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.9; }
.destination-link { display: flex; align-items: center; justify-content: space-between; margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--border); color: #eee8e4; font-size: 9px; font-weight: 700; letter-spacing: 1.3px; }
.destination-link .v-icon { color: var(--red-light); }
.club-statement { position: relative; display: flex; min-height: 440px; align-items: center; padding: 90px 11%; isolation: isolate; background: #0a0a0a; }
.statement-image { background-image: url('/images/statement.png'); background-position: center; background-size: cover; filter: saturate(.35); opacity: .42; }
.statement-overlay { background: linear-gradient(90deg, #090909 0%, rgba(9,9,9,.92) 35%, rgba(9,9,9,.45) 100%); }
.statement-content { width: 100%; max-width: 620px; }
.statement-content h2 { margin-top: 30px; font-size: clamp(55px, 7vw, 88px); }
.statement-content > p, .application-content > p { max-width: 480px; margin: 23px 0 26px; color: #c0b8b2; font-size: 12px; line-height: 2; }
.application-section { padding-top: 80px; padding-bottom: 90px; }
.application-panel { position: relative; min-height: 340px; overflow: hidden; border: 1px solid var(--border); background: #121010; isolation: isolate; }
.application-image { background-image: url('/images/brazil.png'); background-position: center; background-size: cover; filter: saturate(.35); opacity: .25; }
.application-content { position: relative; z-index: 1; max-width: 720px; padding: 55px; }
.application-content h2 { margin-top: 27px; font-size: clamp(42px, 5.5vw, 66px); }
.application-content > p { max-width: 450px; margin-top: 20px; }
.application-mark { position: absolute; top: 50%; right: 6%; display: flex; width: 200px; height: 200px; align-items: center; justify-content: center; opacity: .5; transform: translateY(-50%); }
.application-mark img { width: 100%; height: 100%; object-fit: contain; }
.site-footer { padding: 45px 6.2% 0; border-top: 1px solid var(--border); background: #070707; }
.footer-main { display: flex; align-items: center; justify-content: space-between; gap: 35px; padding-bottom: 35px; }
.footer-description { max-width: 280px; margin: 0; color: #918983; font-size: 10px; line-height: 1.9; }
.footer-nav { display: flex; flex-wrap: wrap; gap: 22px; }
.footer-nav a { color: #c0b8b2; font-size: 10px; font-weight: 600; transition: color 180ms ease; }
.footer-nav a:hover { color: var(--red-light); }
.footer-bottom { display: flex; min-height: 58px; align-items: center; justify-content: space-between; gap: 20px; border-top: 1px solid var(--border); color: #807872; font-size: 9px; font-weight: 600; letter-spacing: .8px; }
.footer-bottom a { color: #d1c8c2; }
@media (min-width: 1600px) { .hero { padding-right: max(11%, calc((100vw - 1300px) / 2)); padding-left: max(11%, calc((100vw - 1300px) / 2)); } }
@media (max-width: 1200px) { .site-header { gap: 20px; padding-right: 4%; padding-left: 4%; } .desktop-nav { gap: 18px; } .header-cta { padding: 0 13px; font-size: 9px; } .section-padding { padding-right: 6%; padding-left: 6%; } .destination-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .destination-image { height: 210px; } }
@media (max-width: 900px) { .site-header { min-height: 76px; } .desktop-nav { display: none; } .header-cta { min-height: 42px; } .mobile-menu-button { display: flex; } .hero { min-height: 690px; padding: 90px 8%; } .hero h1 { font-size: clamp(88px, 16vw, 140px); } .hero-index { display: none; } .intro-grid { grid-template-columns: 1fr; gap: 26px; } .intro-copy { max-width: 580px; } .intro-image { margin-top: 35px; } .section-heading-row { align-items: start; flex-direction: column; gap: 18px; } .section-heading-description { max-width: 480px; } .application-mark { right: 3%; width: 145px; height: 145px; opacity: .25; } .footer-main { align-items: flex-start; flex-direction: column; gap: 22px; } }
@media (max-width: 600px) { .site-header { min-height: 70px; padding: 0 5%; } .brand { gap: 9px; } .brand-logo { width: 40px; height: 40px; } .brand-name { font-size: 20px; } .brand-subtitle { font-size: 8px; letter-spacing: 2px; } .header-cta, .auth-loading { display: none; } .hero { min-height: 670px; align-items: center; padding: 80px 6% 110px; } .hero-overlay { background: linear-gradient(90deg, rgba(9,9,9,.92), rgba(9,9,9,.55)), linear-gradient(0deg, #090909, transparent 55%); } .hero h1 { margin-top: 27px; font-size: clamp(78px, 20vw, 115px); letter-spacing: -2px; } .hero-tagline { font-size: 18px; letter-spacing: 2px; } .hero-description { font-size: 12px; } .hero-actions { align-items: stretch; flex-direction: column; } .hero-actions a, .hero-actions button { width: 100%; } .hero-bottom { right: 6%; bottom: 20px; left: 6%; align-items: flex-start; flex-direction: column; gap: 12px; font-size: 8px; } .section-padding { padding: 70px 6%; } .intro-heading h2, .section-title { font-size: 53px; } .intro-lead { font-size: 15px; } .intro-image { height: 230px; } .image-caption { align-items: flex-start; flex-direction: column; gap: 7px; padding: 15px; font-size: 8px; } .destination-grid { grid-template-columns: 1fr; gap: 15px; } .destination-image { height: 220px; } .destination-content { padding: 22px; } .destination-content h3 { font-size: 28px; } .club-statement { min-height: 400px; padding: 75px 6%; } .statement-content h2 { font-size: 59px; } .application-section { padding-top: 55px; padding-bottom: 65px; } .application-content { padding: 35px 24px; } .application-content h2 { font-size: 46px; } .application-mark { top: auto; right: 8px; bottom: 10px; width: 100px; height: 100px; transform: none; } .site-footer { padding: 35px 6% 0; } .footer-nav { gap: 16px; } .footer-bottom { align-items: flex-start; flex-direction: column; justify-content: center; gap: 12px; padding: 18px 0; font-size: 8px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }
</style>
