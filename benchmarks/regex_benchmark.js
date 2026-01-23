
import { performance } from 'perf_hooks';

const iterations = 20; // Enough to get stable numbers
const fileCount = 5000; // Simulate a large PPTX

// Generate mock files
const allFiles = [];
for (let i = 1; i <= fileCount; i++) {
    allFiles.push(`ppt/slides/slide${i}.xml`);
    allFiles.push(`ppt/media/image${i}.png`);
    allFiles.push(`ppt/theme/theme${i}.xml`);
    allFiles.push(`ppt/slides/_rels/slide${i}.xml.rels`);
}
// Shuffle
allFiles.sort(() => Math.random() - 0.5);

console.log(`Total files in zip: ${allFiles.length}`);

// 1. Bad Implementation (Simulating the issue)
function badImplementation(files) {
    // First we filter to get the slides
    const slideFiles = files.filter(name => /ppt\/slides\/slide\d+\.xml/.test(name));

    // The problematic sort
    slideFiles.sort((a, b) => {
         const matchA = a.match(/slide(\d+)\.xml/);
         const matchB = b.match(/slide(\d+)\.xml/);
         const numA = matchA ? parseInt(matchA[1]) : 0;
         const numB = matchB ? parseInt(matchB[1]) : 0;
         return numA - numB;
    });
    return slideFiles;
}

// 2. Current Implementation (Optimized, Loop-Sort-Map, 2 Regexes)
const slideNameRegex = /slide(\d+)\.xml/;
const slidePathRegex = /ppt\/slides\/slide\d+\.xml/;

function currentImplementation(files) {
    const slideFilesData = [];
    for (const name of files) {
        if (slidePathRegex.test(name)) {
            const match = name.match(slideNameRegex);
            slideFilesData.push({
                name,
                num: match ? parseInt(match[1]) : 0
            });
        }
    }
    return slideFilesData
        .sort((a, b) => a.num - b.num)
        .map(item => item.name);
}

// 3. Proposed Implementation (Optimized, Loop-Sort-Map, 1 Regex)
const slideRegex = /ppt\/slides\/slide(\d+)\.xml/;

function proposedImplementation(files) {
    const slideFilesData = [];
    for (const name of files) {
        const match = name.match(slideRegex);
        if (match) {
            slideFilesData.push({
                name,
                num: Number(match[1])
            });
        }
    }
    return slideFilesData
        .sort((a, b) => a.num - b.num)
        .map(item => item.name);
}

// Benchmark Runner
function benchmark(name, fn) {
    const start = performance.now();
    let result;
    for (let i = 0; i < iterations; i++) {
        result = fn(allFiles);
    }
    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / iterations;
    console.log(`${name}: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms avg`);
    return result;
}

console.log('--- Benchmarking ---');

try {
    const res1 = benchmark('Bad (Regex in Sort)', badImplementation);
    const res2 = benchmark('Old (2 Regexes)', currentImplementation);
    const res3 = benchmark('Current (1 Regex + Number)', proposedImplementation);

    // Verify
    console.log('--- Verification ---');
    const json1 = JSON.stringify(res1);
    const json2 = JSON.stringify(res2);
    const json3 = JSON.stringify(res3);

    if (json1 === json2 && json2 === json3) {
        console.log('✅ All implementations produce identical results.');
    } else {
        console.error('❌ Mismatch in results!');
        console.log('Bad length:', res1.length);
        console.log('Old length:', res2.length);
        console.log('Current length:', res3.length);
    }

} catch (e) {
    console.error(e);
}
