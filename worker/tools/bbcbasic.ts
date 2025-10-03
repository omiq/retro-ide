import { BuildStep, BuildStepResult } from '../builder';
import { gatherFiles, getWorkFileAsString, putWorkFile, staleFiles } from '../builder';

/**
 * BBC BASIC compiler (scaffold)
 *
 * For now, this is a stub that passes through ASCII BASIC source as a binary file.
 * Next milestone: integrate a proper BBC BASIC tokenizer to emit tokenized program bytes.
 */
export function compileBbcBasic(step: BuildStep): BuildStepResult {
  const outputPath = step.prefix + '.bin';

  // Bring all project files into the worker FS (for consistency)
  gatherFiles(step);

  if (staleFiles(step, [outputPath])) {
    try {
      const source = getWorkFileAsString(step.path) || '';

      // Auto-add line numbers to lines that don't have them
      const processedSource = addLineNumbers(source);
      const asciiBytes = new TextEncoder().encode(processedSource);
      putWorkFile(outputPath, asciiBytes);

      return {
        output: asciiBytes,
        listings: {},
        errors: []
      };
    } catch (error) {
      return {
        errors: [{
          msg: error instanceof Error ? error.message : String(error),
          line: 0,
          path: step.path
        }]
      };
    }
  }

  return { unchanged: true };
}

/**
 * Add line numbers to BBC BASIC source code
 */
function addLineNumbers(source: string): string {
  const lines = source.split('\n');
  const processedLines: string[] = [];
  let lineNumber = 10; // Start with line 10

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed.length === 0) {
      processedLines.push(line); // Keep original whitespace
      continue;
    }

    // Check if line already has a line number
    const lineNumberMatch = trimmed.match(/^(\d+)\s+(.+)$/);
    if (lineNumberMatch) {
      // Line already has a number, use it and update our counter
      lineNumber = parseInt(lineNumberMatch[1]) + 10; // Set counter to next available number
      processedLines.push(line);
    } else {
      // Line doesn't have a number, add one
      const indentation = line.match(/^(\s*)/)?.[1] || '';
      processedLines.push(`${indentation}${lineNumber} ${trimmed}`);
      lineNumber += 10; // Increment by 10 for next line
    }
  }

  return processedLines.join('\n');
}


