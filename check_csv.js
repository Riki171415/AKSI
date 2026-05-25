const { icdMap } = require('./backend/utils/csvLoader');
let levels = new Set();
for (let [code, needed] of icdMap.entries()) {
    for (let n of needed) {
        levels.add(n.level);
    }
}
console.log(Array.from(levels));
