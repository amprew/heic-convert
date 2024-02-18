export async function readImageBuffer(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async function(event) {
      if(!event.target) return;
      const image = event.target.result;

      if(!(image instanceof ArrayBuffer)) {
        console.log('Image is not an ArrayBuffer');
        return;
      }

      const uint8Array = new Uint8Array(image);
      resolve(uint8Array);
    };

    reader.readAsArrayBuffer(blob);
  });

  // should we have some sort of timeout.
}
