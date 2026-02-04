// Benchmark: Comparing file reading strategies (simulated)
// This script simulates the cost of reading a file as DataURL (Base64) vs ArrayBuffer.

import { performance } from 'perf_hooks';
import { Buffer } from 'buffer';

const sizeMB = 50; // 50MB
const buffer = Buffer.alloc(sizeMB * 1024 * 1024, 'a');

console.log(`Benchmarking file processing for a ${sizeMB}MB file...`);

// 1. ArrayBuffer Strategy (Simulated)
const startArrayBuffer = performance.now();
// In browser: await file.arrayBuffer() -> returns ArrayBuffer
// Simulating overhead: copying buffer (though in browser it's just a view/slice)
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const uint8Array1 = new Uint8Array(arrayBuffer);
const endArrayBuffer = performance.now();
const timeArrayBuffer = endArrayBuffer - startArrayBuffer;
console.log(`ArrayBuffer Strategy: ${timeArrayBuffer.toFixed(2)}ms`);

// 2. Base64 Strategy (Simulated)
const startBase64 = performance.now();
// In browser: FileReader.readAsDataURL() -> produces Base64 string
const base64String = buffer.toString('base64');
// In browser: atob() -> decodes Base64 string to binary string
const binaryString = Buffer.from(base64String, 'base64').toString('binary');
// In browser: Loop over string to create Uint8Array
const len = binaryString.length;
const uint8Array2 = new Uint8Array(len);
for (let i = 0; i < len; i++) {
    uint8Array2[i] = binaryString.charCodeAt(i);
}
const endBase64 = performance.now();
const timeBase64 = endBase64 - startBase64;
console.log(`Base64 Strategy: ${timeBase64.toFixed(2)}ms`);

const improvement = (timeBase64 / timeArrayBuffer).toFixed(1);
console.log(`\nArrayBuffer is ~${improvement}x faster!`);
