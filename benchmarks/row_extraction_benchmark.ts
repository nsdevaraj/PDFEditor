
interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const compareX = (a: TextItem, b: TextItem) => a.x - b.x;

// Variant 1: Naive (Always sort)
const extractRowsNaive = (items: TextItem[]): TextItem[][] => {
    const TOLERANCE = 5;
    const rows: TextItem[][] = [];
    const len = items.length;

    // Sort by Y (top to bottom) - included in all variants as baseline
    items.sort((a, b) => a.y - b.y);

    let currentRow: TextItem[] = [];
    let currentY = -1;

    if (len > 0) {
        currentRow.push(items[0]);
        currentY = items[0].y;

        for (let i = 1; i < len; i++) {
            const item = items[i];
            if (Math.abs(item.y - currentY) <= TOLERANCE) {
                 currentRow.push(item);
            } else {
                 currentRow.sort(compareX); // Always sort
                 rows.push(currentRow);
                 currentRow = [item];
                 currentY = item.y;
            }
        }
        currentRow.sort(compareX); // Always sort
        rows.push(currentRow);
    }
    return rows;
};

// Variant 2: Current (Optimistic sorting with array access)
const extractRowsCurrent = (items: TextItem[]): TextItem[][] => {
    const TOLERANCE = 5;
    const rows: TextItem[][] = [];
    const len = items.length;

    items.sort((a, b) => a.y - b.y);

    let currentRow: TextItem[] = [];
    let currentY = -1;
    let isRowSorted = true;

    if (len > 0) {
        currentRow.push(items[0]);
        currentY = items[0].y;

        for (let i = 1; i < len; i++) {
            const item = items[i];
            if (Math.abs(item.y - currentY) <= TOLERANCE) {
                 if (isRowSorted && item.x < currentRow[currentRow.length - 1].x) {
                    isRowSorted = false;
                 }
                 currentRow.push(item);
            } else {
                 if (!isRowSorted) {
                    currentRow.sort(compareX);
                 }
                 rows.push(currentRow);
                 currentRow = [item];
                 currentY = item.y;
                 isRowSorted = true;
            }
        }
        if (!isRowSorted) {
            currentRow.sort(compareX);
        }
        rows.push(currentRow);
    }
    return rows;
};

// Variant 3: Optimized (Optimistic sorting with lastX variable)
const extractRowsOptimized = (items: TextItem[]): TextItem[][] => {
    const TOLERANCE = 5;
    const rows: TextItem[][] = [];
    const len = items.length;

    items.sort((a, b) => a.y - b.y);

    let currentRow: TextItem[] = [];
    let currentY = -1;
    let isRowSorted = true;
    let lastX = -Infinity;

    if (len > 0) {
        currentRow.push(items[0]);
        currentY = items[0].y;
        lastX = items[0].x;

        for (let i = 1; i < len; i++) {
            const item = items[i];
            if (Math.abs(item.y - currentY) <= TOLERANCE) {
                 if (isRowSorted) {
                     if (item.x < lastX) {
                        isRowSorted = false;
                     }
                 }
                 currentRow.push(item);
                 lastX = item.x;
            } else {
                 if (!isRowSorted) {
                    currentRow.sort(compareX);
                 }
                 rows.push(currentRow);
                 currentRow = [item];
                 currentY = item.y;
                 lastX = item.x;
                 isRowSorted = true;
            }
        }
        if (!isRowSorted) {
            currentRow.sort(compareX);
        }
        rows.push(currentRow);
    }
    return rows;
};

// Data Generation
const generateData = (count: number): TextItem[] => {
    const items: TextItem[] = [];
    for (let i = 0; i < count; i++) {
        // Create rows roughly
        const row = Math.floor(i / 50);
        // Randomize X within row, sometimes sorted, sometimes not
        const x = (i % 50) * 10 + (Math.random() > 0.8 ? -50 : 0);
        const y = row * 20 + (Math.random() * 2); // Slight Y variation
        items.push({
            str: "test",
            x,
            y,
            width: 10,
            height: 10
        });
    }
    // Shuffle items to simulate unsorted input from PDF
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
};

const runBenchmark = () => {
    const COUNT = 200000;
    console.log(`Generating ${COUNT} items...`);
    const data = generateData(COUNT);

    // Clone data for each run to ensure fair comparison (sort modifies in-place)
    const data1 = data.map(i => ({...i}));
    const data2 = data.map(i => ({...i}));
    const data3 = data.map(i => ({...i}));

    console.log("Running Naive...");
    const start1 = performance.now();
    extractRowsNaive(data1);
    const end1 = performance.now();
    console.log(`Naive: ${(end1 - start1).toFixed(2)}ms`);

    console.log("Running Current...");
    const start2 = performance.now();
    extractRowsCurrent(data2);
    const end2 = performance.now();
    console.log(`Current: ${(end2 - start2).toFixed(2)}ms`);

    console.log("Running Optimized...");
    const start3 = performance.now();
    extractRowsOptimized(data3);
    const end3 = performance.now();
    console.log(`Optimized: ${(end3 - start3).toFixed(2)}ms`);

    // Calculate improvements
    const impCurrent = ((end1 - start1) - (end2 - start2)) / (end1 - start1) * 100;
    const impOptimized = ((end2 - start2) - (end3 - start3)) / (end2 - start2) * 100;
    const totalImp = ((end1 - start1) - (end3 - start3)) / (end1 - start1) * 100;

    console.log(`--- Results ---`);
    console.log(`Naive vs Current Improvement: ${impCurrent.toFixed(2)}%`);
    console.log(`Current vs Optimized Improvement: ${impOptimized.toFixed(2)}%`);
    console.log(`Total Improvement (Naive vs Optimized): ${totalImp.toFixed(2)}%`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runBenchmark();
}
