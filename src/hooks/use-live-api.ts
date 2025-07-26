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

import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { Ref } from "vue";
import { GenAILiveClient } from "../lib/genai-live-client";
import type { LiveClientOptions } from "../types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
// Import types that are only available as TypeScript types
import type { LiveConnectConfig } from "@google/genai";

export type UseLiveAPIResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: Ref<LiveConnectConfig>;
  model: Ref<string>;
  setModel: (model: string) => void;
  connected: Ref<boolean>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: Ref<number>;
};

export function useLiveAPI(options: LiveClientOptions): UseLiveAPIResults {
  const client = computed(() => new GenAILiveClient(options));
  const audioStreamerRef = ref<AudioStreamer | null>(null);

  const model = ref<string>("models/gemini-2.0-flash-exp");
  const config = ref<LiveConnectConfig>({});
  const connected = ref(false);
  const volume = ref(0);

  const setModel = (newModel: string) => {
    model.value = newModel;
  };

  const setConfig = (newConfig: LiveConnectConfig) => {
    config.value = newConfig;
  };

  // register audio for streaming server -> speakers
  onMounted(() => {
    if (!audioStreamerRef.value) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.value = new AudioStreamer(audioCtx);
        audioStreamerRef.value
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            volume.value = ev.data.volume;
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  });

  onMounted(() => {
    const onOpen = () => {
      connected.value = true;
    };

    const onClose = () => {
      connected.value = false;
    };

    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    const stopAudioStreamer = () => audioStreamerRef.value?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.value?.addPCM16(new Uint8Array(data));

    client.value
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    onUnmounted(() => {
      client.value
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .disconnect();
    });
  });

  const connect = async () => {
    if (!config.value) {
      throw new Error("config has not been set");
    }
    client.value.disconnect();
    await client.value.connect(model.value, config.value);
  };

  const disconnect = async () => {
    client.value.disconnect();
    connected.value = false;
  };

  return {
    client: client.value,
    config,
    setConfig,
    model,
    setModel,
    connected,
    connect,
    disconnect,
    volume,
  };
}
