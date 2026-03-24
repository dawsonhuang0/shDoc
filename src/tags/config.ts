/**
 * Tag styling configuration - Theme-based categorization
 *
 * Naming convention:
 * - *name: plain word only (no [] or {})
 * - *SqName: optional square brackets []
 * - *ClName: optional curly braces {}
 * - *SQName: MUST have square brackets []
 * - *CLName: MUST have curly braces {}
 * - *Andor: first style + second, OR second only if first missing
 */

export const TAG_PATTERNS = {
  // 1. tag - text after tag is not styled
  TAG: [
    'example'  // Only <caption> is specially styled
  ],

  // 2. tagSqVar - style 1st word as variable (cyan), optional []
  TAG_SQ_VAR: [
    'version',   // @version 1.0
    'license'    // @license MIT or @license [MIT] or @license {MIT}
  ],

  // 2b. tagAnyVar - style word as variable (cyan), can be wrapped in [] or {}
  TAG_ANY_VAR: [
    'default',   // @default value or @default [value] or @default {value}
    'tutorial',  // @tutorial name or @tutorial [name] or @tutorial {name}
    'variation'  // @variation name or @variation [name] or @variation {name}
  ],

  // 3. tagSqType - style 1st word as type (teal), optional []
  TAG_SQ_TYPE: [
    'function',   // @function name or @function [name]
    'memberof',   // @memberof name or @memberof [name]
    'requires',   // @requires module or @requires [module]
    'external',   // @external name or @external [name]
    'fires',      // @fires event or @fires [event]
    'listens',    // @listens event or @listens [event]
    'alias',      // @alias name or @alias [name]
    'constructs', // @constructs name or @constructs [name]
    'event',      // @event name or @event [name]
    'exports',    // @exports name or @exports [name]
    'host',       // @host name or @host [name]
    'method',     // @method name or @method [name]
    'mixes',      // @mixes name or @mixes [name]
    'module',     // @module name or @module [name]
    'name',       // @name name or @name [name]
    'emits',      // @emits event or @emits [event]
    'augments',   // @augments name or @augments [name]
    'interface'   // @interface name or @interface [name]
  ],

  // 3b. tagAnyType - style word as type (teal), can be wrapped in [] or {}
  TAG_ANY_TYPE: [
    'extends',    // @extends Type or @extends [Type] or @extends {Type}
    'lends',      // @lends Type or @lends [Type] or @lends {Type}
    'this'        // @this Type or @this [Type] or @this {Type}
  ],

  // 4. tagCLType - style {Type} as type (teal), {Type} REQUIRED
  TAG_CL_TYPE: [
    'returns', 'return',  // @returns {Type}
    'throws',             // @throws {Type}
    'implements',         // @implements {Type}
    'private',            // @private {Type}
    'protected',          // @protected {Type}
    'type',               // @type {Type}
    'enum',               // @enum {Type}
    'yields',             // @yields {Type}
    'satisfies'           // @satisfies {Type}
  ],

  // 5. tagCLTypeSqVar - {Type} REQUIRED + 2nd word as var (cyan), 2nd can be in []
  TAG_CL_TYPE_SQ_VAR: [
    'property',  // @property {Type} field or @property {Type} [field]
    'prop'       // @prop {Type} field or @prop {Type} [field]
  ],

  // 6. tagCLTypeAndorSqType - {Type} + 2nd as type, OR just 2nd as type (teal)
  TAG_CL_TYPE_ANDOR_SQ_TYPE: [
    'typedef',   // @typedef {Type} Name OR @typedef Name OR @typedef [Name]
    'callback',  // @callback {Type} func OR @callback func OR @callback [func]
    'see'        // @see {Type} ref OR @see ref OR @see [ref]
  ],

  // 7. tagOptionalParam - optional param handling (only style [] if {Type} exists)
  TAG_OPTIONAL_PARAM: [
    'param',    // @param {Type} name or @param {Type} [name=default]
    'argument', // @argument {Type} name or @argument {Type} [name=default]
    'member',   // @member {Type} name or @member {Type} [name=default]
    'var',      // @var {Type} name or @var {Type} [name=default]
    'constant'  // @constant {Type} name or @constant {Type} [name=default]
  ],

  // Special tags with unique styling logic
  SPECIAL: [
    'example',   // <caption></caption> tags
    'author',    // Text before <email>, skip brackets
    'license',   // First word with optional brackets
    'param',     // Optional parameter [name=default] syntax
    'property',  // Only style brackets if {Type} exists
    'prop',      // Only style brackets if {Type} exists
    'namespace', // Only style brackets if {Type} exists
    'template',  // Only style brackets if {Type} exists
    'argument'   // Only style brackets if {Type} exists
  ],

  // Tags that skip $variable styling in description
  NO_VAR_STYLING: [
    'returns', 'return', 'throws', 'typedef', 'property', 'prop', 'callback'
  ]
} as const;

export type TagPattern = keyof typeof TAG_PATTERNS;
