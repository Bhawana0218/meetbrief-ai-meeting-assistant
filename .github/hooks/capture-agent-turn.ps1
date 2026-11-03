$ErrorActionPreference = 'Stop'

function Get-PropertyValue {
    param(
        [object]$Object,
        [string[]]$Names
    )

    if ($null -eq $Object) {
        return $null
    }

    foreach ($name in $Names) {
        $property = $Object.PSObject.Properties | Where-Object { $_.Name -ieq $name } | Select-Object -First 1
        if ($null -ne $property) {
            return $property.Value
        }
    }

    return $null
}

function ConvertTo-UtcTimestamp {
    param([object]$Value)

    if ($null -eq $Value) {
        throw 'Hook event did not include a timestamp.'
    }

    if ($Value -is [ValueType] -and $Value -isnot [datetime]) {
        $number = [double]$Value
        if ($number -gt 1000000000000) {
            return [DateTimeOffset]::FromUnixTimeMilliseconds([long]$number).UtcDateTime
        }
        return [DateTimeOffset]::FromUnixTimeSeconds([long]$number).UtcDateTime
    }

    return [DateTimeOffset]::Parse([string]$Value).ToUniversalTime().UtcDateTime
}

function Get-TextFromContent {
    param([object]$Content)

    if ($null -eq $Content) {
        return ''
    }

    if ($Content -is [string]) {
        return $Content
    }

    if ($Content -is [System.Collections.IEnumerable] -and $Content -isnot [System.Collections.IDictionary]) {
        $parts = [System.Collections.Generic.List[string]]::new()
        foreach ($item in $Content) {
            $part = Get-TextFromContent -Content $item
            if ($part.Length -gt 0) {
                $parts.Add($part)
            }
        }
        return [string]::Join('', $parts)
    }

    $type = [string](Get-PropertyValue -Object $Content -Names @('type', 'kind'))
    if ($type -match 'tool|image|audio|video|function') {
        return ''
    }

    $text = Get-PropertyValue -Object $Content -Names @('text', 'value')
    if ($text -is [string]) {
        return $text
    }

    $nested = Get-PropertyValue -Object $Content -Names @('content', 'parts')
    if ($null -ne $nested) {
        return Get-TextFromContent -Content $nested
    }

    return ''
}

function Get-AssistantMessages {
    param([object]$Node)

    if ($null -eq $Node) {
        return
    }

    if ($Node -is [System.Collections.IEnumerable] -and $Node -isnot [string] -and $Node -isnot [System.Collections.IDictionary]) {
        foreach ($item in $Node) {
            Get-AssistantMessages -Node $item
        }
        return
    }

    $role = [string](Get-PropertyValue -Object $Node -Names @('role', 'author', 'speaker'))
    $type = [string](Get-PropertyValue -Object $Node -Names @('type', 'event', 'kind', 'messageType'))
    $channel = [string](Get-PropertyValue -Object $Node -Names @('channel', 'messageType'))
    $toolName = Get-PropertyValue -Object $Node -Names @('toolName', 'tool_name', 'recipient')

    $isAssistant = $role -match '^assistant$' -or $type -match '^assistant[._-]message$'
    $isInternal = $channel -match 'analysis|reasoning|tool' -or $type -match 'analysis|reasoning|tool'
    if ($isAssistant -and -not $isInternal -and $null -eq $toolName) {
        $content = Get-PropertyValue -Object $Node -Names @('content', 'text', 'response', 'message')
        if ($null -eq $content) {
            $data = Get-PropertyValue -Object $Node -Names @('data')
            $content = Get-PropertyValue -Object $data -Names @('content', 'text', 'response', 'message')
        }
        $messageText = Get-TextFromContent -Content $content
        if ($messageText.Length -gt 0) {
            Write-Output $messageText
        }
        return
    }

    foreach ($name in @('messages', 'message', 'data', 'items', 'events')) {
        $child = Get-PropertyValue -Object $Node -Names @($name)
        if ($null -ne $child) {
            Get-AssistantMessages -Node $child
        }
    }
}

function Get-FinalResponse {
    param([string]$TranscriptPath)

    if (-not (Test-Path -LiteralPath $TranscriptPath -PathType Leaf)) {
        throw "Transcript file was not found: $TranscriptPath"
    }

    $raw = [System.IO.File]::ReadAllText($TranscriptPath)
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw 'Transcript file was empty.'
    }

    $directTranscript = $null
    try {
        $directTranscript = ConvertFrom-Json -InputObject $raw
    } catch {
        $directTranscript = $null
    }

    $messages = [System.Collections.Generic.List[string]]::new()
    if ($null -ne $directTranscript) {
        foreach ($message in @(Get-AssistantMessages -Node $directTranscript)) {
            if ($message -is [string] -and $message.Length -gt 0) {
                $messages.Add($message)
            }
        }
    } else {
        foreach ($line in ($raw -split "`r?`n")) {
            if ([string]::IsNullOrWhiteSpace($line)) {
                continue
            }
            try {
                $record = ConvertFrom-Json -InputObject $line
            } catch {
                continue
            }
            foreach ($message in @(Get-AssistantMessages -Node $record)) {
                if ($message -is [string] -and $message.Length -gt 0) {
                    $messages.Add($message)
                }
            }
        }
    }

    if ($messages.Count -eq 0) {
        throw 'Could not identify a user-facing assistant response in the transcript.'
    }

    return $messages[$messages.Count - 1]
}

function Write-CapturedTurn {
    param(
        [string]$SessionId,
        [datetime]$PromptTime,
        [datetime]$ResponseTime,
        [string]$Prompt,
        [string]$Response
    )

    $repoRoot = (Get-Location).Path
    $logDirectory = Join-Path $repoRoot '.agent-logs'
    [System.IO.Directory]::CreateDirectory($logDirectory) | Out-Null

    $safeSessionId = $SessionId -replace '[^A-Za-z0-9._-]', '_'
    if ([string]::IsNullOrWhiteSpace($safeSessionId)) {
        throw 'Hook event did not include a usable session ID.'
    }

    $fileName = '{0}_{1}.md' -f $PromptTime.ToString('yyyy-MM-dd_HH-mm-ss'), $safeSessionId
    $logPath = Join-Path $logDirectory $fileName
    $model = 'not exposed by harness.'
    $project = Split-Path -Leaf $repoRoot
    $promptTimestamp = $PromptTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'")
    $responseTimestamp = $ResponseTime.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'")

    if (Test-Path -LiteralPath $logPath) {
        $existing = [System.IO.File]::ReadAllText($logPath)
        $countMatch = [regex]::Match($existing, '(?m)^total_exchanges:\s*(\d+)\s*$')
        $firstMatch = [regex]::Match($existing, '(?m)^first_prompt_time:\s*(.+)\s*$')
        if (-not $countMatch.Success -or -not $firstMatch.Success) {
            throw "Existing session log has an invalid header: $logPath"
        }
        $exchangeNumber = [int]$countMatch.Groups[1].Value + 1
        $existing = [regex]::Replace($existing, '(?m)^total_exchanges:\s*\d+\s*$', "total_exchanges: $exchangeNumber", 1)
        $existing = [regex]::Replace($existing, '(?m)^last_prompt_time:\s*.+\s*$', "last_prompt_time: $promptTimestamp", 1)
        $entry = "`r`n`r`n[LOG_ENTRY type=PROMPT num=$exchangeNumber session=$SessionId]`r`ntimestamp: $promptTimestamp`r`nmodel: $model`r`n`r`n$Prompt`r`n`r`n[LOG_ENTRY type=RESPONSE num=$exchangeNumber session=$SessionId]`r`ntimestamp: $responseTimestamp`r`nmodel: $model`r`n`r`n$Response`r`n"
        [System.IO.File]::WriteAllText($logPath, $existing + $entry, [System.Text.UTF8Encoding]::new($false))
        return
    }

    $header = @"
---
session_id: $SessionId
date: $($PromptTime.ToString('yyyy-MM-dd'))
author: not exposed by harness.
model: $model
tool: vscode-copilot
project: $project
total_exchanges: 1
first_prompt_time: $promptTimestamp
last_prompt_time: $promptTimestamp
---

# Session Log - $($PromptTime.ToString('yyyy-MM-dd'))

Session: ``$($SessionId.Substring(0, [Math]::Min(8, $SessionId.Length)))`` | Project: $project | Author: not exposed by harness.

---

[LOG_ENTRY type=PROMPT num=1 session=$SessionId]
timestamp: $promptTimestamp
model: $model

$Prompt

[LOG_ENTRY type=RESPONSE num=1 session=$SessionId]
timestamp: $responseTimestamp
model: $model

$Response
"@
    [System.IO.File]::WriteAllText($logPath, $header + "`r`n", [System.Text.UTF8Encoding]::new($false))
}

try {
    $stdin = [System.IO.StreamReader]::new([Console]::OpenStandardInput(), [System.Text.Encoding]::UTF8, $true)
    $eventJson = $stdin.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($eventJson)) {
        throw 'Hook received an empty event payload.'
    }

    $event = ConvertFrom-Json -InputObject $eventJson
    $hookEvent = [string](Get-PropertyValue -Object $event -Names @('hookEventName', 'hook_event_name'))
    if ([string]::IsNullOrWhiteSpace($hookEvent)) {
        $hookEvent = [string](Get-PropertyValue -Object $event -Names @('eventName', 'event'))
    }
    $sessionId = [string](Get-PropertyValue -Object $event -Names @('sessionId', 'session_id'))
    $timestamp = ConvertTo-UtcTimestamp -Value (Get-PropertyValue -Object $event -Names @('timestamp'))

    $pendingRoot = Join-Path $env:TEMP 'meetbrief-agent-capture'
    [System.IO.Directory]::CreateDirectory($pendingRoot) | Out-Null
    $safeSessionId = $sessionId -replace '[^A-Za-z0-9._-]', '_'
    if ([string]::IsNullOrWhiteSpace($safeSessionId)) {
        throw 'Hook event did not include a usable session ID.'
    }
    $pendingPath = Join-Path $pendingRoot "$safeSessionId.json"

    if ($hookEvent -match 'userPromptSubmitted|UserPromptSubmit') {
        $prompt = Get-PropertyValue -Object $event -Names @('prompt')
        if ($null -eq $prompt -or $prompt -isnot [string]) {
            throw 'Prompt event did not include a string prompt.'
        }
        $pending = [pscustomobject]@{
            sessionId = $sessionId
            promptTime = $timestamp.ToString('o')
            prompt = $prompt
        }
        $json = ConvertTo-Json -InputObject $pending -Depth 10 -Compress
        [System.IO.File]::WriteAllText($pendingPath, $json, [System.Text.UTF8Encoding]::new($false))
    } elseif ($hookEvent -match 'agentStop|Stop') {
        if (-not (Test-Path -LiteralPath $pendingPath -PathType Leaf)) {
            throw "No submitted prompt is pending for session $sessionId."
        }
        $pending = ConvertFrom-Json -InputObject ([System.IO.File]::ReadAllText($pendingPath))
        $response = Get-PropertyValue -Object $event -Names @('lastAssistantMessage', 'last_assistant_message')
        if ($response -isnot [string] -or $response.Length -eq 0) {
            $transcriptPath = [string](Get-PropertyValue -Object $event -Names @('transcriptPath', 'transcript_path'))
            if ([string]::IsNullOrWhiteSpace($transcriptPath)) {
                throw 'Stop event did not include a transcript path or final assistant message.'
            }
            $response = Get-FinalResponse -TranscriptPath $transcriptPath
        }
        $promptTime = [DateTimeOffset]::Parse([string]$pending.promptTime).UtcDateTime
        Write-CapturedTurn -SessionId $sessionId -PromptTime $promptTime -ResponseTime $timestamp -Prompt ([string]$pending.prompt) -Response $response
        Remove-Item -LiteralPath $pendingPath
    } else {
        throw "Unsupported hook event: $hookEvent"
    }

    [Console]::Out.WriteLine('{}')
    exit 0
} catch {
    [Console]::Error.WriteLine("Agent capture hook failed: $($_.Exception.Message)")
    exit 1
}
