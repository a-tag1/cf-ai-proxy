#!/usr/bin/env pwsh

$workerUrl = "https://cf-ai-proxy.tillmaru55.workers.dev"

# まずは既存の動作していたモデルでテスト
$body = @{
    prompt = "a beautiful sunset"
    model = "@cf/bytedance/stable-diffusion-xl-lightning"
    width = 512
    height = 768
} | ConvertTo-Json

Write-Host "📤 Testing Worker with SDXL Lightning: $workerUrl" -ForegroundColor Cyan
Write-Host "📋 Request Body:"
Write-Host $body
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $workerUrl -Method POST -ContentType "application/json" -Body $body -ErrorAction Continue
    Write-Host "Status Code: $($response.StatusCode)"
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Success! Image generated" -ForegroundColor Green
        Write-Host "Content-Type: $($response.Headers['Content-Type'])"
        Write-Host "Size: $($response.RawContentLength) bytes"
    } else {
        Write-Host "❌ Error: $($response.StatusCode)" -ForegroundColor Red
        Write-Host "Response:"
        Write-Host $response.Content
    }
} catch {
    Write-Host "❌ Exception: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Full Error:"
    Write-Host $_
}

