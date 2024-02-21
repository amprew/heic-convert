const windowWorkerKey = "_heic_workers";

export const createOrGetWorker = (count?: number): Worker[] => {
  if(typeof window[windowWorkerKey] !== "undefined") {
    return window[windowWorkerKey];
  }
  window[windowWorkerKey] = Array(count).fill(null).map((_, index) => (
    new Worker('dist/worker/worker.js')
  ));

  console.log(window[windowWorkerKey]);

  return window[windowWorkerKey];
}

export const terminateAllWorkers = () => {
  if(!window[windowWorkerKey]?.length) {
    return;
  }

  for(const worker of window[windowWorkerKey]) {
    worker.terminate();
  }

  delete window[windowWorkerKey];
}
