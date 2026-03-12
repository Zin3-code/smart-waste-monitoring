const level = 69;
let newStatus = 'empty';

console.log('Testing status calculation:');
console.log('Level:', level);

if (level >= 85) {
  newStatus = 'full';
  console.log('  ≥ 85 → full');
} else if (level >= 65) {
  newStatus = 'near-full';
  console.log('  ≥ 65 → near-full');
} else if (level >= 50) {
  newStatus = 'medium';
  console.log('  ≥ 50 → medium');
} else if (level >= 25) {
  newStatus = 'low';
  console.log('  ≥ 25 → low');
} else {
  newStatus = 'empty';
  console.log('  < 25 → empty');
}

console.log('Final status:', newStatus);
