"use strict";
/**
 * Assumption Registry Protocol (ARP-1.0)
 * Explicit assumption declaration, dependency tracking, and cascade analysis.
 * Zero external dependencies (Node.js crypto only).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.assumptionPayload = exports.generateId = exports.chainHash = exports.sha256 = exports.applyValidation = exports.canBeValidated = exports.createValidationResult = exports.simulateCascade = exports.getDependencyMap = exports.AssumptionRegistry = exports.schema = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "schema", { enumerable: true, get: function () { return types_1.schema; } });
var assumption_registry_1 = require("./assumption-registry");
Object.defineProperty(exports, "AssumptionRegistry", { enumerable: true, get: function () { return assumption_registry_1.AssumptionRegistry; } });
var impact_tracer_1 = require("./impact-tracer");
Object.defineProperty(exports, "getDependencyMap", { enumerable: true, get: function () { return impact_tracer_1.getDependencyMap; } });
var cascade_detector_1 = require("./cascade-detector");
Object.defineProperty(exports, "simulateCascade", { enumerable: true, get: function () { return cascade_detector_1.simulateCascade; } });
var validator_1 = require("./validator");
Object.defineProperty(exports, "createValidationResult", { enumerable: true, get: function () { return validator_1.createValidationResult; } });
Object.defineProperty(exports, "canBeValidated", { enumerable: true, get: function () { return validator_1.canBeValidated; } });
Object.defineProperty(exports, "applyValidation", { enumerable: true, get: function () { return validator_1.applyValidation; } });
var hash_1 = require("./hash");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return hash_1.sha256; } });
Object.defineProperty(exports, "chainHash", { enumerable: true, get: function () { return hash_1.chainHash; } });
Object.defineProperty(exports, "generateId", { enumerable: true, get: function () { return hash_1.generateId; } });
Object.defineProperty(exports, "assumptionPayload", { enumerable: true, get: function () { return hash_1.assumptionPayload; } });
