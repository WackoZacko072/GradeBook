Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\zacha\.gemini\antigravity-ide\brain\8c0e93bc-8610-469b-9a03-2eb07b64e289\.user_uploaded\media_1793113669457.png"
$destLogo = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\gemini-gradebook-logo.png"
$destFavicon = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.png"
$destSvg = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.svg"

$img = [System.Drawing.Bitmap]::new($srcPath)
$origWidth = $img.Width
$origHeight = $img.Height

$bgR = 17.0
$bgG = 33.0
$bgB = 44.0

# Bounding box of artwork
$minX = 114
$maxX = 438
$minY = 137
$maxY = 424

$boxW = $maxX - $minX + 1
$boxH = $maxY - $minY + 1
$boxDim = [Math]::Max($boxW, $boxH)

# Minimal 3px padding for tight full-bleed crop
$pad = 3
$cropSize = $boxDim + ($pad * 2)

$centerX = [int](($minX + $maxX) / 2)
$centerY = [int](($minY + $maxY) / 2)

$cropLeft = $centerX - [int]($cropSize / 2)
$cropTop = $centerY - [int]($cropSize / 2)

Write-Output "Crop size: $cropSize x $cropSize centered at ($centerX, $centerY)"

# 1. Output 512x512 High-Res transparent logo
$outSize = 512
$outImg = [System.Drawing.Bitmap]::new($outSize, $outSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($outY = 0; $outY -lt $outSize; $outY++) {
    $srcY = $cropTop + [int](($outY / [double]$outSize) * $cropSize)
    for ($outX = 0; $outX -lt $outSize; $outX++) {
        $srcX = $cropLeft + [int](($outX / [double]$outSize) * $cropSize)

        if ($srcX -lt 0 -or $srcX -ge $origWidth -or $srcY -lt 0 -or $srcY -ge $origHeight) {
            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            continue
        }

        $p = $img.GetPixel($srcX, $srcY)
        $r = [double]$p.R
        $g = [double]$p.G
        $b = [double]$p.B

        # Euclidean distance from background
        $dist = [Math]::Sqrt([Math]::Pow($r - $bgR, 2) + [Math]::Pow($g - $bgG, 2) + [Math]::Pow($b - $bgB, 2))

        if ($dist -lt 12.0) {
            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Compute alpha smoothly
            $alpha = [Math]::Min(1.0, [Math]::Max(0.0, ($dist - 12.0) / 95.0))
            
            # Boost alpha curve so strokes are solid and vivid
            $alpha = [Math]::Pow($alpha, 0.75)

            # Un-blend from background color: C_fg = (C_observed - (1-alpha)*C_bg) / alpha
            $fr = ($r - (1.0 - $alpha) * $bgR) / $alpha
            $fg = ($g - (1.0 - $alpha) * $bgG) / $alpha
            $fb = ($b - (1.0 - $alpha) * $bgB) / $alpha

            # Clamp foreground colors
            $fr = [Math]::Max(0.0, [Math]::Min(255.0, $fr))
            $fg = [Math]::Max(0.0, [Math]::Min(255.0, $fg))
            $fb = [Math]::Max(0.0, [Math]::Min(255.0, $fb))

            # Boost saturation & brightness slightly for electric pop
            $maxCh = [Math]::Max($fr, [Math]::Max($fg, $fb))
            $minCh = [Math]::Min($fr, [Math]::Min($fg, $fb))
            $delta = $maxCh - $minCh

            if ($delta -gt 10.0) {
                $satBoost = 1.15
                $avg = ($fr + $fg + $fb) / 3.0
                $fr = $avg + ($fr - $avg) * $satBoost
                $fg = $avg + ($fg - $avg) * $satBoost
                $fb = $avg + ($fb - $avg) * $satBoost

                # Boost brightness
                $fr = $fr * 1.08
                $fg = $fg * 1.08
                $fb = $fb * 1.12
            }

            $frInt = [int][Math]::Min(255.0, [Math]::Max(0.0, $fr))
            $fgInt = [int][Math]::Min(255.0, [Math]::Max(0.0, $fg))
            $fbInt = [int][Math]::Min(255.0, [Math]::Max(0.0, $fb))
            $aInt = [int][Math]::Min(255.0, [Math]::Max(0.0, [Math]::Round($alpha * 255.0)))

            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb($aInt, $frInt, $fgInt, $fbInt))
        }
    }
}

$outImg.Save($destLogo, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved 512x512 transparent logo to $destLogo"

# 2. Output 64x64 Favicon
$favImg = [System.Drawing.Bitmap]::new(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($favImg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($outImg, 0, 0, 64, 64)
$g.Dispose()

$favImg.Save($destFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved high-res favicon to $destFavicon"

# 3. Output Crisp SVG Favicon with Embedded Base64
$bytes = [System.IO.File]::ReadAllBytes($destLogo)
$b64 = [System.Convert]::ToBase64String($bytes)
$svgContent = "<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 512 512"" width=""100%"" height=""100%""><image href=""data:image/png;base64,$b64"" width=""512"" height=""512""/></svg>"
[System.IO.File]::WriteAllText($destSvg, $svgContent)
Write-Output "Saved clean SVG favicon to $destSvg"

$img.Dispose()
$outImg.Dispose()
$favImg.Dispose()
