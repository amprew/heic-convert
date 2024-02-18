type ImageTypes = "image/jpeg" | "image/png";

const initializeCanvas = ({ width, height }) => {
  const canvas = new OffscreenCanvas(width, height);

  return canvas;
};

export const convertToImage = async ({
  data,
  width,
  height,
  type,
  quality
}: { data: Uint8ClampedArray, width: number, height: number, type: ImageTypes, quality: number }): Promise<Uint8ClampedArray> => {

  console.log(data)
  const canvas = initializeCanvas({ width, height });

  const ctx = canvas.getContext('2d');
  if(!ctx) throw new Error("canvas context not found.");

  ctx.putImageData(new ImageData(data, width, height), 0, 0);

  const blob = await canvas.convertToBlob({ type, quality });

  const arrayBuffer = await blob.arrayBuffer();

  return new Uint8ClampedArray(arrayBuffer);
};
