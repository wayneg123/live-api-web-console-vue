<template>
  <div class="logger">
    <ul class="logger-list">
      <li
        v-for="(log, key) in filteredLogs"
        :key="key"
        :class="cn(
          'plain-log',
          `source-${log.type.slice(0, log.type.indexOf('.'))}`,
          {
            receive: log.type.includes('receive'),
            send: log.type.includes('send'),
          }
        )"
      >
        <span class="timestamp">{{ formatTime(log.date) }}</span>
        <span class="source">{{ log.type }}</span>
        <span class="message">
          <component :is="getMessageComponent(log)" :message="log.message" />
        </span>
        <span v-if="log.count" class="count">{{ log.count }}</span>
      </li>
    </ul>
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

import './logger.scss'
import cn from 'classnames'
import { computed, defineComponent, h } from 'vue'
import { useLoggerStore } from '../../stores/useLoggerStore'
// Import types that are only available as TypeScript types
import type {
  ClientContentLog as ClientContentLogType,
  StreamingLog,
} from '../../types'
import {
  LiveClientToolResponse,
} from '@google/genai'

// Import types that are only available as TypeScript types
import type {
  Content,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
} from '@google/genai'

export type LoggerFilterType = 'conversations' | 'tools' | 'none'

export interface LoggerProps {
  filter?: LoggerFilterType
}

const props = withDefaults(defineProps<LoggerProps>(), {
  filter: 'none'
})

const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3)

const { logs } = useLoggerStore()

const filters: Record<LoggerFilterType, (log: StreamingLog) => boolean> = {
  tools: (log: StreamingLog) =>
    typeof log.message === 'object' &&
    ('toolCall' in log.message ||
      'functionResponses' in log.message ||
      'toolCallCancellation' in log.message),
  conversations: (log: StreamingLog) =>
    typeof log.message === 'object' &&
    (('turns' in log.message && 'turnComplete' in log.message) ||
      'serverContent' in log.message),
  none: () => true,
}

const filteredLogs = computed(() => {
  const filterFn = filters[props.filter]
  return logs.filter(filterFn)
})

// Simple code block component for syntax highlighting placeholder
const CodeBlock = defineComponent({
  props: {
    language: String,
    code: String,
  },
  setup(props) {
    return () => h('pre', { class: 'code-block' }, h('code', props.code))
  }
})

function tryParseCodeExecutionResult(output: string) {
  try {
    const json = JSON.parse(output)
    return JSON.stringify(json, null, '  ')
  } catch (e) {
    return output
  }
}

const RenderPart = defineComponent({
  props: {
    part: {
      type: Object as () => Part,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const { part } = props
      
      if (part.text && part.text.length) {
        return h('p', { class: 'part part-text' }, part.text)
      }
      
      if (part.executableCode) {
        return h('div', { class: 'part part-executableCode' }, [
          h('h5', {}, `executableCode: ${part.executableCode.language}`),
          h(CodeBlock, {
            language: part.executableCode.language?.toLowerCase(),
            code: part.executableCode.code,
          })
        ])
      }
      
      if (part.codeExecutionResult) {
        return h('div', { class: 'part part-codeExecutionResult' }, [
          h('h5', {}, `codeExecutionResult: ${part.codeExecutionResult.outcome}`),
          h(CodeBlock, {
            language: 'json',
            code: tryParseCodeExecutionResult(part.codeExecutionResult.output!),
          })
        ])
      }
      
      if (part.inlineData) {
        return h('div', { class: 'part part-inlinedata' }, [
          h('h5', {}, `Inline Data: ${part.inlineData?.mimeType}`)
        ])
      }
      
      return h('div', { class: 'part part-unknown' }, '\u00A0')
    }
  }
})

const PlainTextMessage = defineComponent({
  props: {
    message: {
      required: true,
    },
  },
  setup(props) {
    return () => h('span', {}, props.message as string)
  }
})

const AnyMessage = defineComponent({
  props: {
    message: {
      required: true,
    },
  },
  setup(props) {
    return () => h('pre', {}, JSON.stringify(props.message, null, '  '))
  }
})

const ClientContentLog = defineComponent({
  props: {
    message: {
      required: true,
    },
  },
  setup(props) {
    return () => {
      const { turns, turnComplete } = props.message as ClientContentLogType
      const textParts = turns.filter((part) => !(part.text && part.text === '\n'))
      
      return h('div', { class: 'rich-log client-content user' }, [
        h('h4', { class: 'roler-user' }, 'User'),
        h('div', { key: 'message-turn' }, 
          textParts.map((part, j) => 
            h(RenderPart, { part, key: `message-part-${j}` })
          )
        ),
        !turnComplete ? h('span', {}, 'turnComplete: false') : null
      ])
    }
  }
})

const ToolCallLog = defineComponent({
  props: {
    message: {
      required: true,
    },
  },
  setup(props) {
    return () => {
      const { toolCall } = props.message as { toolCall: LiveServerToolCall }
      
      return h('div', { class: cn('rich-log tool-call') },
        toolCall.functionCalls?.map((fc, i) =>
          h('div', { key: fc.id, class: 'part part-functioncall' }, [
            h('h5', {}, `Function call: ${fc.name}`),
            h(CodeBlock, {
              language: 'json',
              code: JSON.stringify(fc, null, '  '),
            })
          ])
        )
      )
    }
  }
})

const ToolCallCancellationLog = defineComponent({
  props: {
    message: {
      required: true,
    },
  },
  setup(props) {
    return () => {
      const { toolCallCancellation } = props.message as { toolCallCancellation: LiveServerToolCallCancellation }
      
      return h('div', { class: cn('rich-log tool-call-cancellation') }, [
        h('span', {}, [
          ' ids: ',
          toolCallCancellation.ids?.map((id) =>
            h('span', { class: 'inline-code', key: `cancel-${id}` }, `"${id}"`)
          )
        ])
      ])
    }
  }
})

const ToolResponseLog = defineComponent({
  props: {
    message: {
      required: true,
    },
  },
  setup(props) {
    return () => {
      const message = props.message as LiveClientToolResponse
      
      return h('div', { class: cn('rich-log tool-response') },
        message.functionResponses?.map((fc) =>
          h('div', { key: `tool-response-${fc.id}`, class: 'part' }, [
            h('h5', {}, `Function Response: ${fc.id}`),
            h(CodeBlock, {
              language: 'json',
              code: JSON.stringify(fc.response, null, '  '),
            })
          ])
        )
      )
    }
  }
})

const ModelTurnLog = defineComponent({
  props: {
    message: {
      required: true,
    },
  },
  setup(props) {
    return () => {
      const serverContent = (props.message as { serverContent: LiveServerContent }).serverContent
      const { modelTurn } = serverContent as { modelTurn: Content }
      const { parts } = modelTurn

      return h('div', { class: 'rich-log model-turn model' }, [
        h('h4', { class: 'role-model' }, 'Model'),
        parts
          ?.filter((part) => !(part.text && part.text === '\n'))
          .map((part, j) =>
            h(RenderPart, { part, key: `model-turn-part-${j}` })
          )
      ])
    }
  }
})

const CustomPlainTextLog = (msg: string) => defineComponent({
  setup() {
    return () => h(PlainTextMessage, { message: msg })
  }
})

const getMessageComponent = (log: StreamingLog) => {
  if (typeof log.message === 'string') {
    return PlainTextMessage
  }
  if ('turns' in log.message && 'turnComplete' in log.message) {
    return ClientContentLog
  }
  if ('toolCall' in log.message) {
    return ToolCallLog
  }
  if ('toolCallCancellation' in log.message) {
    return ToolCallCancellationLog
  }
  if ('functionResponses' in log.message) {
    return ToolResponseLog
  }
  if ('serverContent' in log.message) {
    const { serverContent } = log.message
    if (serverContent?.interrupted) {
      return CustomPlainTextLog('interrupted')
    }
    if (serverContent?.turnComplete) {
      return CustomPlainTextLog('turnComplete')
    }
    if (serverContent && 'modelTurn' in serverContent) {
      return ModelTurnLog
    }
  }
  return AnyMessage
}
</script>