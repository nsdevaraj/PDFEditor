
import { performance } from 'perf_hooks';

const iterations = 100;
const fileCount = 10000;

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

const slideRegexUnanchored = /ppt\/slides\/slide(\d+)\.xml/;
const slideRegexAnchored = /^ppt\/slides\/slide(\d+)\.xml$/;

function benchmark(name, regex) {
    const start = performance.now();
    let count = 0;
    for (let i = 0; i < iterations; i++) {
        for (const f of allFiles) {
            if (f.match(regex)) {
                count++;
            }
        }
    }
    const end = performance.now();
    console.log(`${name}: ${(end - start).toFixed(2)}ms`);
    return count;
}

console.log('--- Benchmarking Anchored vs Unanchored Regex ---');
benchmark('Unanchored', slideRegexUnanchored);
benchmark('Anchored', slideRegexAnchored);
