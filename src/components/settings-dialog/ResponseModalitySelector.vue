<template>
  <div class="select-group">
    <label for="response-modality-selector">Response modality</label>
    <select
      id="response-modality-selector"
      class="response-modality-select"
      :value="selectedOption?.value"
      @change="onChange"
    >
      <option
        v-for="option in responseOptions"
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

import { ref } from 'vue'
import { useLiveAPIContext } from '../../composables/useLiveAPIContext'
import { Modality } from '@google/genai'

const responseOptions = [
  { value: 'audio', label: 'audio' },
  { value: 'text', label: 'text' },
]

const { config, setConfig } = useLiveAPIContext()

const selectedOption = ref<{ value: string; label: string } | null>(responseOptions[0])

const updateConfig = (modality: 'audio' | 'text') => {
  setConfig({
    ...config,
    responseModalities: [
      modality === 'audio' ? Modality.AUDIO : Modality.TEXT,
    ],
  })
}

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const selectedValue = target.value
  const option = responseOptions.find(opt => opt.value === selectedValue)
  
  if (option) {
    selectedOption.value = option
    if (option.value === 'audio' || option.value === 'text') {
      updateConfig(option.value)
    }
  }
}
</script>

<style scoped>
.response-modality-select {
  background: var(--Neutral-15);
  color: var(--Neutral-90);
  min-height: 33px;
  max-height: 33px;
  border: 0;
  border-radius: 4px;
  padding: 8px;
  width: 100%;
}

.response-modality-select:focus {
  outline: 2px solid var(--Neutral-30);
}

.response-modality-select option {
  background: var(--Neutral-15);
  color: var(--Neutral-90);
}
</style>