
import { performance } from 'perf_hooks';

const iterations = 50; // Increased iterations for stability
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

// 1. Bad Implementation (Regex in Sort)
function badImplementation(files) {
    const slideFiles = files.filter(name => /ppt\/slides\/slide\d+\.xml/.test(name));
    slideFiles.sort((a, b) => {
         const matchA = a.match(/slide(\d+)\.xml/);
         const matchB = b.match(/slide(\d+)\.xml/);
         const numA = matchA ? parseInt(matchA[1]) : 0;
         const numB = matchB ? parseInt(matchB[1]) : 0;
         return numA - numB;
    });
    return slideFiles;
}

// 2. Regex Implementation (1 Regex + Number) - Previously "Proposed"
const slideRegex = /ppt\/slides\/slide(\d+)\.xml/;
function regexImplementation(files) {
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

// 3. Current String Ops Implementation (substring + Number)
const prefix = 'ppt/slides/slide';
const suffix = '.xml';
const prefixLen = prefix.length;
const suffixLen = suffix.length;

function currentStringOpsImplementation(files) {
    const slideFilesData = [];
    for (const name of files) {
        if (name.startsWith(prefix) && name.endsWith(suffix)) {
            const numStr = name.substring(prefixLen, name.length - suffixLen);
            if (numStr.length > 0) {
                const num = Number(numStr);
                if (!isNaN(num)) {
                    slideFilesData.push({
                        name,
                        num
                    });
                }
            }
        }
    }
    return slideFilesData
        .sort((a, b) => a.num - b.num)
        .map(item => item.name);
}

// 4. Proposed String Ops Implementation (slice + parseInt)
function proposedStringOpsImplementation(files) {
    const slideFilesData = [];
    for (const name of files) {
        // Optimization: startsWith check is fast
        if (name.startsWith(prefix) && name.endsWith(suffix)) {
            // slice(prefixLen) gets "123.xml" or "123"
            // parseInt parses until non-digit, so "123.xml" becomes 123
            const num = parseInt(name.slice(prefixLen));
            if (!isNaN(num)) {
                slideFilesData.push({
                    name,
                    num
                });
            }
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
    console.log(`${name}: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(3)}ms avg`);
    return result;
}

console.log('--- Benchmarking ---');

try {
    const res1 = benchmark('Bad (Regex in Sort)', badImplementation);
    const res2 = benchmark('Regex (1 Regex Outside)', regexImplementation);
    const res3 = benchmark('Current StringOps (substring+Number)', currentStringOpsImplementation);
    const res4 = benchmark('Proposed StringOps (slice+parseInt)', proposedStringOpsImplementation);

    // Verify
    console.log('--- Verification ---');
    const json1 = JSON.stringify(res1);
    const json2 = JSON.stringify(res2);
    const json3 = JSON.stringify(res3);
    const json4 = JSON.stringify(res4);

    if (json1 === json2 && json2 === json3 && json3 === json4) {
        console.log('✅ All implementations produce identical results.');
    } else {
        console.error('❌ Mismatch in results!');
        console.log('Bad length:', res1.length);
        console.log('Regex length:', res2.length);
        console.log('Current length:', res3.length);
        console.log('Proposed length:', res4.length);
    }

} catch (e) {
    console.error(e);
}
