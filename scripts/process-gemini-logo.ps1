Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\zacha\.gemini\antigravity-ide\brain\8c0e93bc-8610-469b-9a03-2eb07b64e289\.user_uploaded\media_1793116452743.png"
$destPath = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\gemini-sparkle-logo.png"

$img = [System.Drawing.Bitmap]::new($srcPath)
$w = $img.Width
$h = $img.Height
Write-Output "Dimensions: $w x $h"

$c00 = $img.GetPixel(0, 0)
Write-Output "Corner (0,0): R=$($c00.R), G=$($c00.G), B=$($c00.B), A=$($c00.A)"

# Find bounding box of non-white pixels
$minX = $w
$maxX = 0
$minY = $h
$maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $p = $img.GetPixel($x, $y)
        $dr = 255 - [int]$p.R
        $dg = 255 - [int]$p.G
        $db = 255 - [int]$p.B
        $diff = [Math]::Max($dr, [Math]::Max($dg, $db))
        if ($diff -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Star bounding box: X=[$minX, $maxX], Y=[$minY, $maxY]"
$boxW = $maxX - $minX + 1
$boxH = $maxY - $minY + 1
Write-Output "Star width=$boxW, height=$boxH"

$boxDim = [Math]::Max($boxW, $boxH)
# Minimal 4px margin so sharp tips are not clipped
$pad = 4
$cropSize = $boxDim + ($pad * 2)

$centerX = [int](($minX + $maxX) / 2)
$centerY = [int](($minY + $maxY) / 2)

$cropLeft = $centerX - [int]($cropSize / 2)
$cropTop = $centerY - [int]($cropSize / 2)

# Output 512x512 High-Res transparent sparkle star
$outSize = 512
$outImg = [System.Drawing.Bitmap]::new($outSize, $outSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($outY = 0; $outY -lt $outSize; $outY++) {
    $srcY = $cropTop + [int](($outY / [double]$outSize) * $cropSize)
    for ($outX = 0; $outX -lt $outSize; $outX++) {
        $srcX = $cropLeft + [int](($outX / [double]$outSize) * $cropSize)

        if ($srcX -lt 0 -or $srcX -ge $w -or $srcY -lt 0 -or $srcY -ge $h) {
            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            continue
        }

        $p = $img.GetPixel($srcX, $srcY)
        $r = [double]$p.R
        $g = [double]$p.G
        $b = [double]$p.B

        $dr = 255.0 - $r
        $dg = 255.0 - $g
        $db = 255.0 - $b
        $maxDiff = [Math]::Max($dr, [Math]::Max($dg, $db))

        # Check if pure white background
        if ($maxDiff -lt 3.0) {
            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Un-premultiply alpha from white background
            $alpha = [Math]::Min(1.0, $maxDiff / 250.0)
            
            # Boost alpha curve for solid, vivid presence without transparent fading
            $alpha = [Math]::Pow($alpha, 0.85)

            # Recover foreground colors
            $fr = [Math]::Max(0.0, [Math]::Min(255.0, 255.0 - ($dr / $alpha)))
            $fg = [Math]::Max(0.0, [Math]::Min(255.0, 255.0 - ($dg / $alpha)))
            $fb = [Math]::Max(0.0, [Math]::Min(255.0, 255.0 - ($db / $alpha)))

            # Boost saturation and brightness slightly
            $maxCh = [Math]::Max($fr, [Math]::Max($fg, $fb))
            $minCh = [Math]::Min($fr, [Math]::Min($fg, $fb))
            $delta = $maxCh - $minCh

            if ($delta -gt 8.0) {
                $satBoost = 1.15
                $avg = ($fr + $fg + $fb) / 3.0
                $fr = $avg + ($fr - $avg) * $satBoost
                $fg = $avg + ($fg - $avg) * $satBoost
                $fb = $avg + ($fb - $avg) * $satBoost

                # Brightness boost (vivid glow)
                $fr = $fr * 1.05
                $fg = $fg * 1.05
                $fb = $fb * 1.10
            }

            $frInt = [int][Math]::Min(255.0, [Math]::Max(0.0, $fr))
            $fgInt = [int][Math]::Min(255.0, [Math]::Max(0.0, $fg))
            $fbInt = [int][Math]::Min(255.0, [Math]::Max(0.0, $fb))
            $aInt = [int][Math]::Min(255.0, [Math]::Max(0.0, [Math]::Round($alpha * 255.0)))

            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb($aInt, $frInt, $fgInt, $fbInt))
        }
    }
}

$outImg.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved 512x512 transparent Gemini sparkle logo to $destPath"

$img.Dispose()
$outImg.Dispose()
