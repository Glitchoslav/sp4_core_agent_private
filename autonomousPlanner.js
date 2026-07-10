// autonomousPlanner.js
/**
 * 🧠 AUTONOMOUS PLANNER v2.0
 * 
 * "Generál" — Rozloží user goal na executable tasks
 * 
 * Input: User message (napr. "Sprav mi web pre kaviareň")
 * Output: Mission plan (JSON) s task breakdown
 * 
 * Flow:
 * 1. Detect mission type (web/campaign/analysis/product/code/custom)
 * 2. Break down into sub-tasks
 * 3. Assign brain to each task (local/groq/google)
 * 4. Estimate cost/time/risk
 * 5. Return executable plan
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class AutonomousPlanner {
    constructor() {
        this.missionTemplates = this.loadMissionTemplates();
        this.planHistory = [];
    }

    /**
     * 🎯 MAIN ENTRY POINT
     * Detect mission type and create plan
     */
    async createMissionPlan(userGoal, context = {}) {
        console.log('\n🧠 === AUTONOMOUS PLANNER v2.0 === 🧠\n');
        console.log(`📝 Goal: "${userGoal}"\n`);

        // STEP 1: Detect mission type
        const missionType = this.detectMissionType(userGoal);
        console.log(`🎯 Detected mission type: ${missionType.toUpperCase()}`);

        // STEP 2: Load template or generate custom plan
        let plan;
        if (this.missionTemplates[missionType]) {
            plan = this.generateFromTemplate(missionType, userGoal, context);
        } else {
            plan = await this.generateCustomPlan(userGoal, context);
        }

        // STEP 3: Add metadata
        plan.mission.id = this.generateMissionId();
        plan.mission.createdAt = new Date().toISOString();
        plan.mission.context = {
            userInput: userGoal,
            detectedLanguage: this.detectLanguage(userGoal),
            urgency: context.urgency || 'normal',
            budget: context.budget || 'balanced'
        };

        // STEP 4: Save plan
        this.savePlan(plan);

        // STEP 5: Display summary
        this.displayPlanSummary(plan);

        return plan;
    }

    /**
     * 🔍 Detect mission type from user input
     */
    detectMissionType(userGoal) {
        const lower = userGoal.toLowerCase();

        // CAMPAIGN detection (check BEFORE web, because "landing" could be campaign or web)
        if (/kampan|campaign|marketing|ig post|insta.*post|social.*media|reklam|post.*facebook|tweet/.test(lower)) {
            return 'campaign';
        }

        // CODE detection (check BEFORE analysis, because "script" is code not analysis)
        if (/script|bot|api|aplikaci|app|program|kód|function|python|javascript|node\.?js|vytvor.*function|vytvor.*script/.test(lower)) {
            return 'code';
        }

        // WEB detection
        if (/web|site|stránk|landing|portfolio|webpage/.test(lower)) {
            return 'web';
        }

        // ANALYSIS detection
        if (/analýz|analyz|research|report|kompara|porovnaj|vyhodnot/.test(lower)) {
            return 'analysis';
        }

        // PRODUCT detection
        if (/ebook|pdf|guide|template|šablón|manual|návod/.test(lower)) {
            return 'product';
        }

        return 'custom';
    }    /**
     * 📋 Generate plan from mission template
     */
    generateFromTemplate(missionType, userGoal, context) {
        const template = this.missionTemplates[missionType];

        return {
            mission: {
                type: missionType,
                goal: userGoal,
                template: template.name
            },
            plan: {
                estimatedCost: template.avgCost,
                estimatedTime: template.avgTime,
                confidence: 0.85,
                risks: template.commonRisks || [],
                tasks: template.tasks.map((task, index) => ({
                    id: `t${index + 1}`,
                    type: task.type,
                    description: task.description,
                    brain: task.brain,
                    model: task.model,
                    priority: task.priority || 'normal',
                    dependencies: task.dependencies || [],
                    estimatedCost: task.estimatedCost,
                    estimatedTime: task.estimatedTime,
                    retryStrategy: task.retryStrategy || 'fallback_to_groq'
                }))
            },
            execution: {
                status: 'pending',
                startedAt: null,
                completedAt: null,
                currentTask: null,
                results: [],
                totalCost: 0,
                totalTime: 0
            }
        };
    }

    /**
     * 🎨 Generate custom plan (for missions without template)
     */
    async generateCustomPlan(userGoal, context) {
        console.log('   🎨 Generating custom plan...');

        // For now, create a simple single-task plan
        // TODO: Use AI to intelligently break down custom goals
        return {
            mission: {
                type: 'custom',
                goal: userGoal
            },
            plan: {
                estimatedCost: 0.10,
                estimatedTime: 15,
                confidence: 0.60,
                risks: ['Custom mission - may need adjustment'],
                tasks: [
                    {
                        id: 't1',
                        type: 'general',
                        description: userGoal,
                        brain: 'groq',
                        model: 'llama-3.3-70b-versatile',
                        priority: 'normal',
                        dependencies: [],
                        estimatedCost: 0.10,
                        estimatedTime: 15,
                        retryStrategy: 'fallback_to_local'
                    }
                ]
            },
            execution: {
                status: 'pending',
                startedAt: null,
                completedAt: null,
                currentTask: null,
                results: [],
                totalCost: 0,
                totalTime: 0
            }
        };
    }

    /**
     * 📊 Display plan summary
     */
    displayPlanSummary(plan) {
        console.log(`\n📊 MISSION PLAN SUMMARY:\n`);
        console.log(`   Type: ${plan.mission.type.toUpperCase()}`);
        console.log(`   Tasks: ${plan.plan.tasks.length}`);
        console.log(`   Est. Cost: $${plan.plan.estimatedCost.toFixed(2)}`);
        console.log(`   Est. Time: ${plan.plan.estimatedTime} min`);
        console.log(`   Confidence: ${(plan.plan.confidence * 100).toFixed(0)}%`);

        if (plan.plan.risks.length > 0) {
            console.log(`\n   ⚠️  Risks:`);
            plan.plan.risks.forEach(risk => {
                console.log(`      - ${risk}`);
            });
        }

        console.log(`\n   📋 Task Breakdown:`);
        plan.plan.tasks.forEach((task, i) => {
            const deps = task.dependencies.length > 0 ? ` (needs: ${task.dependencies.join(', ')})` : '';
            console.log(`      [${i + 1}] ${task.description}`);
            console.log(`          → ${task.brain}/${task.model}`);
            console.log(`          → $${task.estimatedCost.toFixed(2)}, ~${task.estimatedTime} min${deps}`);
        });

        console.log();
    }

    /**
     * 🔤 Detect language
     */
    detectLanguage(text) {
        // Simple Slovak detection
        if (/[áäčďéíľňóôŕšťúýž]/i.test(text)) {
            return 'sk';
        }
        return 'en';
    }

    /**
     * 🆔 Generate unique mission ID
     */
    generateMissionId() {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const timeStr = date.getTime().toString().slice(-6);
        return `m_${dateStr}_${timeStr}`;
    }

    /**
     * 💾 Save plan to active missions
     */
    savePlan(plan) {
        try {
            const planPath = path.join(__dirname, 'missions', 'active', `${plan.mission.id}.json`);
            fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
            console.log(`   💾 Plan saved: missions/active/${plan.mission.id}.json`);
        } catch (error) {
            console.error(`   ❌ Failed to save plan: ${error.message}`);
        }
    }

    /**
     * 📚 Load mission templates
     */
    loadMissionTemplates() {
        const templatesPath = path.join(__dirname, 'missions', 'templates');
        const templates = {};

        try {
            const files = fs.readdirSync(templatesPath);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const templateName = file.replace('.json', '');
                    const templatePath = path.join(templatesPath, file);
                    templates[templateName] = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
                }
            });
        } catch (error) {
            console.log('   ℹ️  No templates loaded (templates folder empty or missing)');
        }

        return templates;
    }
}

export default AutonomousPlanner;
