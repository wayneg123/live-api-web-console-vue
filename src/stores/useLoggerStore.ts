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

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StreamingLog } from '../types'
// import { mockLogs } from '../components/logger/mock-logs'

export const useLoggerStore = defineStore('logger', () => {
  const maxLogs = ref(100)
  const logs = ref<StreamingLog[]>([]) // mockLogs

  const log = ({ date, type, message }: StreamingLog) => {
    const prevLog = logs.value[logs.value.length - 1]
    if (prevLog && prevLog.type === type && prevLog.message === message) {
      logs.value = [
        ...logs.value.slice(0, -1),
        {
          date,
          type,
          message,
          count: prevLog.count ? prevLog.count + 1 : 1,
        } as StreamingLog,
      ]
    } else {
      logs.value = [
        ...logs.value.slice(-(maxLogs.value - 1)),
        {
          date,
          type,
          message,
          count: 1,
        } as StreamingLog,
      ]
    }
  }

  const clearLogs = () => {
    logs.value = []
  }

  return {
    maxLogs,
    logs,
    log,
    clearLogs,
  }
})