import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'devilsMercy',
    themes: {
      devilsMercy: {
        dark: true,
        colors: {
          background: '#090909',
          surface: '#141414',
          primary: '#8B0000',
          secondary: '#B8A0A0',
          error: '#CF3030',
          info: '#78909C',
          success: '#4CAF50',
          warning: '#D4A017',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')