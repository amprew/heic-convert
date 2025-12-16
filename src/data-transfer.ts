import type { ImageType } from './types';
import pako from 'pako'; // Pako for zlib-like compression and decompression

export enum ImageTypeData {
  png = 0,
  jpeg = 1,
}

// Mapping between ImageTypeData and string-based ImageType
const imageTypeToName: Record<ImageTypeData, ImageType> = {
  [ImageTypeData.png]: "png",
  [ImageTypeData.jpeg]: "jpeg",
};

const nameToImageType: Record<ImageType, ImageTypeData> = {
  "png": ImageTypeData.png,
  "jpeg": ImageTypeData.jpeg,
};

// Function to build a buffer with metadata, compressed image data, and optional dimensions
export function buildMessageBuffer({
  type, quality, index, width = 0, height = 0, imageData
}: {
  type: ImageType,
  quality: number,
  index: number,
  width?: number,
  height?: number,
  imageData: Uint8Array
}): Uint8Array {
  if (index > 255) throw new Error("Image index cannot be greater than 255.");
  if (quality > 100 || quality < 0) throw new Error("Quality must be between 0 and 100.");
  if (width > 65535 || height > 65535) throw new Error("Width and height must be less than 65536.");

  // Compress the image data using Pako
  const compressedImageData = pako.deflate(imageData);

  console.log(`Building message buffer - type: ${type}, quality: ${quality}, index: ${index}, width: ${width}, height: ${height}`);

  // Allocate buffer: 3 bytes (type, quality, index) + 4 bytes (width, height) + compressed image data length
  const buffer = new Uint8Array(7 + compressedImageData.byteLength);

  // Write metadata
  buffer.set([nameToImageType[type]], 0);  // Byte 0: Image type
  buffer.set([quality], 1);                // Byte 1: Quality
  buffer.set([index], 2);                  // Byte 2: Index
  buffer.set([(width >> 8) & 0xff, width & 0xff], 3);  // Bytes 3-4: Width (2 bytes)
  buffer.set([(height >> 8) & 0xff, height & 0xff], 5); // Bytes 5-6: Height (2 bytes)

  // Write compressed image data
  buffer.set(compressedImageData, 7);      // Starting from byte 7: Compressed image data

  return buffer;
}

// Function to parse the buffer and decompress the image data
export function parseMessageBuffer(buffer: Uint8Array): {
  type: ImageType,
  quality: number,
  index: number,
  width: number,
  height: number,
  imageData: Uint8Array
} {
  // Extract metadata
  const typeInt = buffer[0];              // Byte 0: Image type
  const quality = buffer[1];              // Byte 1: Quality
  const index = buffer[2];                // Byte 2: Index
  const width = (buffer[3] << 8) | buffer[4];  // Bytes 3-4: Width
  const height = (buffer[5] << 8) | buffer[6]; // Bytes 5-6: Height

  console.log(`Parsing message buffer - raw bytes: [${buffer[0]}, ${buffer[1]}, ${buffer[2]}, ${buffer[3]}, ${buffer[4]}, ${buffer[5]}, ${buffer[6]}]`);
  console.log(`Parsed values - typeInt: ${typeInt}, quality: ${quality}, index: ${index}, width: ${width}, height: ${height}`);

  const type = imageTypeToName[typeInt];

  // Extract compressed image data
  const compressedImageData = buffer.slice(7);

  // Decompress the image data using Pako
  const imageData = pako.inflate(compressedImageData);

  // Return parsed data
  return { type, quality, index, width, height, imageData };
}
