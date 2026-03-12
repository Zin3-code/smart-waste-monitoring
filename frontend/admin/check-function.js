const fs = require('fs');
const appJS = fs.readFileSync('app.js', 'utf8');

const loadSectionDataMatch = appJS.match(/function loadSectionData\([\s\S]*?\}/);

if (loadSectionDataMatch) {
    console.log('✅ loadSectionData function found');
    console.log('Function content:');
    console.log(loadSectionDataMatch[0]);
} else {
    console.log('❌ loadSectionData function not found');
}
