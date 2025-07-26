<template>
  <div class="App">
    <LiveAPIProvider :options="apiOptions">
      <div class="streaming-console">
        <SidePanel />
        <main>
          <div class="main-app-area">
            <!-- APP goes here -->
            <Altair />
          </div>

          <ControlTray
            :enable-editing-settings="true"
          >
            <!-- put your own buttons here -->
          </ControlTray>
        </main>
      </div>
    </LiveAPIProvider>
  </div>
</template>

<script setup lang="ts">
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import './App.scss'
import LiveAPIProvider from './contexts/LiveAPIContext.vue'
import SidePanel from './components/side-panel/SidePanel.vue'
import Altair from './components/altair/Altair.vue'
import ControlTray from './components/control-tray/ControlTray.vue'
import { type LiveClientOptions } from './types'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
if (typeof API_KEY !== 'string') {
  throw new Error('set VITE_GEMINI_API_KEY in .env')
}

const apiOptions: LiveClientOptions = {
  apiKey: API_KEY,
}
</script>
