import type { ImageType } from './types';

export enum ImageTypeData {
  png = "0",
  jpeg = "1"
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

  const imageTypeTypeArray = new TextEncoder().encode(nameToImageType[imageType]);
  // we want quality to always be of length 3:
  // 1 = 001, 20 = 020, 100 = 100
  const qualityString = quality.toString().padStart(3, "0");
  const qualityTypedArray = new TextEncoder().encode(qualityString);
  console.log("qualityTyped", qualityTypedArray);

  // Allocate buffer size (typeArray.length bytes for type + image data length)
  const buffer = new Uint8Array(imageTypeTypeArray.length + qualityTypedArray.length + imageData.byteLength);

  // Write type
  buffer.set(imageTypeTypeArray, 0);
  buffer.set(qualityTypedArray, 1);

  // Write image data
  buffer.set(new Uint8Array(imageData), imageTypeTypeArray.length+qualityTypedArray.length);

  return buffer;
}

// Function to parse the received buffer
export function parseMessageBuffer(buffer: Uint8Array): { type: ImageType, quality: number, imageData: Uint8Array } {
  // Extract type and quality
  const typeQualityString = new TextDecoder().decode(new Uint8Array(buffer, 0, 4));
  const type = imageTypeToName[typeQualityString.slice(0,1) as ImageTypeData];
  const quality = typeQualityString.slice(1);

  // Extract image data
  const imageData = buffer.slice(4);

  const parsedData = { type, quality: parseInt(quality), imageData };
  console.log('parsedData', parsedData);
  return parsedData;
}
