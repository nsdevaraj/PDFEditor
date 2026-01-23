
import { performance } from 'perf_hooks';

const iterations = 50;
const fileCount = 10000;

// Generate mock data
const slideFilesData = [];
for (let i = 1; i <= fileCount; i++) {
    slideFilesData.push({
        name: `ppt/slides/slide${i}.xml`,
        num: i
    });
}
// Shuffle
slideFilesData.sort(() => Math.random() - 0.5);

console.log(`Testing with ${fileCount} items over ${iterations} iterations.`);

function withMap(data) {
    // Clone to be fair
    const localData = [...data];

    // Sort
    const sorted = localData.sort((a, b) => a.num - b.num);

    // Map
    const mapped = sorted.map(item => item.name);

    // Iterate (simulate usage)
    let len = 0;
    for (let i = 0; i < mapped.length; i++) {
        len += mapped[i].length;
    }
    return len;
}

function withoutMap(data) {
    // Clone to be fair
    const localData = [...data];

    // Sort
    const sorted = localData.sort((a, b) => a.num - b.num);

    // Iterate directly (No Map)
    let len = 0;
    for (let i = 0; i < sorted.length; i++) {
        len += sorted[i].name.length;
    }
    return len;
}

function benchmark(name, fn) {
    const start = performance.now();
    let result;
    for (let i = 0; i < iterations; i++) {
        result = fn(slideFilesData);
    }
    const end = performance.now();
    console.log(`${name}: ${(end - start).toFixed(2)}ms total`);
    return result;
}

const r1 = benchmark('With Map', withMap);
const r2 = benchmark('Without Map', withoutMap);

if (r1 === r2) {
    console.log('✅ Results match');
} else {
    console.error('❌ Results mismatch', r1, r2);
}
