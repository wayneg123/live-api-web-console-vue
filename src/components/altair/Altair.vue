<template>
  <div class="vega-embed" ref="embedRef" />
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

import { onMounted, onUnmounted, ref, watch } from 'vue'
import vegaEmbed from 'vega-embed'
import { useLiveAPIContext } from '../../composables/useLiveAPIContext'
import {
  Modality,
  Type,
} from '@google/genai'

// Import types that are only available as TypeScript types
import type {
  FunctionDeclaration,
  LiveServerToolCall,
} from '@google/genai'

const declaration: FunctionDeclaration = {
  name: 'render_altair',
  description: 'Displays an altair graph in json format.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          'JSON STRING representation of the graph to render. Must be a string, not a json object',
      },
    },
    required: ['json_graph'],
  },
}

const jsonString = ref<string>('')
const { client, setConfig, setModel } = useLiveAPIContext()
const embedRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  setModel('models/gemini-2.0-flash-exp')
  setConfig({
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
    },
    systemInstruction: {
      parts: [
        {
          text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
        },
      ],
    },
    tools: [
      // there is a free-tier quota for search
      { googleSearch: {} },
      { functionDeclarations: [declaration] },
    ],
  })

  const onToolCall = (toolCall: LiveServerToolCall) => {
    if (!toolCall.functionCalls) {
      return
    }
    const fc = toolCall.functionCalls.find(
      (fc) => fc.name === declaration.name
    )
    if (fc) {
      const str = (fc.args as any).json_graph
      jsonString.value = str
    }
    // send data for the response of your tool call
    // in this case Im just saying it was successful
    if (toolCall.functionCalls.length) {
      setTimeout(
        () =>
          client.sendToolResponse({
            functionResponses: toolCall.functionCalls?.map((fc) => ({
              response: { output: { success: true } },
              id: fc.id,
              name: fc.name,
            })),
          }),
        200
      )
    }
  }
  
  client.on('toolcall', onToolCall)
  
  onUnmounted(() => {
    client.off('toolcall', onToolCall)
  })
})

watch([embedRef, jsonString], ([embedElement, jsonStr]) => {
  if (embedElement && jsonStr) {
    console.log('jsonString', jsonStr)
    vegaEmbed(embedElement, JSON.parse(jsonStr))
  }
})
</script>