const windowWorkerKey = "_heic_workers";

type WorkerList = Array<Worker | void>;

declare global {
  interface Window {
    _heic_workers: WorkerList;
  }
}

export const createOrGetWorker = (count?: number): Worker[]  => {
  if(typeof window[windowWorkerKey] !== "undefined") {
    return window[windowWorkerKey].filter((worker): worker is Worker => typeof worker !== "undefined");
  }
  window[windowWorkerKey] = Array(count).fill(null).map((_) => (
    new Worker('dist/worker/worker.js')
  ));

  return window[windowWorkerKey] as Worker[];
}

export const removeWorkerIndex = (index) => {
  if(!window[windowWorkerKey]?.length) {
    return;
  }

  delete window[windowWorkerKey][index];

  if(window[windowWorkerKey].every(e => !e)) {
    delete window[windowWorkerKey];
  }
}

export const terminateAllWorkers = () => {
  if(!window[windowWorkerKey]?.length) {
    return;
  }

  for(const worker of window[windowWorkerKey]) {
    if(!worker) continue;
    worker.terminate();
  }

  delete window[windowWorkerKey];
}
