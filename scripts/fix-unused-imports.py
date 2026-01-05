#!/usr/bin/env python3
"""
Automated script to fix unused imports in TypeScript/JavaScript files.
This script parses ESLint output and removes unused imports.
"""

import re
import sys
from pathlib import Path
from collections import defaultdict

def parse_lint_output(lint_file):
    """Parse ESLint output to find unused variables/imports."""
    unused_items = defaultdict(list)

    with open(lint_file, 'r') as f:
        current_file = None
        for line in f:
            # Match file paths
            if line.startswith('/home/user/Caberu/'):
                current_file = line.strip()
            # Match unused variable errors
            elif 'is defined but never used' in line or 'is assigned a value but never used' in line:
                if current_file:
                    # Extract line number and variable name
                    match = re.search(r'(\d+):(\d+)\s+error\s+\'([^\']+)\'\s+is', line)
                    if match:
                        line_num = int(match.group(1))
                        var_name = match.group(3)
                        unused_items[current_file].append((line_num, var_name))

    return unused_items

def remove_unused_import(file_path, line_num, var_name):
    """Remove an unused import from a file."""
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()

        if line_num > len(lines):
            return False

        target_line = lines[line_num - 1]

        # Pattern 1: Single import: import { VarName } from '...'
        if re.match(rf"^\s*import\s+{{\s*{re.escape(var_name)}\s*}}\s+from", target_line):
            lines.pop(line_num - 1)
            modified = True

        # Pattern 2: Multiple imports: import { Var1, VarName, Var2 } from '...'
        elif re.search(rf"{re.escape(var_name)}\s*,", target_line) or re.search(rf",\s*{re.escape(var_name)}", target_line):
            # Remove the variable from the import list
            new_line = re.sub(rf",\s*{re.escape(var_name)}\s*", '', target_line)
            new_line = re.sub(rf"{re.escape(var_name)}\s*,\s*", '', new_line)
            lines[line_num - 1] = new_line
            modified = True

        # Pattern 3: Default import: import VarName from '...'
        elif re.match(rf"^\s*import\s+{re.escape(var_name)}\s+from", target_line):
            lines.pop(line_num - 1)
            modified = True

        # Pattern 4: Import with type: import type { VarName } from '...'
        elif 'import type' in target_line and var_name in target_line:
            if re.match(rf"^\s*import\s+type\s+{{\s*{re.escape(var_name)}\s*}}\s+from", target_line):
                lines.pop(line_num - 1)
                modified = True
            else:
                new_line = re.sub(rf",\s*{re.escape(var_name)}\s*", '', target_line)
                new_line = re.sub(rf"{re.escape(var_name)}\s*,\s*", '', new_line)
                lines[line_num - 1] = new_line
                modified = True

        # Pattern 5: Destructured const: const { varName } = ...
        elif re.search(rf"const\s+{{\s*{re.escape(var_name)}", target_line):
            # For now, just comment it out
            lines[line_num - 1] = '// ' + target_line
            modified = True

        else:
            return False

        # Write back
        with open(file_path, 'w') as f:
            f.writelines(lines)

        return True

    except Exception as e:
        print(f"Error processing {file_path}:{line_num} ({var_name}): {e}", file=sys.stderr)
        return False

def main():
    lint_output_file = '/tmp/lint-output.txt'

    print("Parsing lint output...")
    unused_items = parse_lint_output(lint_output_file)

    print(f"Found {len(unused_items)} files with unused items")

    total_fixed = 0
    total_failed = 0

    # Sort by line number in reverse to avoid line number shifting
    for file_path, items in unused_items.items():
        items_sorted = sorted(items, key=lambda x: x[0], reverse=True)

        for line_num, var_name in items_sorted:
            if remove_unused_import(file_path, line_num, var_name):
                total_fixed += 1
                print(f"✓ Fixed {file_path}:{line_num} ({var_name})")
            else:
                total_failed += 1
                print(f"✗ Could not fix {file_path}:{line_num} ({var_name})")

    print(f"\nSummary:")
    print(f"  Fixed: {total_fixed}")
    print(f"  Failed: {total_failed}")
    print(f"  Total: {total_fixed + total_failed}")

if __name__ == '__main__':
    main()
