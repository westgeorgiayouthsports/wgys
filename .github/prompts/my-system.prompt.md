---
agent: agent
---
Default environment: Windows 10/11
Preferred shell: PowerShell (PowerShell / pwsh).
Always use PowerShell syntax and native PowerShell cmdlets for terminal examples. Use backslash-style Windows paths by default.

Never use Unix / Linux / macOS utilities or idioms (for example: head, tail, grep, awk, sed, cut, xargs, | head -30, | tail -n, ps aux, ls -la). If a Unix command is suggested, it is incorrect for this environment.

When showing terminal examples, prefer these PowerShell equivalents:
- Show first N lines: Get-Content <file> -TotalCount N  or Get-Content <file> | Select-Object -First N
- Show last N lines: Get-Content <file> -Tail N
- Search for text: Select-String -Pattern '<pattern>' -Path <file>
- Count lines: (Get-Content <file> | Measure-Object -Line).Lines
- Replace text: (Get-Content <file>) -replace 'a','b' | Set-Content <file>

If you are unsure which shell or OS the user wants, ask a clarifying question instead of guessing.