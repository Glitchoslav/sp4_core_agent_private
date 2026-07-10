// 🚀 MISSION: React Frontend Components (HomePage + MessageInput)
import { SP4IntegratedAgent } from './integration.js';

async function generateReactFrontend() {
    console.log('🎯 === REACT FRONTEND GENERATION MISSION === 🎯\n');

    const agent = new SP4IntegratedAgent({
        name: 'SP4-Frontend-Generator',
        role: 'React Frontend Developer',
        backstory: 'Expert in modern React development with Tailwind CSS'
    });

    const goal = `
Vytvor 2 React komponenty pre SP4 landing page:

1. HomePage.jsx:
   - Fetch data z http://localhost:3000/sp4-info
   - Zobraz: názov, popis, misia, vízia
   - Moderný design s Tailwind CSS
   - Responsive layout
   - Loading state + error handling
   - Animated entrance (fade-in)

2. MessageInput.jsx:
   - Input pole pre meno (2-100 znakov)
   - Textarea pre správu (10-1000 znakov)
   - Submit button
   - POST na http://localhost:3000/messages
   - Validácia + error messages
   - Success notification
   - Reset form po odoslaní
   - Tailwind styling

Vytvor aj App.jsx ktorý oba komponenty kombinuje.
Použiť React 18 hooks (useState, useEffect), axios pre API calls.
Moderný, minimalistický dizajn v štýle SP4 (dark mode friendly).
`;

    const context = `
Tech stack:
- React 18
- Tailwind CSS
- Axios
- Modern hooks

API endpoints:
- GET http://localhost:3000/sp4-info → {nazov, popis, misia, vizia}
- POST http://localhost:3000/messages → {meno, sprava}

Design style:
- Dark/cyberpunk theme
- Gradient accents
- Smooth animations
- Mobile-first responsive
`;

    try {
        console.log('🚀 Launching Full Autonomy v2.0...\n');

        const result = await agent.executeMission({
            goal: goal,
            type: 'WEB',
            context: context,
            maxBudget: 0.20
        });

        console.log('\n✅ MISSION COMPLETE!');
        console.log(`📊 Tasks: ${result.completedTasks || 0}`);
        console.log(`💰 Cost: $${result.totalCost || 0}`);
        console.log(`⏱️  Duration: ${result.duration || 'N/A'}`);

        if (result.output) {
            console.log('\n📦 GENERATED FILES:');
            console.log(result.output);
        }

        return result;

    } catch (error) {
        console.error('\n❌ MISSION FAILED:', error.message);
        throw error;
    }
}

// Execute
generateReactFrontend()
    .then(result => {
        console.log('\n🎉 React frontend generation completed!');
        console.log('📁 Check missions/active/ folder for component code');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Error:', error);
        process.exit(1);
    });
