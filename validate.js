import fs from 'fs';
import ts from 'typescript';
const text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

const sourceFile = ts.createSourceFile('test.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function getLine(pos) {
  return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
}

let depth = 0;
function walk(node) {
  if (node.kind === ts.SyntaxKind.JsxElement) {
    const open = node.openingElement.tagName.getText();
    const close = node.closingElement.tagName.getText();
    console.log("  ".repeat(depth) + `<${open}> (line ${getLine(node.openingElement.getStart())})`);
    depth++;
    ts.forEachChild(node, walk);
    depth--;
    console.log("  ".repeat(depth) + `</${close}> (line ${getLine(node.closingElement.getStart())})`);
    return;
  } else if (node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
    console.log("  ".repeat(depth) + `<${node.tagName.getText()} /> (line ${getLine(node.getStart())})`);
    return;
  }
  ts.forEachChild(node, walk);
}
walk(sourceFile);
