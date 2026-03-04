# ============================================================
#  Export-MonorepoArchitecture.ps1
#  Lance depuis la racine du monorepo
#  Genere un fichier "structure.txt" avec la structure
#  des dossiers infra/, apps/api/ et apps/web/
# ============================================================

param(
    [string]$OutputFile  = "structure.txt"
)

# -- Exclusions par dossier cible ----------------------------
$Exclusions = @{
    "infra" = @("node_modules")
    "api"   = @("coverage", "dist", "node_modules", "test", "database")
    "web"   = @(".next", "test-results", "tests", "node_modules")
}

function Write-Tree {
    param(
        [string]$Path,
        [string]$Indent = "",
        [System.Text.StringBuilder]$Builder,
        [string[]]$Exclude = @()
    )

    $items = Get-ChildItem -Path $Path | Sort-Object { $_.PSIsContainer } -Descending

    # Filtrer les elements exclus (peu importe le niveau)
    $items = $items | Where-Object { $Exclude -notcontains $_.Name }

    for ($i = 0; $i -lt $items.Count; $i++) {
        $item     = $items[$i]
        $isLast   = ($i -eq $items.Count - 1)
        $branch   = if ($isLast) { "+-- " } else { "|-- " }
        $childPad = if ($isLast) { "    " } else { "|   " }

        if ($item.PSIsContainer) {
            [void]$Builder.AppendLine("$Indent$branch[DIR]  $($item.Name)/")
            Write-Tree -Path $item.FullName -Indent "$Indent$childPad" -Builder $Builder -Exclude $Exclude
        } else {
            [void]$Builder.AppendLine("$Indent$branch[FILE] $($item.Name)")
        }
    }
}

# -- Initialisation ------------------------------------------
$sb       = [System.Text.StringBuilder]::new()
$root     = (Get-Location).Path
$rootName = Split-Path $root -Leaf

[void]$sb.AppendLine("=" * 60)
[void]$sb.AppendLine("  ARCHITECTURE DU MONOREPO : $rootName")
[void]$sb.AppendLine("  Genere le : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("=" * 60)
[void]$sb.AppendLine("")

# -- Dossiers a la racine (ex: infra/) -----------------------
foreach ($target in @("infra")) {
    $targetPath = Join-Path $root $target

    if (-not (Test-Path $targetPath)) {
        Write-Warning "Dossier racine '$target' introuvable, ignore."
        continue
    }

    $exclude = if ($Exclusions.ContainsKey($target)) { $Exclusions[$target] } else { @() }

    [void]$sb.AppendLine("[DIR]  $target/")
    Write-Tree -Path $targetPath -Indent "" -Builder $sb -Exclude $exclude
    [void]$sb.AppendLine("")
}

# -- Dossiers dans apps/ (ex: api/, web/) --------------------
$appsPath = Join-Path $root "apps"

if (-not (Test-Path $appsPath)) {
    Write-Warning "Dossier 'apps/' introuvable a la racine."
} else {
    [void]$sb.AppendLine("[DIR]  apps/")

    $appTargets = @("api", "web")

    foreach ($target in $appTargets) {
        $targetPath = Join-Path $appsPath $target

        if (-not (Test-Path $targetPath)) {
            Write-Warning "Dossier 'apps/$target' introuvable, ignore."
            continue
        }

        $exclude   = if ($Exclusions.ContainsKey($target)) { $Exclusions[$target] } else { @() }
        $isLastApp = ($target -eq $appTargets[-1])
        $branch    = if ($isLastApp) { "+-- " } else { "|-- " }
        $childPad  = if ($isLastApp) { "    " } else { "|   " }

        [void]$sb.AppendLine("$branch[DIR]  $target/")
        Write-Tree -Path $targetPath -Indent "$childPad" -Builder $sb -Exclude $exclude
    }

    [void]$sb.AppendLine("")
}

# -- Ecriture du fichier -------------------------------------
$sb.ToString() | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Host "Architecture exportee dans : $OutputFile" -ForegroundColor Green