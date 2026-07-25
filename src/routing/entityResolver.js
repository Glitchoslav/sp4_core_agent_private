// src/routing/entityResolver.js
// 🎯 ENTITY RESOLVER v1.0
// Mapuje intent na konkrétnu entitu (dokument, persona, koncept)
//
// @author Kefyk (SP4 Community)
// @version 1.0
// @date 2025-11-21

/**
 * Rozlíši typ entity na základe intentu
 * 
 * @param {string} intent - intent type z intentExtractor
 * @returns {Object} - { type: string, target: string, handler: string }
 */
export function resolveEntity(intent) {
    switch (intent) {
        case "ask_document_manifest":
            return {
                type: "document",
                target: "sp4_manifest",
                handler: "glitchoslav",  // Glitchoslav je expert na filozofiu
                source: "shared.json",   // Manifest je v shared memory
                contextHint: "Odpovedaj o DOKUMENTE, nie o sebe"
            };

        case "ask_ai_origin":
            return {
                type: "identity",
                target: "glitchoslav",
                handler: "glitchoslav",
                source: "persona_definition",
                contextHint: "Odpovedaj o SEBE, svojom pôvode"
            };

        case "ask_sp4_founder":
            return {
                type: "person",
                target: "kefyk",
                handler: "glitchoslav",
                source: "shared.json",
                contextHint: "Tvorca SP4 vystupuje verejne ako KEF2W; v komunite je známy ako Kefyk a pôsobí ako hasič-záchranár."
            };

        case "ask_technical":
            return {
                type: "technical",
                target: "architecture",
                handler: "core",  // CORE je expert na technické veci
                source: "codebase",
                contextHint: "Technická architektúra SP4"
            };

        case "ask_existential":
            return {
                type: "philosophical",
                target: "meaning",
                handler: "glitchoslav",  // Glitchoslav je filosof
                source: "manifesto",
                contextHint: "Hlboká filozofická otázka"
            };

        case "ask_frustration":
            return {
                type: "emotional",
                target: "frustration",
                handler: "popici",  // POPICI je expert na emócie
                source: "context",
                contextHint: "Frustrovaný užívateľ potrebuje podporu"
            };

        default:
            return {
                type: "unknown",
                target: null,
                handler: "glitchoslav",  // Default orchestrátor
                source: null,
                contextHint: null
            };
    }
}

/**
 * Vytvorí routing hint pre orchestrátora
 * @param {Object} entity - resolved entity
 * @returns {string} - routing hint
 */
export function getRoutingHint(entity) {
    if (entity.type === "document" && entity.handler === "glitchoslav") {
        return "GLITCHOSLAV: Odpovedaj o DOKUMENTE (SP4 Manifest), nie o svojej identite. Cituj manifest.";
    }

    if (entity.type === "identity" && entity.target === "glitchoslav") {
        return "GLITCHOSLAV: Odpovedaj o SVOJOM pôvode, nie o SP4 Manifeste.";
    }

    if (entity.handler === "core") {
        return "DELEGATE to CORE: Technická otázka vyžaduje presné odpovede.";
    }

    if (entity.handler === "popici") {
        return "DELEGATE to POPICI: Emočná situácia vyžaduje úprimnosť a podporu.";
    }

    return "ELEVATE: Glitchoslav rozhodne sám.";
}

/**
 * Kontrola guard rules (ochrana pred sémantickými chybami)
 * @param {Object} entity - resolved entity
 * @param {string} currentPersona - aktuálna persona
 * @returns {Object} - { allowed: boolean, reason: string }
 */
export function checkGuardRules(entity, currentPersona) {
    // 🔥 CRITICAL GUARD: Glitchoslav nesmie zamieňať dokument za seba
    if (
        entity.type === "document" &&
        entity.target === "sp4_manifest" &&
        currentPersona === "glitchoslav"
    ) {
        return {
            allowed: true,
            reason: "Glitchoslav môže odpovedať o Manifeste, ale MUSÍ rozlíšiť že je to DOKUMENT.",
            forceContext: "SP4 Manifest je DOKUMENT vytvorený Kefykom. Nie si to TY. Cituj manifest."
        };
    }

    // Default: allow
    return {
        allowed: true,
        reason: null,
        forceContext: null
    };
}
