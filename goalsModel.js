// goalsModel.js
// 🎯 SP4 Goals - thin layer over memory system
// Minimalistický goal tracking bez bullshit featúr

import { addLogEntry, loadMemory, saveMemory } from './memory.js';

/**
 * Nastaví nový aktívny cieľ
 * @param {string} goalText - Text cieľa
 * @returns {Object} - { success, goal }
 */
export async function setGoal(goalText) {
    if (!goalText || goalText.trim().length === 0) {
        return { success: false, error: 'Prázdny cieľ' };
    }

    const state = await loadMemory();
    const now = new Date().toISOString();

    // Označiť predošlý aktívny goal ako "paused" (ak existuje)
    if (state.goals && state.goals.length > 0) {
        const lastActive = state.goals.find(g => g.status === 'active');
        if (lastActive) {
            lastActive.status = 'paused';
            lastActive.paused_at = now;
        }
    }

    // Vytvoriť nový goal
    const newGoal = {
        id: `goal_${Date.now()}`,
        text: goalText.trim(),
        status: 'active',
        created_at: now,
        updated_at: now
    };

    if (!state.goals) state.goals = [];
    state.goals.unshift(newGoal); // Pridať na začiatok

    await saveMemory(state);

    // Log do memory (input, reply, mode, metadata)
    await addLogEntry(
        `/goal ${goalText}`,
        `🎯 Nový cieľ nastavený: "${goalText}"`,
        'core',
        { type: 'command', command: 'goal', action: 'set', goal_id: newGoal.id }
    );

    return { success: true, goal: newGoal };
}

/**
 * Vráti aktuálny aktívny cieľ + históriu
 * @returns {Object} - { active, recent }
 */
export async function getGoals() {
    const state = await loadMemory();

    if (!state.goals || state.goals.length === 0) {
        return { active: null, recent: [] };
    }

    const active = state.goals.find(g => g.status === 'active');
    const recent = state.goals.slice(0, 10); // Max 10

    return { active, recent };
}

/**
 * Zoznam všetkých cieľov
 * @returns {Array} - Array of goals
 */
export async function listGoals() {
    const state = await loadMemory();
    return state.goals || [];
}

/**
 * Označí aktívny cieľ ako done
 * @returns {Object} - { success, goal }
 */
export async function completeGoal() {
    const state = await loadMemory();

    if (!state.goals || state.goals.length === 0) {
        return { success: false, error: 'Žiadne aktívne ciele' };
    }

    const activeGoal = state.goals.find(g => g.status === 'active');

    if (!activeGoal) {
        return { success: false, error: 'Žiadny aktívny cieľ' };
    }

    const now = new Date().toISOString();
    activeGoal.status = 'done';
    activeGoal.done_at = now;
    activeGoal.updated_at = now;

    await saveMemory(state);

    // Log do memory (input, reply, mode, metadata)
    await addLogEntry(
        '/goal done',
        `✅ Cieľ dokončený: "${activeGoal.text}"`,
        'core',
        { type: 'command', command: 'goal', action: 'complete', goal_id: activeGoal.id }
    );

    return { success: true, goal: activeGoal };
}

/**
 * Dropne aktívny cieľ (nebol dokončený, ale už nechceš)
 * @returns {Object} - { success, goal }
 */
export async function dropGoal() {
    const state = await loadMemory();

    if (!state.goals || state.goals.length === 0) {
        return { success: false, error: 'Žiadne aktívne ciele' };
    }

    const activeGoal = state.goals.find(g => g.status === 'active');

    if (!activeGoal) {
        return { success: false, error: 'Žiadny aktívny cieľ' };
    }

    const now = new Date().toISOString();
    activeGoal.status = 'dropped';
    activeGoal.dropped_at = now;
    activeGoal.updated_at = now;

    await saveMemory(state);

    // Log do memory (input, reply, mode, metadata)
    await addLogEntry(
        '/goal drop',
        `🗑️ Cieľ dropnutý: "${activeGoal.text}"`,
        'core',
        { type: 'command', command: 'goal', action: 'drop', goal_id: activeGoal.id }
    );

    return { success: true, goal: activeGoal };
}
