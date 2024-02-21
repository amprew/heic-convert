import type { ImageType } from './types';

export enum ImageTypeData {
  png = 0,
  jpeg = 1
}

const imageTypeToName: Record<ImageTypeData, ImageType> = {
  [ImageTypeData.png]: "png",
  [ImageTypeData.jpeg]: "jpeg",
};

const nameToImageType: Record<ImageType, ImageTypeData> = {
  "png": ImageTypeData.png,
  "jpeg": ImageTypeData.jpeg,
}

// Function to build a buffer with metadata and image data
export function buildMessageBuffer({
  type, quality, index, imageData
}: {
  type: ImageType, quality: number, index: number, imageData: Uint8Array | Uint8ClampedArray
}): Uint8Array {
  if(index > 255) {
    throw new Error("Image index cannot be greater than 255 as this value exists in a 8 bit.");
  }

  // Convert type string to Uint8Array
  if (quality > 100 || quality < 0) {
    throw new Error("number out of range");
  }

  const imageTypeInt = nameToImageType[type];
  // Allocate buffer size for metadata + imageData.
  // quality, image, and index type fit in 1 byte each = 3 bytes.
  const buffer = new Uint8Array(3 + imageData.byteLength);

  // Write type
  buffer.set([imageTypeInt], 0);
  buffer.set([quality], 1);
  buffer.set([index], 2);

  // Write image data
  buffer.set(new Uint8Array(imageData), 3);

  return buffer;
}

// Function to parse the received buffer
export function parseMessageBuffer(buffer: Uint8Array): { type: ImageType, quality: number, index: number, imageData: Uint8Array } {
  // Extract type and quality
  // byte 1 and byte 2.
  const metaBuffer = buffer.slice(0,3);
  const typeInt = metaBuffer[0];
  const quality = metaBuffer[1];
  const index = metaBuffer[2];
  const type = imageTypeToName[typeInt];

  // Extract image data
  const imageData = buffer.slice(3);

  const parsedData = { type, quality, index, imageData };
  console.log('parsedData', parsedData);
  return parsedData;
}
