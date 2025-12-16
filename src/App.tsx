import React, { useEffect, useRef, useState } from 'react';

import { readImageBuffer } from './image-reader';
import { buildMessageBuffer, parseMessageBuffer } from './data-transfer';
import { createOrGetWorker, terminateAllWorkers, removeWorkerIndex } from './worker-utils';
import { ImageType } from './types';

interface FileStatus {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  downloadUrl?: string;
  error?: string;
}

function downloadImage(imageAddress) {
  var link = document.createElement('a');
  link.href = imageAddress;
  link.download = new Date().toISOString().replace(/[-:.]/g, '');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusIcon(status: FileStatus['status']) {
  switch (status) {
    case 'pending':
      return (
        <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        </div>
      );
    case 'processing':
      return (
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      );
    case 'completed':
      return (
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
  }
}

type Task = { name: string };
function onWorkerMessage(
  worker: Worker, 
  msg: MessageEvent<Task | Uint8Array>, 
  index: number, 
  updateProgress: () => void,
  updateFileStatus: (fileId: string, status: 'completed' | 'error', downloadUrl?: string, error?: string) => void
) {
  if(msg.data["name"] == "shutdown"){
    console.log("shutting down worker...");
    worker.terminate();
    removeWorkerIndex(index);
    return;
  }

  if(!(msg.data instanceof Uint8Array)) {
    console.log("Worker message received but not Uint8Array:", msg.data);
    return;
  }

  console.log("Worker message reply done", msg);
  
  try {
    const { type, imageData, index: fileIndex } = parseMessageBuffer(msg.data);
    console.log(`Parsed message - fileIndex: ${fileIndex}, type: ${type}, imageDataLength: ${imageData.length}`);
    
    const blob = new Blob([imageData], { type: `image/${type}` });
    const url = URL.createObjectURL(blob);
    
    const fileId = `file-${fileIndex}`;
    console.log(`About to update file status for: ${fileId}`);
    
    // Update file status with download URL using the correct file ID
    updateFileStatus(fileId, 'completed', url);
    
    downloadImage(url);
    updateProgress();
  } catch (error) {
    console.error("Error processing worker message:", error);
  }
}

function registerWorkerListening(
  workers: Worker[],
  updateProgress: () => void,
  updateFileStatus: (fileId: string, status: 'completed' | 'error', downloadUrl?: string, error?: string) => void
) {
  workers.forEach((worker, index) => {
    worker.onmessage = function(msg) { onWorkerMessage(worker, msg, index, updateProgress, updateFileStatus) };
  });
}

function App() {
  const [isConverting, setIsConverting] = useState(false);
  const [convertedCount, setConvertedCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [quality, setQuality] = useState(75);
  const [fileList, setFileList] = useState<FileStatus[]>([]);
  const [fileCounter, setFileCounter] = useState(0);
  const [workersInitialized, setWorkersInitialized] = useState(false);

  useEffect(() => {
    window.addEventListener("beforeunload", terminateAllWorkers);
  }, []);

  // Initialize worker listeners once
  useEffect(() => {
    if (!workersInitialized) {
      // We'll register workers when first needed
      setWorkersInitialized(true);
    }
  }, [workersInitialized]);

  const qualityRef = useRef<HTMLInputElement | null>(null);
  const typeRef = useRef<HTMLSelectElement | null>(null);
  const workersRef = useRef<HTMLInputElement | null>(null);
  const getQuality = () => qualityRef?.current?.value ? parseInt(qualityRef?.current?.value) : 100;
  const getType = (): ImageType => typeRef?.current?.value as ImageType;
  const getWorkerCount = () => parseInt(workersRef?.current?.value);

  const updateProgress = () => {
    setConvertedCount(prev => {
      const newCount = prev + 1;
      // Check if all files in current batch are completed or failed
      setFileList(currentFileList => {
        const currentBatchInProgress = currentFileList.filter(f => 
          f.status === 'pending' || f.status === 'processing'
        ).length;
        
        if (currentBatchInProgress <= 1) { // <= 1 because this file is about to complete
          setIsConverting(false);
        }
        return currentFileList;
      });
      return newCount;
    });
  };

  const updateFileStatus = (fileId: string, status: 'completed' | 'error', downloadUrl?: string, error?: string) => {
    console.log(`Updating file status: ${fileId} -> ${status}`);
    setFileList(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status, downloadUrl, error }
        : file
    ));
  };

  async function processFiles(files: FileList) {
    const numberOfWorkers = getWorkerCount();

    if(numberOfWorkers > files.length) {
      alert("Number of workers cannot be greater than number of files.");
      return;
    }

    // Calculate starting index for this batch BEFORE updating counter
    const startingFileIndex = fileCounter;

    // Create new file entries with unique IDs and append to existing list
    const newFiles: FileStatus[] = Array.from(files).map((file, index) => ({
      id: `file-${startingFileIndex + index}`,
      name: file.name,
      size: file.size,
      status: 'pending'
    }));

    // Update file counter for next batch
    setFileCounter(prev => prev + files.length);

    // Append new files to existing list
    setFileList(prev => [...prev, ...newFiles]);
    setIsConverting(true);
    setConvertedCount(0);
    setTotalFiles(files.length);

    // Terminate existing workers and create new ones for this batch
    terminateAllWorkers();
    const workers = createOrGetWorker(numberOfWorkers);
    
    // Register worker listeners for this batch
    registerWorkerListening(workers, updateProgress, updateFileStatus);
    
    const getWorker = (index: number) => {
      return workers[index % numberOfWorkers];
    }

    const numOfFiles = files.length;
    
    for(let i=0; i<numOfFiles; i++) {
      const file = files[i];
      const fileId = `file-${startingFileIndex + i}`;
      
      // Update file status to processing
      setFileList(prev => prev.map(f => 
        f.id === fileId
          ? { ...f, status: 'processing' }
          : f
      ));

      try {
        const uint8Array = await readImageBuffer(file);
        const buffer = buildMessageBuffer({
          type: getType(),
          quality: getQuality(),
          index: startingFileIndex + i,
          imageData: uint8Array
        });

        getWorker(i).postMessage(buffer, [buffer.buffer]);
      } catch (error) {
        // Update file status to error if reading fails
        updateFileStatus(fileId, 'error', undefined, error.message);
      }
    }
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files as FileList;
    if(!files) return;
    await processFiles(files);
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if(files.length > 0) {
      await processFiles(files);
    }
  };

  const clearFileList = () => {
    terminateAllWorkers();
    setFileList([]);
    setTotalFiles(0);
    setConvertedCount(0);
    setIsConverting(false);
    setFileCounter(0);
    setWorkersInitialized(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-xl mb-6">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            HEIC Converter
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Convert HEIC images to JPEG or PNG format. Fast, secure, and completely private.
          </p>
        </div>

        {/* Settings */}
        <div className="card card-hover mb-8 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Output Format */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Output Format
              </label>
              <select 
                ref={typeRef} 
                id="type" 
                className="input-field w-full"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label htmlFor="quality" className="block text-sm font-medium text-gray-700 mb-2">
                Quality ({quality}%)
              </label>
              <input 
                type="range" 
                id="quality" 
                min="1" 
                max="100" 
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                ref={qualityRef} 
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>100</span>
              </div>
            </div>

            {/* Workers */}
            <div>
              <label htmlFor="workers" className="block text-sm font-medium text-gray-700 mb-2">
                Workers
              </label>
              <input 
                type="number" 
                id="workers" 
                min="1" 
                max="8" 
                defaultValue={1} 
                ref={workersRef} 
                className="input-field w-full"
              />
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div 
          className={`card ${
            dragOver ? 'drop-zone-base drop-zone-hover' : 'drop-zone-base'
          } ${isConverting ? 'drop-zone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isConverting ? (
            <div className="py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Converting Images</h3>
              <p className="text-gray-600 mb-4">
                Processing files in current batch...
              </p>
              <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${totalFiles > 0 ? (convertedCount / totalFiles) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="py-12">
              <svg 
                className="mx-auto h-16 w-16 text-gray-400 mb-6" 
                stroke="currentColor" 
                fill="none" 
                viewBox="0 0 48 48"
              >
                <path 
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                  strokeWidth={2} 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Drop HEIC files here
              </h3>
              <p className="text-gray-600 mb-6">
                Or click to browse and select files
              </p>
              
              <label 
                htmlFor="files" 
                className="btn-primary cursor-pointer inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Select Files
              </label>
              <input 
                id="files" 
                type="file" 
                onChange={onChange} 
                accept=".heic,.HEIC" 
                multiple 
                className="hidden"
              />
              
              <div className="flex items-center justify-center space-x-8 mt-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Multiple files
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Private & secure
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  No upload required
                </div>
              </div>
            </div>
          )}
        </div>

        {/* File Status Table */}
        {fileList.length > 0 && (
          <div className="mt-8">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">File Status</h3>
                <button
                  onClick={clearFileList}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  disabled={isConverting}
                >
                  Clear List
                </button>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fileList.map((file) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(file.status)}
                            <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                              {file.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{file.name}</div>
                          {file.error && (
                            <div className="text-xs text-red-500 mt-1">{file.error}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          {file.status === 'completed' && file.downloadUrl ? (
                            <button
                              onClick={() => downloadImage(file.downloadUrl!)}
                              className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                            >
                              Download
                            </button>
                          ) : file.status === 'error' ? (
                            <span className="text-red-500">Failed</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Summary */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  {fileList.filter(f => f.status === 'completed').length} of {fileList.length} files converted
                </div>
                {fileList.filter(f => f.status === 'error').length > 0 && (
                  <div className="text-red-600">
                    {fileList.filter(f => f.status === 'error').length} failed
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {totalFiles > 0 && !isConverting && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">
                Successfully converted {totalFiles} file{totalFiles > 1 ? 's' : ''}!
              </span>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { icon: "⚡", title: "Fast Conversion", desc: "Optimized for speed with web workers" },
            { icon: "🔒", title: "Private & Secure", desc: "All processing happens locally in your browser" },
            // { icon: "📱", title: "Works Everywhere", desc: "Compatible with all modern devices and browsers" }
          ].map((feature, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #374151;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #374151;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

export default App;
