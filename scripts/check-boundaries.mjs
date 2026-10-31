import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireBackend = createRequire(new URL('../backend/package.json', import.meta.url));
const ts = requireBackend('typescript');

export function inspectDependencies(source, filename, layer) {
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const errors = [];
  function check(specifier, node) {
    const target = resolve(dirname(filename), specifier);
    const segments = target.split(sep);
    const allowed = layer === 'domain' ? ['domain'] : ['domain', 'application'];
    if (!specifier.startsWith('.') || !allowed.some(part => segments.includes(part)) ||
        segments.includes('infrastructure') || !target.startsWith(resolve(root, 'backend/src') + sep)) {
      const position = tree.getLineAndCharacterOfPosition(node.getStart(tree));
      errors.push(`${relative(root, filename)}:${position.line + 1}: ${layer} cannot depend on ${specifier}`);
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      check(node.moduleSpecifier.text, node);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
      check(node.moduleReference.expression.text, node);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) check(argument.text, node);
      else errors.push(`${relative(root, filename)}: computed imports are not allowed in ${layer}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return errors;
}

function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = join(directory, entry.name);
    return entry.isDirectory() ? sources(name) : name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [name] : [];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = [];
  let checked = 0;
  for (const context of ['identity', 'social', 'discovery']) {
    for (const layer of ['domain', 'application']) {
      const files = sources(join(root, 'backend/src', context, layer));
      if (!files.length) errors.push(`Missing ${context}/${layer} implementation`);
      for (const filename of files) {
        checked++;
        errors.push(...inspectDependencies(readFileSync(filename, 'utf8'), filename, layer));
      }
    }
  }
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Architecture boundaries passed for ${checked} domain/application files.`);
}
