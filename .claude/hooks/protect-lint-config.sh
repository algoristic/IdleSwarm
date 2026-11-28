#!/usr/bin/env bash
# Änderungen an den Dateien, die die Code-Regeln durchsetzen, brauchen die Zustimmung des Nutzers.
set -euo pipefail

PROTECTED='eslint\.config\.js|tools/eslint-rules|eslint-rules/|tools/checks|angular\.json|package\.json|\.github/workflows|\.claude/settings[^/]*\.json|\.claude/hooks'

input=$(cat)
tool=$(jq -r '.tool_name // ""' <<<"$input")

ask() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

case "$tool" in
  Edit | Write | MultiEdit | NotebookEdit)
    file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // ""' <<<"$input")
    relative=${file#"${CLAUDE_PROJECT_DIR:-$PWD}/"}
    if grep -Eq "^($PROTECTED)" <<<"$relative"; then
      ask "„$relative“ setzt die Code-Regeln durch (Lint-Konfiguration, eigene Regeln, CI oder dieser Hook). Änderungen nur mit Zustimmung des Nutzers."
    fi
    ;;
  Bash)
    command=$(jq -r '.tool_input.command // ""' <<<"$input")
    if grep -Eq "$PROTECTED" <<<"$command"; then
      without_null=$(sed -E 's/[0-9]*>{1,2} *\/dev\/null//g; s/[0-9]*>&[0-9]//g' <<<"$command")
      writes='>|\btee\b|\bsed\b[^|;&]*-i|\bperl\b[^|;&]*-i|\b(mv|cp|rm|ln|truncate|dd|patch|chmod)\b|\bpython3?\b|\bnode\b|\bgit +(checkout|restore|reset|stash|apply|am|mv|rm)\b|--write|\bnpm +(pkg|version|i|install|uninstall|update)\b'
      if grep -Eq "$writes" <<<"$without_null"; then
        ask "Der Befehl kann Dateien ändern, die die Code-Regeln durchsetzen (Lint-Konfiguration, eigene Regeln, CI oder dieser Hook). Ausführen nur mit Zustimmung des Nutzers."
      fi
    fi
    ;;
esac
exit 0
