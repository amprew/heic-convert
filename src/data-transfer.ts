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
export function buildMessageBuffer(imageType: ImageType, quality: number, imageData): Uint8Array {
  // Convert type string to Uint8Array
  if (quality > 100 || quality < 0) {
    throw new Error("number out of range");
  }

  const imageTypeInt = nameToImageType[imageType];
  // Allocate buffer size (typeArray.length bytes for type + image data length)
  // quality and image type fit in 1 byte each.
  const buffer = new Uint8Array(2 + imageData.byteLength);

  // Write type
  buffer.set([imageTypeInt], 0);
  buffer.set([quality], 1);

  // Write image data
  buffer.set(new Uint8Array(imageData), 2);

  return buffer;
}

// Function to parse the received buffer
export function parseMessageBuffer(buffer: Uint8Array): { type: ImageType, quality: number, imageData: Uint8Array } {
  // Extract type and quality
  // byte 1 and byte 2.
  const metaBuffer = buffer.slice(0,2);
  const typeInt = metaBuffer[0];
  const quality = metaBuffer[1];
  const type = imageTypeToName[typeInt];

  // Extract image data
  const imageData = buffer.slice(2);

  const parsedData = { type, quality: quality, imageData };
  console.log('parsedData', parsedData);
  return parsedData;
}
