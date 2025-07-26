<template>
  <div class="select-group">
    <label for="voice-selector">Voice</label>
    <select
      id="voice-selector"
      class="voice-select"
      :value="selectedOption?.value"
      @change="onChange"
    >
      <option
        v-for="option in voiceOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
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

import { ref, watch } from 'vue'
import { useLiveAPIContext } from '../../composables/useLiveAPIContext'

const voiceOptions = [
  { value: 'Puck', label: 'Puck' },
  { value: 'Charon', label: 'Charon' },
  { value: 'Kore', label: 'Kore' },
  { value: 'Fenrir', label: 'Fenrir' },
  { value: 'Aoede', label: 'Aoede' },
]

const { config, setConfig } = useLiveAPIContext()

const selectedOption = ref<{ value: string; label: string } | null>(voiceOptions[4]) // Aoede

watch(config, (newConfig) => {
  const voiceName =
    newConfig.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
    'Aoede'
  const voiceOption = voiceOptions.find(opt => opt.value === voiceName) || { value: voiceName, label: voiceName }
  selectedOption.value = voiceOption
}, { immediate: true })

const updateConfig = (voiceName: string) => {
  setConfig({
    ...config,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceName,
        },
      },
    },
  })
}

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const selectedValue = target.value
  const option = voiceOptions.find(opt => opt.value === selectedValue)
  
  if (option) {
    selectedOption.value = option
    updateConfig(option.value)
  }
}
</script>

<style scoped>
.voice-select {
  background: var(--Neutral-15);
  color: var(--Neutral-90);
  min-height: 33px;
  max-height: 33px;
  border: 0;
  border-radius: 4px;
  padding: 8px;
  width: 100%;
}

.voice-select:focus {
  outline: 2px solid var(--Neutral-30);
}

.voice-select option {
  background: var(--Neutral-15);
  color: var(--Neutral-90);
}
</style>