<template>
  <div :class="`side-panel ${open ? 'open' : ''}`">
    <header class="top">
      <h2>Console</h2>
      <button v-if="open" class="opener" @click="setOpen(false)">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <button v-else class="opener" @click="setOpen(true)">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </header>
    
    <section class="indicators">
      <select
        class="filter-select"
        :value="selectedOption?.value"
        @change="onChange"
      >
        <option
          v-for="option in filterOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      
      <div :class="cn('streaming-indicator', { connected })">
        {{ connected
          ? `🔵${open ? ' Streaming' : ''}`
          : `⏸️${open ? ' Paused' : ''}` }}
      </div>
    </section>
    
    <div class="side-panel-container" ref="loggerRef">
      <Logger :filter="(selectedOption?.value as LoggerFilterType) || 'none'" />
    </div>
    
    <div :class="cn('input-container', { disabled: !connected })">
      <div class="input-content">
        <textarea
          ref="inputRef"
          class="input-area"
          :value="textInput"
          @keydown="onKeyDown"
          @input="onInput"
        />
        <span
          :class="cn('input-content-placeholder', {
            hidden: textInput.length,
          })"
        >
          Type&nbsp;something...
        </span>

        <button
          class="send-button material-symbols-outlined filled"
          @click="handleSubmit"
        >
          send
        </button>
      </div>
    </div>
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

import './side-panel.css'
import cn from 'classnames'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useLiveAPIContext } from '../../composables/useLiveAPIContext'
import { useLoggerStore } from '../../stores/useLoggerStore'
import Logger, { type LoggerFilterType } from '../logger/Logger.vue'

const filterOptions = [
  { value: 'conversations', label: 'Conversations' },
  { value: 'tools', label: 'Tool Use' },
  { value: 'none', label: 'All' },
]

const { connected, client } = useLiveAPIContext()
const open = ref(true)
const loggerRef = ref<HTMLDivElement | null>(null)
const loggerLastHeightRef = ref(-1)
const { log, logs } = useLoggerStore()

const textInput = ref('')
const selectedOption = ref<{ value: string; label: string } | null>(filterOptions[2]) // Default to "All"
const inputRef = ref<HTMLTextAreaElement | null>(null)

// Scroll the log to the bottom when new logs come in
watch(logs, () => {
  if (loggerRef.value) {
    const el = loggerRef.value
    const scrollHeight = el.scrollHeight
    if (scrollHeight !== loggerLastHeightRef.value) {
      el.scrollTop = scrollHeight
      loggerLastHeightRef.value = scrollHeight
    }
  }
})

onMounted(() => {
  // Listen for log events and store them
  client.on('log', log)
})

onUnmounted(() => {
  client.off('log', log)
})

const handleSubmit = () => {
  client.send([{ text: textInput.value }])
  
  textInput.value = ''
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

const setOpen = (value: boolean) => {
  open.value = value
}

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const selectedValue = target.value
  const option = filterOptions.find(opt => opt.value === selectedValue)
  
  if (option) {
    selectedOption.value = option
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    e.stopPropagation()
    handleSubmit()
  }
}

const onInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  textInput.value = target.value
}
</script>

<style scoped>
.filter-select {
  background: var(--Neutral-15);
  color: var(--Neutral-90);
  min-height: 33px;
  max-height: 33px;
  border: 0;
  border-radius: 4px;
  padding: 8px;
  width: 100%;
}

.filter-select:focus {
  outline: 2px solid var(--Neutral-30);
}

.filter-select option {
  background: var(--Neutral-15);
  color: var(--Neutral-90);
}

.opener {
  background: none;
  border: none;
  cursor: pointer;
  color: #b4b8bb;
}

.opener:hover {
  color: #ffffff;
}
</style>