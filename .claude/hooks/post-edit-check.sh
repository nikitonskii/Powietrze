#!/bin/bash
# PostToolUse hook: format the edited file, then lint + typecheck.
# Exit 2 feeds stderr back to the agent as a correction; exit 0 is silence.
set -u

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c \
  "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" \
  2>/dev/null)

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0

cd "$(dirname "$0")/../.." || exit 0

ERRORS=""

npx prettier --log-level warn --write "$FILE" >/dev/null 2>&1

LINT=$(npx eslint "$FILE" 2>&1)
[ $? -ne 0 ] && ERRORS="ESLint on ${FILE}:
${LINT}

"

TSC=$(npx tsc --noEmit 2>&1)
[ $? -ne 0 ] && ERRORS="${ERRORS}TypeScript (project):
${TSC}
"

if [ -n "$ERRORS" ]; then
  printf '%s' "$ERRORS" >&2
  exit 2
fi
exit 0
