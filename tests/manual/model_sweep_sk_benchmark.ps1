$ErrorActionPreference = 'Stop'

$HostUrl = if ($env:OLLAMA_HOST) { $env:OLLAMA_HOST } else { 'http://127.0.0.1:11434' }
$SystemPrompt = 'Odpovedaj po slovensky, drž diakritiku, neprepínaj jazyk.'
$Options = @{
    temperature = 0.3
    top_p = 0.9
    repeat_penalty = 1.1
    num_ctx = 2048
}

$Prompts = @(
    @{ id='SK1'; bucket='general'; text='Vysvetli rozdiel medzi REST API a GraphQL pre juniora v 5 vetách.' },
    @{ id='SK2'; bucket='general'; text='Zhrň tento text do 4 viet: Lokálne AI modely dávajú lepšie súkromie, ale často majú nižší výkon ako cloud.' },
    @{ id='SK3'; bucket='general'; text='Napíš krátky plán dňa pre človeka, ktorý má 2 hodiny na učenie programovania.' },
    @{ id='SK4'; bucket='general'; text='Vysvetli, prečo je dôležité robiť malé iterácie namiesto veľkých refaktorov.' },

    @{ id='T1'; bucket='tech'; text='Node.js app padá s ECONNREFUSED na localhost:5432. Daj postup debugovania krok za krokom.' },
    @{ id='T2'; bucket='tech'; text='Navrhni jednoduchú architektúru pre chat aplikáciu: API, DB, cache, worker, observability.' },
    @{ id='T3'; bucket='tech'; text='Ako by si riešil memory leak v dlhobežiacom Node procese? Uveď praktické nástroje a metriky.' },
    @{ id='T4'; bucket='tech'; text='Rozdiel medzi horizontálnym a vertikálnym škálovaním pri backend API, vrátane trade-offov.' },

    @{ id='C1'; bucket='coding'; text='Napíš JS funkciu debounce(fn, delay) s príkladom použitia.' },
    @{ id='C2'; bucket='coding'; text='Napíš Node.js express middleware pre request-id a structured log (JSON).' },
    @{ id='C3'; bucket='coding'; text='Napíš funkciu v JS, ktorá bezpečne parsuje JSON a vráti {ok,data,error}.' },
    @{ id='C4'; bucket='coding'; text='Napíš jednoduchý retry wrapper pre async funkciu (max pokusov, exponenciálny backoff).' }
)

$ModelConfig = @(
    @{ model='qwen2.5:7b'; buckets=@('general','tech','coding') },
    @{ model='llama3:8b'; buckets=@('general','tech','coding') },
    @{ model='qwen3:4b'; buckets=@('general','tech','coding') },
    @{ model='deepseek-coder:6.7b'; buckets=@('coding') }
)

function Get-SpeedLabel([double]$ms) {
    if ($ms -le 3500) { return 'rýchle' }
    if ($ms -le 9000) { return 'ok' }
    return 'pomalé'
}

function Get-SlovakScore([string]$text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return 1 }
    $words = ($text -split '\s+' | Where-Object { $_ -ne '' }).Count
    if ($words -eq 0) { return 1 }
    $enHits = ([regex]::Matches($text, '\b(the|and|with|this|that|from|your|code|function|return|error|debug)\b', 'IgnoreCase')).Count
    $diaHits = ([regex]::Matches($text, '[áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]')).Count
    $ratio = $enHits / $words
    if ($ratio -le 0.01 -and $diaHits -ge 2) { return 5 }
    if ($ratio -le 0.03 -and $diaHits -ge 1) { return 4 }
    if ($ratio -le 0.07) { return 3 }
    if ($ratio -le 0.12) { return 2 }
    return 1
}

function Get-UsefulnessScore([string]$text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return 1 }
    $len = $text.Trim().Length
    $hasSteps = $text -match '(\d+\.)|(-\s)|krok|postup|príklad|napríklad'
    $hasTerms = $text -match 'middleware|retry|log|monitor|metrik|cache|db|kód|funkci|parameter|backoff'
    if ($len -gt 260 -and $hasSteps -and $hasTerms) { return 5 }
    if ($len -gt 180 -and ($hasSteps -or $hasTerms)) { return 4 }
    if ($len -gt 120) { return 3 }
    if ($len -gt 60) { return 2 }
    return 1
}

function Get-FactualScore([string]$text, [string]$prompt) {
    if ([string]::IsNullOrWhiteSpace($text)) { return 1 }
    $p = $prompt.ToLowerInvariant()
    if ($p -match 'debounce') { return $(if ($text -match 'setTimeout' -and $text -match 'clearTimeout') { 5 } else { 2 }) }
    if ($p -match 'request-id') { return $(if ($text -match 'x-request-id|request-id|uuid' -and $text -match 'next\(') { 5 } else { 2 }) }
    if ($p -match 'parsuje json') { return $(if ($text -match 'try|catch' -and $text -match '\bok\b' -and $text -match 'error') { 5 } else { 2 }) }
    if ($p -match 'retry wrapper') { return $(if ($text -match 'async' -and $text -match 'await' -and $text -match 'backoff|2 \*\*|setTimeout') { 5 } else { 3 }) }
    if ($p -match 'econnrefused') { return $(if ($text -match '5432|postgres|port|docker|service') { 4 } else { 2 }) }
    if ($p -match 'memory leak') { return $(if ($text -match 'heap|clinic|--inspect|profiler|metrics|gc') { 4 } else { 2 }) }
    if ($p -match 'rest api' -and $p -match 'graphql') { return $(if ($text -match 'endpoint|schema|query|overfetch|underfetch') { 4 } else { 2 }) }
    return 4
}

function Invoke-Model([string]$model, [string]$prompt) {
    $body = @{
        model = $model
        stream = $false
        messages = @(
            @{ role='system'; content=$SystemPrompt },
            @{ role='user'; content=$prompt }
        )
        options = $Options
    } | ConvertTo-Json -Depth 6

    $lastErr = $null
    for ($a = 1; $a -le 3; $a++) {
        try {
            $sw = [System.Diagnostics.Stopwatch]::StartNew()
            $resp = Invoke-RestMethod -Uri "$HostUrl/api/chat" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 180
            $sw.Stop()
            return @{
                ok = $true
                output = [string]$resp.message.content
                latencyMs = [int][math]::Round($sw.Elapsed.TotalMilliseconds)
                attempt = $a
            }
        } catch {
            $lastErr = $_.Exception.Message
            Start-Sleep -Milliseconds (1200 * $a)
        }
    }
    return @{ ok = $false; error = $lastErr; output=''; latencyMs = 180000; attempt = 3 }
}

try {
    Invoke-RestMethod -Uri "$HostUrl/api/tags" -Method Get -TimeoutSec 3 | Out-Null
} catch {
    Start-Process -FilePath "C:\Users\kefyk.LAPTOP-7TO18QQ7\AppData\Local\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 3
}

$results = @()
foreach ($cfg in $ModelConfig) {
    foreach ($p in $Prompts) {
        if ($cfg.buckets -notcontains $p.bucket) { continue }
        $r = Invoke-Model -model $cfg.model -prompt $p.text
        if ($r.ok) {
            $row = [ordered]@{
                model = $cfg.model
                promptId = $p.id
                bucket = $p.bucket
                prompt = $p.text
                latencyMs = $r.latencyMs
                speed = Get-SpeedLabel $r.latencyMs
                output = $r.output.Trim()
                attempt = $r.attempt
                scores = @{
                    slovak = Get-SlovakScore $r.output
                    factual = Get-FactualScore $r.output $p.text
                    usefulness = Get-UsefulnessScore $r.output
                }
            }
            $results += [pscustomobject]$row
            Write-Output "$($cfg.model) :: $($p.id) :: $($r.latencyMs)ms :: $($row.speed)"
        } else {
            $results += [pscustomobject]@{
                model = $cfg.model
                promptId = $p.id
                bucket = $p.bucket
                prompt = $p.text
                latencyMs = 180000
                speed = 'pomalé'
                output = ''
                error = $r.error
                attempt = $r.attempt
                scores = @{ slovak = 1; factual = 1; usefulness = 1 }
            }
            Write-Output "$($cfg.model) :: $($p.id) :: ERROR :: $($r.error)"
        }
    }
}

$summary = $results |
    Group-Object -Property model |
    ForEach-Object {
        $rows = $_.Group
        $avgSl = [math]::Round((($rows | Measure-Object -Property { $_.scores.slovak } -Average).Average), 2)
        $avgFa = [math]::Round((($rows | Measure-Object -Property { $_.scores.factual } -Average).Average), 2)
        $avgUs = [math]::Round((($rows | Measure-Object -Property { $_.scores.usefulness } -Average).Average), 2)
        $avgMs = [int][math]::Round((($rows | Measure-Object -Property latencyMs -Average).Average))
        $avgQ = [math]::Round((($avgSl + $avgFa + $avgUs) / 3), 2)
        [pscustomobject]@{
            model = $_.Name
            prompts = $rows.Count
            avgSlovak = $avgSl
            avgFactual = $avgFa
            avgUsefulness = $avgUs
            avgQuality = $avgQ
            avgLatencyMs = $avgMs
            speed = Get-SpeedLabel $avgMs
        }
    }

$out = [ordered]@{
    generatedAt = (Get-Date).ToString('o')
    host = $HostUrl
    systemPrompt = $SystemPrompt
    options = $Options
    prompts = $Prompts
    results = $results
    summary = $summary
}

$logsDir = Join-Path (Resolve-Path '.').Path 'tests\logs'
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
$ts = [int][double]::Parse((Get-Date -UFormat %s))
$outPath = Join-Path $logsDir "model_sweep_sk.$ts.json"
$out | ConvertTo-Json -Depth 8 | Set-Content -Path $outPath -Encoding UTF8

Write-Output ""
Write-Output "Saved: $outPath"
Write-Output ""
$summary | Format-Table -AutoSize | Out-String | Write-Output
