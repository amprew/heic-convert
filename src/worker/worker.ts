import heicDecode from "heic-decode";
import { convertToImage } from './convert';

import { parseMessageBuffer, buildMessageBuffer } from '../data-transfer';

declare interface DedicatedWorkerGlobalScope {
  postMessage<T = any>(message: T, transfer: Transferable[]): void;
  postMessage<T = any>(message: T, options?: StructuredSerializeOptions): void;
  onmessage(msg: MessageEvent): void;
}

declare var self: DedicatedWorkerGlobalScope;

let tasksProcessing = false;
const taskQueue = [];

self.onmessage = async function(msg) {
  taskQueue.push(msg);
  if(!tasksProcessing) { processMessage(); }
}
async function processMessage() {
  if(taskQueue.length == 0) {
    tasksProcessing = false;
    return;
  }
  tasksProcessing = true;

  const msg = taskQueue.shift();
  const { type, quality, imageData } = parseMessageBuffer(msg.data);

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

  const buffer = buildMessageBuffer(type, quality, convertedData)

  self.postMessage(buffer, [buffer.buffer]);

  await waitFor(100);
  processMessage();
}

function waitFor(ms) {
  return new Promise(res => setTimeout(res, ms));
}
