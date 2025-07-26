<template>
  <div :class="['audioPulse', { active, hover }]">
    <div
      v-for="(_, i) in lineCount"
      :key="i"
      :ref="(el) => (lines[i] = el as HTMLDivElement)"
      :style="{ animationDelay: `${i * 133}ms` }"
    />
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

import './audio-pulse.css'
import { onUnmounted, ref, watch } from 'vue'

export interface AudioPulseProps {
  active: boolean
  volume: number
  hover?: boolean
}

const props = withDefaults(defineProps<AudioPulseProps>(), {
  hover: false
})

const lineCount = 3
const lines = ref<HTMLDivElement[]>([])

let timeout: number | null = null

const update = () => {
  lines.value.forEach(
    (line, i) =>
      line && (line.style.height = `${Math.min(
        24,
        4 + props.volume * (i === 1 ? 400 : 60)
      )}px`)
  )
  timeout = window.setTimeout(update, 100)
}

watch(() => props.volume, () => {
  if (timeout) {
    clearTimeout(timeout)
  }
  update()
}, { immediate: true })

onUnmounted(() => {
  if (timeout) {
    clearTimeout(timeout)
  }
})
</script>
