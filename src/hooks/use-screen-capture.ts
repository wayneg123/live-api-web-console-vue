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

import { ref, watch } from "vue";
import { UseMediaStreamResult } from "./use-media-stream-mux";

export function useScreenCapture(): UseMediaStreamResult {
  const stream = ref<MediaStream | null>(null);
  const isStreaming = ref(false);

  watch(stream, (newStream, oldStream) => {
    const handleStreamEnded = () => {
      isStreaming.value = false;
      stream.value = null;
    };

    // Clean up old stream listeners
    if (oldStream) {
      oldStream
        .getTracks()
        .forEach((track) =>
          track.removeEventListener("ended", handleStreamEnded),
        );
    }

    // Add listeners to new stream
    if (newStream) {
      newStream
        .getTracks()
        .forEach((track) => track.addEventListener("ended", handleStreamEnded));
    }
  });

  const start = async () => {
    // const controller = new CaptureController();
    // controller.setFocusBehavior("no-focus-change");
    const mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      // controller
    });
    stream.value = mediaStream;
    isStreaming.value = true;
    return mediaStream;
  };

  const stop = () => {
    if (stream.value) {
      stream.value.getTracks().forEach((track) => track.stop());
      stream.value = null;
      isStreaming.value = false;
    }
  };

  const result: UseMediaStreamResult = {
    type: "screen",
    start,
    stop,
    isStreaming,
    stream,
  };

  return result;
}
