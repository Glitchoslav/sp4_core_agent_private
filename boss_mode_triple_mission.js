// 🔥 BOSS MODE: Triple Mission Execution
// Mission 1: Railway deployment guide
// Mission 2: React frontend with API
// Mission 3: Message input persistence

import { SP4IntegratedAgent } from './integration.js';

async function bossModeTripleMission() {
    console.log('🔥 === BOSS MODE: TRIPLE MISSION === 🔥\n');

    const agent = new SP4IntegratedAgent({
        name: 'SP4-Boss-Mode',
        role: 'Autonomous Full-Stack Developer',
        backstory: 'Elite AI agent executing multiple complex tasks autonomously'
    });

    const missions = [
        {
            id: 1,
            goal: 'Vytvor Railway deployment konfiguráciu pre SP4 backend - railway.json, Procfile, environment setup, FREE tier optimalizácia',
            type: 'CODE',
            priority: 'high',
            context: 'Backend beží na localhost:3000, SQLite DB, Express + Sequelize, treba migrovať na Railway s PostgreSQL'
        },
        {
            id: 2,
            goal: 'Vytvor React frontend komponent HomePage.jsx - fetch /sp4-info z API, zobraziť názov/popis/misiu/víziu, moderný design s tailwind',
            type: 'WEB',
            priority: 'high',
            context: 'API endpoint: http://localhost:3000/sp4-info, React 18, use modern hooks, responsive design'
        },
        {
            id: 3,
            goal: 'Vytvor MessageInput komponent - input field + submit button, POST /messages endpoint, uložiť do DB (meno, správa, timestamp)',
            type: 'CODE',
            priority: 'medium',
            context: 'Backend má Sequelize, pridať Message model + controller + routes, frontend React komponent s validation'
        }
    ];

    const results = [];

    for (const mission of missions) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 MISSION ${mission.id}: ${mission.goal.substring(0, 50)}...`);
        console.log(`${'='.repeat(60)}\n`);

        const startTime = Date.now();

        try {
            const result = await agent.executeMission({
                goal: mission.goal,
                type: mission.type,
                context: mission.context,
                maxBudget: 0.15 // $0.15 per mission
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            results.push({
                mission: mission.id,
                goal: mission.goal,
                status: 'SUCCESS',
                duration: `${duration}s`,
                cost: result.totalCost || 'N/A',
                tasksCompleted: result.completedTasks || 0,
                output: result.output || result.result
            });

            console.log(`\n✅ MISSION ${mission.id} COMPLETE!`);
            console.log(`   Duration: ${duration}s`);
            console.log(`   Cost: $${result.totalCost || 0}`);

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            results.push({
                mission: mission.id,
                goal: mission.goal,
                status: 'FAILED',
                duration: `${duration}s`,
                error: error.message
            });

            console.error(`\n❌ MISSION ${mission.id} FAILED: ${error.message}`);
        }
    }

    // Final Report
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 BOSS MODE TRIPLE MISSION - FINAL REPORT');
    console.log('='.repeat(70) + '\n');

    results.forEach((result, index) => {
        console.log(`Mission ${result.mission}: ${result.status === 'SUCCESS' ? '✅' : '❌'} ${result.status}`);
        console.log(`  Goal: ${result.goal.substring(0, 60)}...`);
        console.log(`  Duration: ${result.duration}`);
        if (result.cost) console.log(`  Cost: $${result.cost}`);
        if (result.tasksCompleted) console.log(`  Tasks: ${result.tasksCompleted}`);
        if (result.error) console.log(`  Error: ${result.error}`);
        console.log('');
    });

    const totalSuccess = results.filter(r => r.status === 'SUCCESS').length;
    const totalDuration = results.reduce((sum, r) => sum + parseFloat(r.duration), 0);
    const totalCost = results.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);

    console.log('='.repeat(70));
    console.log(`🎯 SUCCESS RATE: ${totalSuccess}/${missions.length} (${Math.round(totalSuccess / missions.length * 100)}%)`);
    console.log(`⏱️  TOTAL TIME: ${totalDuration.toFixed(1)}s`);
    console.log(`💰 TOTAL COST: $${totalCost.toFixed(2)}`);
    console.log('='.repeat(70) + '\n');

    if (totalSuccess === missions.length) {
        console.log('🔥🔥🔥 BOSS MODE COMPLETE - ALL MISSIONS SUCCESSFUL! 🔥🔥🔥\n');
        console.log('📦 DELIVERABLES:');
        console.log('   ✅ Railway deployment config ready');
        console.log('   ✅ React frontend HomePage component');
        console.log('   ✅ Message input system (DB + API + UI)');
        console.log('\n🚀 NEXT: Deploy to Railway, run React app, test live!');
    } else {
        console.log('⚠️  Some missions failed - review errors above');
    }

    return results;
}

// Execute
bossModeTripleMission()
    .then(results => {
        console.log('\n✨ Boss mode execution completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Boss mode error:', error);
        process.exit(1);
    });
