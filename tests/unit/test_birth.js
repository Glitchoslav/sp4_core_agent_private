// Quick test for Birth Ritual
import { processBirthAnswer, startBirthRitual } from './src/rituals/birthRitual.js';

console.log('\n🌱 TEST: Birth Ritual\n');

// Start ritual
const start = startBirthRitual();
console.log(start.question);
console.log('\n---\n');

// Answer 1
console.log('📝 Odpoveď 1: "Som tvorca, nie konzument. Som Kefyk."');
let result1 = await processBirthAnswer('Som tvorca, nie konzument. Som Kefyk.');
if (!result1.complete) {
    console.log('\n' + result1.nextQuestion);
}
console.log('\n---\n');

// Answer 2
console.log('📝 Odpoveď 2: "Hľadám pravdu a slobodu. Chcem vlastný AI nástroj."');
let result2 = await processBirthAnswer('Hľadám pravdu a slobodu. Chcem vlastný AI nástroj.');
if (!result2.complete) {
    console.log('\n' + result2.nextQuestion);
}
console.log('\n---\n');

// Answer 3
console.log('📝 Odpoveď 3: "Bojím sa, že zlyhám. Že to bude príliš zložité."');
let result3 = await processBirthAnswer('Bojím sa, že zlyhám. Že to bude príliš zložité.');

if (result3.complete) {
    console.log('\n✅ RITUAL COMPLETE!\n');
    console.log(result3.message);
}

console.log('\n✅ Birth Ritual test complete');
process.exit(0);
