<template>
  <section class="control-tray">
    <nav :class="cn('actions-nav', { disabled: !connected })">
      <button
        :class="cn('action-button mic-button')"
        @click="setMuted(!muted)"
      >
        <span v-if="!muted" class="material-symbols-outlined filled">mic</span>
        <span v-else class="material-symbols-outlined filled">mic_off</span>
      </button>

      <div class="action-button no-action outlined">
        <AudioPulse :volume="volume" :active="connected" :hover="false" />
      </div>

      <slot />
    </nav>

    <div :class="cn('connection-container', { connected })">
      <div class="connection-button-container">
        <button
          ref="connectButtonRef"
          :class="cn('action-button connect-toggle', { connected })"
          @click="connected ? disconnect() : connect()"
        >
          <span class="material-symbols-outlined filled">
            {{ connected ? 'pause' : 'play_arrow' }}
          </span>
        </button>
      </div>
      <span class="text-indicator">Streaming</span>
    </div>
    <SettingsDialog v-if="props.enableEditingSettings" />
  </section>
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

import cn from 'classnames'
import { onUnmounted, ref, watch } from 'vue'
import { useLiveAPIContext } from '../../composables/useLiveAPIContext'
import { AudioRecorder } from '../../lib/audio-recorder'
import AudioPulse from '../audio-pulse/AudioPulse.vue'
import './control-tray.scss'
import SettingsDialog from '../settings-dialog/SettingsDialog.vue'

export interface ControlTrayProps {
  enableEditingSettings?: boolean
}

const props = withDefaults(defineProps<ControlTrayProps>(), {
  enableEditingSettings: false
})

const inVolume = ref(0)
const audioRecorder = ref(new AudioRecorder())
const muted = ref(false)
const connectButtonRef = ref<HTMLButtonElement | null>(null)

const { client, connected, connect, disconnect, volume } = useLiveAPIContext()

// Focus connect button when not connected
watch(connected, (isConnected) => {
  if (!isConnected && connectButtonRef.value) {
    connectButtonRef.value.focus()
  }
})

// Update CSS volume property
watch(inVolume, (vol) => {
  document.documentElement.style.setProperty(
    '--volume',
    `${Math.max(5, Math.min(vol * 200, 8))}px`
  )
})

// Audio recording setup
watch([connected, muted], ([isConnected, isMuted]) => {
  const onData = (base64: string) => {
    client.sendRealtimeInput([
      {
        mimeType: 'audio/pcm;rate=16000',
        data: base64,
      },
    ])
  }

  if (isConnected && !isMuted && audioRecorder.value) {
    audioRecorder.value.on('data', onData).on('volume', (vol: number) => {
      inVolume.value = vol
    }).start()
  } else {
    audioRecorder.value.stop()
  }
})

onUnmounted(() => {
  if (audioRecorder.value) {
    audioRecorder.value.stop()
  }
})

const setMuted = (newMuted: boolean) => {
  muted.value = newMuted
}
</script>