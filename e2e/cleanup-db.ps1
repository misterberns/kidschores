$baseUrl = 'https://localhost:3103/api'

# Delete all rewards
$rewards = Invoke-RestMethod -Uri "$baseUrl/rewards" -SkipCertificateCheck
Write-Host "Deleting $($rewards.Count) rewards..."
foreach ($r in $rewards) {
    try { Invoke-RestMethod -Uri "$baseUrl/rewards/$($r.id)" -Method Delete -SkipCertificateCheck | Out-Null } catch {}
}

# Delete all chores (this should cascade delete claims)
$chores = Invoke-RestMethod -Uri "$baseUrl/chores" -SkipCertificateCheck
Write-Host "Deleting $($chores.Count) chores..."
foreach ($c in $chores) {
    try { Invoke-RestMethod -Uri "$baseUrl/chores/$($c.id)" -Method Delete -SkipCertificateCheck | Out-Null } catch {}
}

# Delete all kids
$kids = Invoke-RestMethod -Uri "$baseUrl/kids" -SkipCertificateCheck
Write-Host "Deleting $($kids.Count) kids..."
foreach ($k in $kids) {
    try { Invoke-RestMethod -Uri "$baseUrl/kids/$($k.id)" -Method Delete -SkipCertificateCheck | Out-Null } catch {}
}

# Delete all parents
$parents = Invoke-RestMethod -Uri "$baseUrl/parents" -SkipCertificateCheck
Write-Host "Deleting $($parents.Count) parents..."
foreach ($p in $parents) {
    try { Invoke-RestMethod -Uri "$baseUrl/parents/$($p.id)" -Method Delete -SkipCertificateCheck | Out-Null } catch {}
}

# Verify cleanup
Write-Host 'Remaining counts:'
$kidsRemain = (Invoke-RestMethod -Uri "$baseUrl/kids" -SkipCertificateCheck).Count
$choresRemain = (Invoke-RestMethod -Uri "$baseUrl/chores" -SkipCertificateCheck).Count
$rewardsRemain = (Invoke-RestMethod -Uri "$baseUrl/rewards" -SkipCertificateCheck).Count
$parentsRemain = (Invoke-RestMethod -Uri "$baseUrl/parents" -SkipCertificateCheck).Count
Write-Host "  Kids: $kidsRemain"
Write-Host "  Chores: $choresRemain"
Write-Host "  Rewards: $rewardsRemain"
Write-Host "  Parents: $parentsRemain"
