
interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const compareX = (a: TextItem, b: TextItem) => a.x - b.x;

// Variant 2: Current (Optimistic sorting with lastX)
const extractRowsCurrent = (items: TextItem[]): TextItem[][] => {
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

// Variant 4: Skip LastX Update Only
const extractRowsSkipLastX = (items: TextItem[]): TextItem[][] => {
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
                     } else {
                        lastX = item.x;
                     }
                 }
                 currentRow.push(item);
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

// Variant 5: Skip LastX + NoAbs
const extractRowsSkipLastXNoAbs = (items: TextItem[]): TextItem[][] => {
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
            // Since items are sorted by Y, item.y >= currentY is always true.
            if ((item.y - currentY) <= TOLERANCE) {
                 if (isRowSorted) {
                     if (item.x < lastX) {
                        isRowSorted = false;
                     } else {
                        lastX = item.x;
                     }
                 }
                 currentRow.push(item);
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
    const COUNT = 2000000;
    console.log(`Generating ${COUNT} items...`);
    const data = generateData(COUNT);

    // Clone data for each run to ensure fair comparison (sort modifies in-place)
    const data1 = data.map(i => ({...i}));
    const data2 = data.map(i => ({...i}));
    const data3 = data.map(i => ({...i}));

    console.log("Running Current...");
    const start1 = performance.now();
    extractRowsCurrent(data1);
    const end1 = performance.now();
    console.log(`Current: ${(end1 - start1).toFixed(2)}ms`);

    console.log("Running SkipLastX...");
    const start2 = performance.now();
    extractRowsSkipLastX(data2);
    const end2 = performance.now();
    console.log(`SkipLastX: ${(end2 - start2).toFixed(2)}ms`);

    console.log("Running SkipLastXNoAbs...");
    const start3 = performance.now();
    extractRowsSkipLastXNoAbs(data3);
    const end3 = performance.now();
    console.log(`SkipLastXNoAbs: ${(end3 - start3).toFixed(2)}ms`);

    // Calculate improvements
    const impSkip = ((end1 - start1) - (end2 - start2)) / (end1 - start1) * 100;
    const impNoAbs = ((end1 - start1) - (end3 - start3)) / (end1 - start1) * 100;

    console.log(`--- Results ---`);
    console.log(`Current vs SkipLastX Improvement: ${impSkip.toFixed(2)}%`);
    console.log(`Current vs SkipLastXNoAbs Improvement: ${impNoAbs.toFixed(2)}%`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runBenchmark();
}
