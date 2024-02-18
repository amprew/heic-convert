import React, { useEffect } from 'react';

import './App.css';
import { useRef } from "react";

import { readImageBuffer } from './image-reader';
import { buildMessageBuffer, parseMessageBuffer } from './data-transfer';

function downloadImage(imageAddress) {
  var link = document.createElement('a');
  link.href = imageAddress;
  link.download = new Date().toISOString().replace(/[-:.]/g, '');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function App() {
  const worker = new Worker(
    '/dist/worker/worker.js'
  );

  worker.onmessage = function(msg) {
    console.log("message reply done", msg);
    const { type, imageData } = parseMessageBuffer(msg.data);
    const blob = new Blob([imageData], {type: `image/${type}`})
    const url = URL.createObjectURL(blob);
    downloadImage(url);
  }

  useEffect(() => {
    function onUnload() {
      worker.terminate();
    }
    window.addEventListener("beforeunload", onUnload);
  }, []);

  const qualityRef = useRef<HTMLInputElement | null>(null);
  const getQuality = () => qualityRef?.current?.value ? parseInt(qualityRef?.current?.value) : 100;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files as FileList;

    if(!files) return;

    for (const file of files) {
      const uint8Array = await readImageBuffer(file);

      const buffer = buildMessageBuffer("jpeg", getQuality(), uint8Array)

      worker.postMessage(buffer, [buffer.buffer]);
    }
  }

  return (
    <div className="App">
      <input type="text" defaultValue={75} ref={qualityRef} />
      <input type="file" onChange={onChange} accept=".heic" multiple />
    </div>
  );
}

export default App;
