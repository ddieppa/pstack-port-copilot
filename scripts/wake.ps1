param(
    [int]$Seconds = 1800,
    [string]$Sentinel = "PSTACK_WAKE"
)

if ($Seconds -lt 1) { $Seconds = 1 }
Start-Sleep -Seconds $Seconds
Write-Output $Sentinel
