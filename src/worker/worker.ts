import heicDecode from "heic-decode";
import { convertToImage } from './convert';

import { parseMessageBuffer, buildMessageBuffer } from '../data-transfer';

declare interface DedicatedWorkerGlobalScope {
  postMessage<T = any>(message: T, transfer: Transferable[]): void;
  postMessage<T = any>(message: T, options?: StructuredSerializeOptions): void;
  onmessage(msg: MessageEvent): void;
}

declare var self: DedicatedWorkerGlobalScope;

self.onmessage = async function(msg) {
  console.log('msg', msg)
  console.log('msg', msg.data)

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
}
