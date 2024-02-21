import { buildMessageBuffer, parseMessageBuffer } from '../src/data-transfer';

describe('buildMessageBuffer and parseMessageBuffer', () => {
  // it builds imageData
  it('builds imageData and metadata and can read it', () => {
    // Add your test code here: function: buildMessageBuffer
    // Example:
    const imageDataInput = new Uint8Array([5,3,2,1,4,56,7])
    const buffer = buildMessageBuffer({
      type: 'png',
      quality: 55,
      index: 11,
      imageData: imageDataInput
    });
    expect(buffer).toBeInstanceOf(Uint8Array);

    const {type, quality, index, imageData} = parseMessageBuffer(buffer);

    expect(type).toBe("png");
    expect(quality).toBe(55);
    expect(index).toBe(11);
    expect(imageData).toEqual(imageDataInput);
  });

  it('raises an error if', () => {
    // create a test for `buildMessageBuffer` raising an error if the index is above 255
    expect(() => {
      buildMessageBuffer({
        type: 'png',
        quality: 55,
        index: 256,
        imageData: new Uint8Array([5, 3, 2, 1, 4, 56, 7])
      });
    }).toThrow();

    // create a test for `buildMessageBuffer` raising an error if the quality is above 100 or below 0
    expect(() => {
      buildMessageBuffer({
        type: 'png',
        quality: -1,
        index: 11,
        imageData: new Uint8Array([5, 3, 2, 1, 4, 56, 7])
      });
    }).toThrow();
    expect(() => {
      buildMessageBuffer({
        type: 'png',
        quality: 101,
        index: 11,
        imageData: new Uint8Array([5, 3, 2, 1, 4, 56, 7])
      });
    }).toThrow();
  });
});
