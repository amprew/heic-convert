import heicDecode from "heic-decode";
import { convertToImage } from './convert';

import { parseMessageBuffer, buildMessageBuffer } from '../data-transfer';
import PQueue from 'p-queue';

declare interface DedicatedWorkerGlobalScope {
  postMessage<T = any>(message: T, transfer: Transferable[]): void;
  postMessage<T = any>(message: T, options?: StructuredSerializeOptions): void;
  onmessage(msg: MessageEvent): void;
}

declare var self: DedicatedWorkerGlobalScope;

const queue = new PQueue();

// we want idle instead of empty as this will make sure pending promises
// are not inflight.
queue.on('idle', async () => {
  console.log("on idle")
  await waitFor(5000);
  console.log("on idle 5 seconds", queue.size, queue.pending)
  if(queue.size > 0 || queue.pending > 0) return;
  postMessage({ name: "shutdown" });
});

self.onmessage = async function(msg) {
  queue.add(() => processMessage(msg));
}

async function processMessage(msg) {
  const { type, quality, index, imageData } = parseMessageBuffer(msg.data);

  console.log('image data', imageData);
  const data = await heicDecode({ buffer: imageData })

  const decodedData = data.data;
  console.log('worker decoded data', decodedData)

  const convertedData = await convertToImage({
    data: decodedData,
    width: data.width,
    height: data.height,
    quality: quality/100,
    type: `image/${type}`
  })

  const buffer = buildMessageBuffer({
    type,
    quality,
    index,
    imageData: convertedData
  })

  self.postMessage(buffer, [buffer.buffer]);

  // work out how to handle this better
  await queue.pause();
  await waitFor(100);
  await queue.start();
}

function waitFor(ms) {
  return new Promise(res => setTimeout(res, ms));
}
