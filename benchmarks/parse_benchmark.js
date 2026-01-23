const iterations = 1000000;
const str = "12345";

console.time('parseInt');
for (let i = 0; i < iterations; i++) {
    parseInt(str);
}
console.timeEnd('parseInt');

console.time('Number');
for (let i = 0; i < iterations; i++) {
    Number(str);
}
console.timeEnd('Number');

console.time('Unary Plus');
for (let i = 0; i < iterations; i++) {
    +str;
}
console.timeEnd('Unary Plus');
