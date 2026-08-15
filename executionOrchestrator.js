// executionOrchestrator.js
/**
 * ⚙️ EXECUTION ORCHESTRATOR v2.0
 * 
 * "Vedúci stavby" — Spúšťa tasks postupne podľa plánu
 * 
 * Flow:
 * 1. Load mission plan
 * 2. Execute tasks sequentially (respecting dependencies)
 * 3. Track progress
 * 4. Handle retries on failure
 * 5. Save results
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolvePolicy } from './src/policy/policy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ExecutionOrchestrator {
    constructor(integrationManager) {
        this.integration = integrationManager;
        this.currentMission = null;
        this.progressCallback = null;
    }

    /**
     * 🚀 MAIN ENTRY POINT
     * Execute a mission plan
     */
    async executeMission(plan, options = {}) {
        this.currentMission = plan;
        this.progressCallback = options.onProgress || this.defaultProgressHandler;

        console.log(`\n⚙️ === EXECUTION ORCHESTRATOR v2.0 === ⚙️\n`);
        console.log(`🎯 Mission: ${plan.mission.goal}`);
        console.log(`📋 Tasks: ${plan.plan.tasks.length}\n`);

        // Update mission status
        plan.execution.status = 'running';
        plan.execution.startedAt = new Date().toISOString();
        this.saveMission(plan);

        const results = [];
        let totalCost = 0;
        let totalTime = 0;

        try {
            // Execute tasks sequentially
            for (let i = 0; i < plan.plan.tasks.length; i++) {
                const task = plan.plan.tasks[i];

                // Check dependencies
                if (!this.areDependenciesMet(task, results)) {
                    throw new Error(`Task ${task.id} dependencies not met: ${task.dependencies.join(', ')}`);
                }

                this.progressCallback({
                    type: 'task_start',
                    taskId: task.id,
                    taskNumber: i + 1,
                    totalTasks: plan.plan.tasks.length,
                    description: task.description
                });

                // Execute task
                const result = await this.executeTask(task, plan, results);

                results.push(result);
                totalCost += result.actualCost;
                totalTime += result.actualTime;

                // Update plan with result
                plan.execution.currentTask = task.id;
                plan.execution.results.push(result);
                plan.execution.totalCost = totalCost;
                plan.execution.totalTime = totalTime;
                this.saveMission(plan);

                this.progressCallback({
                    type: 'task_complete',
                    taskId: task.id,
                    taskNumber: i + 1,
                    totalTasks: plan.plan.tasks.length,
                    result
                });
            }

            // Mission complete
            plan.execution.status = 'completed';
            plan.execution.completedAt = new Date().toISOString();
            this.moveMissionToCompleted(plan);

            this.progressCallback({
                type: 'mission_complete',
                totalCost,
                totalTime,
                results
            });

            return {
                success: true,
                plan,
                results,
                totalCost,
                totalTime
            };

        } catch (error) {
            // Mission failed
            plan.execution.status = 'failed';
            plan.execution.error = error.message;
            this.moveMissionToFailed(plan);

            this.progressCallback({
                type: 'mission_failed',
                error: error.message
            });

            return {
                success: false,
                error: error.message,
                plan,
                results,
                totalCost,
                totalTime
            };
        }
    }

    /**
     * 🎯 Execute single task
     */
    async executeTask(task, mission, previousResults) {
        const startTime = Date.now();
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
            try {
                console.log(`\n   ⚡ Task ${task.id}: ${task.description}`);
                console.log(`      Brain: ${task.brain}/${task.model}`);

                // Build context from previous results
                const context = this.buildTaskContext(task, previousResults);

                // Execute based on brain type
                let output;
                let actualCost = 0;

                if (task.brain === 'cloud' || task.brain === 'groq' || task.brain === 'google') {
                    // Cloud execution
                    output = await this.executeCloudTask(task, mission, context);
                    actualCost = task.estimatedCost; // Will be updated by cloud AI tracking
                } else {
                    // Local execution
                    output = await this.executeLocalTask(task, mission, context);
                    actualCost = 0;
                }

                const actualTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1); // minutes

                // Quality check
                const qualityScore = await this.checkQuality(task, output);

                if (qualityScore < 0.7 && retries < maxRetries) {
                    console.log(`      ⚠️  Low quality (${(qualityScore * 100).toFixed(0)}%), retrying...`);
                    retries++;
                    continue;
                }

                console.log(`      ✅ Complete (${actualTime} min, $${actualCost.toFixed(3)})`);
                console.log(`      📊 Quality: ${(qualityScore * 100).toFixed(0)}%`);

                // Log engine usage and fallback status
                // Cloud result carries { provider:'litellm', ... } (askCloudAI); no `engine` field.
                output.meta = {
                    ...(output?.meta || {}),
                    engine_used: output?.provider || 'local',
                    fallback_used: null, // unknown — actual fallback cannot be proven from the cloud result
                };

                return {
                    taskId: task.id,
                    status: 'completed',
                    output,
                    qualityScore,
                    actualCost,
                    actualTime: parseFloat(actualTime),
                    retries,
                    completedAt: new Date().toISOString()
                };

            } catch (error) {
                console.error(`      ❌ Error: ${error.message}`);

                if (retries < maxRetries) {
                    console.log(`      🔄 Retry ${retries + 1}/${maxRetries}...`);
                    retries++;
                } else {
                    throw new Error(`Task ${task.id} failed after ${maxRetries} retries: ${error.message}`);
                }
            }
        }
    }

    /**
     * ☁️ Execute cloud task
     */
    async executeCloudTask(task, mission, context) {
        const prompt = this.buildTaskPrompt(task, mission, context);

        // Consent (fail-closed, never from env):
        // - task-level deny (allowCloud:false) overrides mission allow
        // - otherwise mission must explicitly allow (allowCloud:true)
        // - no policy anywhere -> BLOCK
        const taskDeny = task?.policy?.allowCloud === false;
        const missionAllow = mission?.policy?.allowCloud === true;
        const allowCloud = missionAllow && !taskDeny;

        const policy = resolvePolicy({ allowCloud }, process.env);

        return await this.integration.askCloudAI(prompt, 'core', {
            policy,
            temperature: 0.7,
            maxTokens: 2000
        });
    }

    /**
     * 🏠 Execute local task
     */
    async executeLocalTask(task, mission, context) {
        const prompt = this.buildTaskPrompt(task, mission, context);

        // Use integration's orchestrator for local execution
        const result = await this.integration.processMessage(prompt, 'core');
        return result.response;
    }

    /**
     * 📝 Build task prompt
     */
    buildTaskPrompt(task, mission, context) {
        let prompt = `${task.description}\n\n`;

        if (context.length > 0) {
            prompt += `Context from previous tasks:\n`;
            context.forEach((ctx, i) => {
                prompt += `\nTask ${i + 1} output:\n${ctx}\n`;
            });
            prompt += `\n`;
        }

        prompt += `Mission goal: ${mission.mission.goal}\n`;
        prompt += `Your task: ${task.description}\n`;

        return prompt;
    }

    /**
     * 🔗 Build context from previous task results
     */
    buildTaskContext(task, previousResults) {
        const context = [];

        // Get results from dependencies
        task.dependencies.forEach(depId => {
            const depResult = previousResults.find(r => r.taskId === depId);
            if (depResult) {
                context.push(depResult.output);
            }
        });

        return context;
    }

    /**
     * ✅ Check if task dependencies are met
     */
    areDependenciesMet(task, completedResults) {
        if (!task.dependencies || task.dependencies.length === 0) {
            return true;
        }

        const completedIds = completedResults.map(r => r.taskId);
        return task.dependencies.every(depId => completedIds.includes(depId));
    }

    /**
     * 📊 Quality check
     */
    async checkQuality(task, output) {
        // Basic quality heuristics
        let score = 1.0;

        // Check 1: Output length
        if (output.length < 50) {
            score -= 0.3; // Too short
        }

        // Check 2: Contains code if it's a code task
        if (task.type === 'code' && !/```/.test(output)) {
            score -= 0.2; // Code task but no code blocks
        }

        // Check 3: Not too repetitive
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
        const words = outputStr.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        if (uniqueWords.size < words.length * 0.3) {
            score -= 0.2; // Too repetitive
        }

        return Math.max(0, Math.min(1, score));
    }

    /**
     * 💾 Save mission state
     */
    saveMission(plan) {
        try {
            const planPath = path.join(__dirname, 'missions', 'active', `${plan.mission.id}.json`);
            fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
        } catch (error) {
            console.error(`Failed to save mission: ${error.message}`);
        }
    }

    /**
     * 📦 Move mission to completed
     */
    moveMissionToCompleted(plan) {
        try {
            const activePath = path.join(__dirname, 'missions', 'active', `${plan.mission.id}.json`);
            const completedPath = path.join(__dirname, 'missions', 'completed', `${plan.mission.id}.json`);

            fs.writeFileSync(completedPath, JSON.stringify(plan, null, 2));
            fs.unlinkSync(activePath);
        } catch (error) {
            console.error(`Failed to move mission to completed: ${error.message}`);
        }
    }

    /**
     * 📦 Move mission to failed
     */
    moveMissionToFailed(plan) {
        try {
            const activePath = path.join(__dirname, 'missions', 'active', `${plan.mission.id}.json`);
            const failedPath = path.join(__dirname, 'missions', 'failed', `${plan.mission.id}.json`);

            fs.writeFileSync(failedPath, JSON.stringify(plan, null, 2));
            fs.unlinkSync(activePath);
        } catch (error) {
            console.error(`Failed to move mission to failed: ${error.message}`);
        }
    }

    /**
     * 📢 Default progress handler
     */
    defaultProgressHandler(event) {
        switch (event.type) {
            case 'task_start':
                console.log(`\n   ▶️  Task ${event.taskNumber}/${event.totalTasks}: ${event.description}`);
                break;

            case 'task_complete':
                const cost = event.result.actualCost > 0 ? `$${event.result.actualCost.toFixed(3)}` : 'FREE';
                console.log(`   ✅ Task ${event.taskNumber} complete (${event.result.actualTime} min, ${cost})`);
                break;

            case 'mission_complete':
                console.log(`\n✅ MISSION COMPLETE!`);
                console.log(`   Total time: ${event.totalTime.toFixed(1)} min`);
                console.log(`   Total cost: $${event.totalCost.toFixed(3)}`);
                break;

            case 'mission_failed':
                console.log(`\n❌ MISSION FAILED: ${event.error}`);
                break;
        }
    }
}

export default ExecutionOrchestrator;
