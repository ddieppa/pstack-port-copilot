# Registers this folder as a VS Code agent plugin for stable and Insiders.
$plugin = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$escaped = $plugin.Replace("\", "\\")

function Add-PluginLocation([string]$settingsPath) {
  if (-not (Test-Path $settingsPath)) {
    Write-Output "skip missing $settingsPath"
    return
  }
  $backup = Join-Path $env:TEMP ("pstack-settings-" + [IO.Path]::GetFileName((Split-Path (Split-Path $settingsPath -Parent) -Parent)) + ".json")
  Copy-Item $settingsPath $backup -Force
  $raw = Get-Content $settingsPath -Raw
  if ($raw -notmatch '"chat\.pluginLocations"\s*:') {
    Write-Output "no chat.pluginLocations in $settingsPath (backup $backup)"
    return
  }
  if ($raw.Contains($escaped)) {
    Write-Output "already registered in $settingsPath"
  } else {
    $raw = [regex]::Replace(
      $raw,
      '"chat\.pluginLocations"\s*:\s*\{',
      {
        param($m)
        $m.Value + "`r`n    `"$escaped`": true,"
      },
      1
    )
  }
  if ($raw -notmatch '"chat\.plugins\.enabled"') {
    $raw = $raw -replace '"chat\.pluginLocations"', "`"chat.plugins.enabled`": true,`r`n  `"chat.subagents.allowInvocationsFromSubagents`": true,`r`n  `"chat.pluginLocations`""
  } elseif ($raw -notmatch '"chat\.subagents\.allowInvocationsFromSubagents"') {
    $raw = $raw -replace '"chat\.plugins\.enabled"\s*:\s*true,', "`"chat.plugins.enabled`": true,`r`n  `"chat.subagents.allowInvocationsFromSubagents`": true,"
  }
  Set-Content -Path $settingsPath -Value $raw -Encoding utf8 -NoNewline
  Write-Output "updated $settingsPath (backup $backup)"
}

Add-PluginLocation "$env:APPDATA\Code\User\settings.json"
Add-PluginLocation "$env:APPDATA\Code - Insiders\User\settings.json"
Write-Output "plugin path: $plugin"
Write-Output "Reload VS Code. In chat, pick the poteto-agent agent, or type /poteto-mode."
