# Tag Styling Themes

## Theme Categories

### 1. **tag** - No styling after tag
- `@example` - Only `<caption>` tags are specially styled

### 2. **tagSqVar** - First word as variable (cyan), optional []
- `@version 1.0`
- `@license MIT` or `@license [MIT]` or `@license {MIT}`

### 3. **tagSqType** - First word as type (teal), optional []
- `@function name` or `@function [name]`
- `@memberof name` or `@memberof [name]`
- `@requires module` or `@requires [module]`
- `@external name` or `@external [name]`
- `@fires event` or `@fires [event]`
- `@listens event` or `@listens [event]`

### 4. **tagCLType** - {Type} REQUIRED, no 2nd word
- `@returns {Type}`
- `@return {Type}`
- `@throws {Type}`
- `@throw {Type}`

### 5. **tagCLTypeSqVar** - {Type} REQUIRED + 2nd word as variable (cyan), 2nd can be in []
- `@property {Type} field`
- `@property {Type} [field]`
- `@param {Type} varname`
- `@param {Type} [varname]`
- `@param {Type} [varname=default]` (special optional syntax)

### 6. **tagCLTypeAndorSqType** - {Type} + 2nd as type, OR just 2nd as type (teal)
- `@typedef {Type} Name` OR `@typedef Name` OR `@typedef [Name]`
- `@typedef {Type} [Name]` OR `@typedef [Name]`
- `@callback {Type} func` OR `@callback func` OR `@callback [func]`
- `@callback {Type} [func]` OR `@callback [func]`
- `@see {Type} ref` OR `@see ref` OR `@see [ref]`

## Special Tags

### @author
- Text before `<email>` styled as teal
- Infinite `{}` and `[]` allowed, styled as gold brackets
- Brackets themselves are not styled (teal), only the text between them

### @license
- First word after tag styled as cyan
- Can be wrapped in `[]` or `{}`
- Brackets styled as gold

### @example
- `<caption>` and `</caption>` tags styled as blue
- Rest of content not styled

### @param
- Optional parameter syntax: `[name=default]`
  - `name` - cyan
  - `=` - white (operator)
  - `default` - cyan
  - `<>` inside default - pink

## Color Reference

- **Blue** (`'macro'`): @tags like `@param`, `@returns`, `@example`
- **Teal** (`'type'`): Type annotations, function names, references
- **Cyan** (`'variable'`): Variables, parameters, property names, $variables
- **Pink** (`'keyword'`): Angle brackets `<>` inside type annotations
- **Gold** (`#F9D949`): Curly braces `{}` and square brackets `[]`
- **White** (`'operator'`): Equals sign `=` in optional params

## Naming Convention

- `*name`: plain word only (no [] or {})
- `*SqName`: optional square brackets []
- `*ClName`: optional curly braces {}
- `*SQName`: MUST have square brackets []
- `*CLName`: MUST have curly braces {}
- `*Andor`: first style + second, OR second only if first missing

## Implementation Mapping

### Pattern Functions:
1. `styleTypeAnnotation()` - Handles {Type} for all tags
2. `styleWordAfterTag(..., 'type')` - TAG_SQ_TYPE + TAG_CL_TYPE_ANDOR_SQ_TYPE
3. `styleWordAfterTag(..., 'variable')` - TAG_SQ_VAR
4. `styleBracketContent(..., 'type')` - TAG_SQ_TYPE + TAG_CL_TYPE_ANDOR_SQ_TYPE
5. `styleBracketContent(..., 'variable')` - TAG_CL_TYPE_SQ_VAR
6. `styleInlineTags()` - {@link URL|text} with pipe and text as teal

### Special Functions:
- `styleExampleCaption()` - <caption> tags
- `styleAuthor()` - Author text styling
- `styleLicense()` - License word styling
- `styleParamOptional()` - [name=default] syntax
- `styleTypedefAfterType()` - @typedef {Type} word
- `stylePropertyAfterType()` - @property {Type} path
- `styleVariables()` - $variables styling

### Decoration Functions:
- `decorateTypeBraces()` - Gold {} for type annotations
- `decorateBrackets()` - Gold [] for all bracket tags
- `decorateInlineTags()` - Gold {} for inline tags
- `decorateAuthor()` - Gold brackets in @author
- `decorateLicense()` - Gold brackets in @license
- `decorateParamOptional()` - Gold [] for optional params
