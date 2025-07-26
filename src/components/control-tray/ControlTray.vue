<template>
  <section class="control-tray">
    <canvas style="display: none" ref="renderCanvasRef" />
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

      <template v-if="supportsVideo">
        <button
          v-if="screenCapture.isStreaming.value"
          class="action-button"
          @click="changeStreams()"
        >
          <span class="material-symbols-outlined">cancel_presentation</span>
        </button>
        <button
          v-else
          class="action-button"
          @click="changeStreams(screenCapture)"
        >
          <span class="material-symbols-outlined">present_to_all</span>
        </button>
        
        <button
          v-if="webcam.isStreaming.value"
          class="action-button"
          @click="changeStreams()"
        >
          <span class="material-symbols-outlined">videocam_off</span>
        </button>
        <button
          v-else
          class="action-button"
          @click="changeStreams(webcam)"
        >
          <span class="material-symbols-outlined">videocam</span>
        </button>
      </template>
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
    <SettingsDialog v-if="enableEditingSettings" />
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
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useLiveAPIContext } from '../../composables/useLiveAPIContext'
import { UseMediaStreamResult } from '../../hooks/use-media-stream-mux'
import { useScreenCapture } from '../../composables/useScreenCapture'
import { useWebcam } from '../../composables/useWebcam'
import { AudioRecorder } from '../../lib/audio-recorder'
import AudioPulse from '../audio-pulse/AudioPulse.vue'
import './control-tray.scss'
import SettingsDialog from '../settings-dialog/SettingsDialog.vue'

export interface ControlTrayProps {
  videoRef: HTMLVideoElement | null
  supportsVideo: boolean
  enableEditingSettings?: boolean
}

const props = withDefaults(defineProps<ControlTrayProps>(), {
  enableEditingSettings: false
})

const emit = defineEmits<{
  videoStreamChange: [stream: MediaStream | null]
}>()

const webcam = useWebcam()
const screenCapture = useScreenCapture()
const videoStreams = [webcam, screenCapture]
const activeVideoStream = ref<MediaStream | null>(null)
const inVolume = ref(0)
const audioRecorder = ref(new AudioRecorder())
const muted = ref(false)
const renderCanvasRef = ref<HTMLCanvasElement | null>(null)
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

// Video frame sending
let timeoutId = -1
watch([connected, activeVideoStream], ([isConnected, stream]) => {
  if (props.videoRef) {
    props.videoRef.srcObject = stream
  }

  function sendVideoFrame() {
    const video = props.videoRef
    const canvas = renderCanvasRef.value

    if (!video || !canvas) {
      return
    }

    const ctx = canvas.getContext('2d')!
    canvas.width = video.videoWidth * 0.25
    canvas.height = video.videoHeight * 0.25
    if (canvas.width + canvas.height > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL('image/jpeg', 1.0)
      const data = base64.slice(base64.indexOf(',') + 1)
      client.sendRealtimeInput([{ mimeType: 'image/jpeg', data }])
    }
    if (isConnected) {
      timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5)
    }
  }
  
  if (isConnected && stream !== null) {
    requestAnimationFrame(sendVideoFrame)
  }
})

onUnmounted(() => {
  clearTimeout(timeoutId)
  if (audioRecorder.value) {
    audioRecorder.value.stop()
  }
})

// Handler for swapping from one video-stream to the next
const changeStreams = (next?: UseMediaStreamResult) => async () => {
  if (next) {
    const mediaStream = await next.start()
    activeVideoStream.value = mediaStream
    emit('videoStreamChange', mediaStream)
  } else {
    activeVideoStream.value = null
    emit('videoStreamChange', null)
  }

  videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop())
}

const setMuted = (newMuted: boolean) => {
  muted.value = newMuted
}
</script>