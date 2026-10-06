#!/bin/sh
seconds="${1:-1800}"
sentinel="${2:-PSTACK_WAKE}"
case "$seconds" in
  ''|*[!0-9]*) seconds=1800 ;;
esac
if [ "$seconds" -lt 1 ]; then
  seconds=1
fi
sleep "$seconds"
printf '%s\n' "$sentinel"
