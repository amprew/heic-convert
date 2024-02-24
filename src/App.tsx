import React, { useEffect, useRef } from 'react';

import { readImageBuffer } from './image-reader';
import { buildMessageBuffer, parseMessageBuffer } from './data-transfer';
import { createOrGetWorker, terminateAllWorkers, removeWorkerIndex } from './worker-utils';
import { ImageType } from './types';

function downloadImage(imageAddress) {
  var link = document.createElement('a');
  link.href = imageAddress;
  link.download = new Date().toISOString().replace(/[-:.]/g, '');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type Task = { name: string };
function onWorkerMessage(worker: Worker, msg: MessageEvent<Task | Uint8Array>, index: number) {
  if(msg.data["name"] == "shutdown"){
    console.log("shutting down worker...");
    worker.terminate();
    removeWorkerIndex(index);
    return;
  }

  if(!(msg.data instanceof Uint8Array)) {
    return;
  }

  console.log("message reply done", msg);
  const { type, imageData } = parseMessageBuffer(msg.data);
  const blob = new Blob([imageData], { type: `image/${type}` });
  const url = URL.createObjectURL(blob);
  downloadImage(url);
}

function registerWorkerListening() {
  createOrGetWorker().forEach((worker, index) => {
    worker.onmessage = function(msg) { onWorkerMessage(worker, msg, index) };
  });
}

function App() {
  useEffect(() => {
    window.addEventListener("beforeunload", terminateAllWorkers);
  }, []);

  const qualityRef = useRef<HTMLInputElement | null>(null);
  const typeRef = useRef<HTMLSelectElement | null>(null);
  const workersRef = useRef<HTMLInputElement | null>(null);
  const getQuality = () => qualityRef?.current?.value ? parseInt(qualityRef?.current?.value) : 100;
  const getType = (): ImageType => typeRef?.current?.value as ImageType;
  const getWorkerCount = () => parseInt(workersRef?.current?.value);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const numberOfWorkers = getWorkerCount();
    const files = e.target.files as FileList;

    if(!files) return;
    if(numberOfWorkers > files.length) {
      alert("number of workers cannot be greater than number of files.");
      e.target.value = null;

      return;
    }
    // TODO: pass index of file to associate when webworker returns.
    // pass in buffer data and return once complete.
    // Data is stored in a uint8array so 256 is the max amount we can upload at once.
    // I am sure we should set the limit lower than this!

    // TODO: once upload has started we need to create a lock on submitting
    // any more events until all have completed or failed.
    const workers = createOrGetWorker(numberOfWorkers);
    const getWorker = (index: number) => {
      return workers[(index+1)%numberOfWorkers];
    }
    registerWorkerListening()

    const numOfFiles = files.length;
    for(let i=0; i<numOfFiles; i++) {
      const file = files[i];

      const uint8Array = await readImageBuffer(file);
      const buffer = buildMessageBuffer({
        type: getType(),
        quality: getQuality(),
        index: i,
        imageData: uint8Array
      })

      getWorker(i).postMessage(buffer, [buffer.buffer]);
    }
  }

  return (
    <div className="App">
      <label htmlFor="workers">Workers:</label>
      <input type="text" id="workers" defaultValue={1} ref={workersRef} />
      <label htmlFor="quality">Quality:</label>
      <input type="text" id="quality" defaultValue={75} ref={qualityRef} />
      <label htmlFor="type">Type:</label>
      <select ref={typeRef} id="type">
        <option value="jpeg" defaultChecked>jpeg</option>
        <option value="png">png</option>
      </select>
      <label htmlFor="files">Files:</label>
      <input id="files" type="file" onChange={onChange} accept=".heic" multiple />
    </div>
  );
}

export default App;
