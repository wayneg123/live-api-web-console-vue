<template>
  <div class="settings-dialog">
    <button
      class="action-button material-symbols-outlined"
      @click="setOpen(!open)"
    >
      settings
    </button>
    <dialog class="dialog" :style="{ display: open ? 'block' : 'none' }">
      <div :class="`dialog-container ${connected ? 'disabled' : ''}`">
        <div v-if="connected" class="connected-indicator">
          <p>
            These settings can only be applied before connecting and will
            override other settings.
          </p>
        </div>
        
        <div class="mode-selectors">
          <ResponseModalitySelector />
          <VoiceSelector />
        </div>

        <h3>System Instructions</h3>
        <textarea
          class="system"
          :value="systemInstruction"
          @input="updateConfig"
        />
        
        <h4>Function declarations</h4>
        <div class="function-declarations">
          <div class="fd-rows">
            <div
              v-for="(fd, fdKey) in functionDeclarations"
              :key="`function-${fdKey}`"
              class="fd-row"
            >
              <span class="fd-row-name">{{ fd.name }}</span>
              <span class="fd-row-args">
                <span
                  v-for="(item, k) in Object.keys(fd.parameters?.properties || {})"
                  :key="k"
                >
                  {{ item }}
                </span>
              </span>
              <input
                :key="`fd-${fd.description}`"
                class="fd-row-description"
                type="text"
                :value="fd.description"
                @blur="(e) => updateFunctionDescription(fd.name!, (e.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>
      </div>
    </dialog>
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

import { computed, ref } from 'vue'
import './settings-dialog.css'
import { useLiveAPIContext } from '../../composables/useLiveAPIContext'
import VoiceSelector from './VoiceSelector.vue'
import ResponseModalitySelector from './ResponseModalitySelector.vue'
// Import types that are only available as TypeScript types
import type { FunctionDeclaration, LiveConnectConfig, Tool } from '@google/genai'

type FunctionDeclarationsTool = Tool & {
  functionDeclarations: FunctionDeclaration[]
}

const open = ref(false)
const { config, setConfig, connected } = useLiveAPIContext()

const functionDeclarations = computed((): FunctionDeclaration[] => {
  if (!Array.isArray(config.tools)) {
    return []
  }
  return (config.tools as Tool[])
    .filter((t: Tool): t is FunctionDeclarationsTool =>
      Array.isArray((t as any).functionDeclarations)
    )
    .map((t) => t.functionDeclarations)
    .filter((fc) => !!fc)
    .flat()
})

// system instructions can come in many types
const systemInstruction = computed(() => {
  if (!config.systemInstruction) {
    return ''
  }
  if (typeof config.systemInstruction === 'string') {
    return config.systemInstruction
  }
  if (Array.isArray(config.systemInstruction)) {
    return config.systemInstruction
      .map((p) => (typeof p === 'string' ? p : p.text))
      .join('\n')
  }
  if (
    typeof config.systemInstruction === 'object' &&
    'parts' in config.systemInstruction
  ) {
    return (
      config.systemInstruction.parts?.map((p) => p.text).join('\n') || ''
    )
  }
  return ''
})

const updateConfig = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const newConfig: LiveConnectConfig = {
    ...config,
    systemInstruction: target.value,
  }
  setConfig(newConfig)
}

const updateFunctionDescription = (editedFdName: string, newDescription: string) => {
  const newConfig: LiveConnectConfig = {
    ...config,
    tools:
      config.tools?.map((tool) => {
        const fdTool = tool as FunctionDeclarationsTool
        if (!Array.isArray(fdTool.functionDeclarations)) {
          return tool
        }
        return {
          ...tool,
          functionDeclarations: fdTool.functionDeclarations.map((fd) =>
            fd.name === editedFdName
              ? { ...fd, description: newDescription }
              : fd
          ),
        }
      }) || [],
  }
  setConfig(newConfig)
}

const setOpen = (value: boolean) => {
  open.value = value
}
</script>