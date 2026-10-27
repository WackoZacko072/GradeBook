Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\zacha\.gemini\antigravity-ide\brain\8c0e93bc-8610-469b-9a03-2eb07b64e289\.user_uploaded\media_1793085497221.png"
$destPath = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\gemini-gradebook-logo.png"
$destFavicon = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.png"
$destSvg = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.svg"

$img = [System.Drawing.Bitmap]::new($srcPath)
$origWidth = $img.Width
$origHeight = $img.Height

# 1. First Pass: Find bounding box of non-white pixels
$minX = $origWidth
$minY = $origHeight
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $origHeight; $y++) {
    for ($x = 0; $x -lt $origWidth; $x++) {
        $p = $img.GetPixel($x, $y)
        $dr = 255 - [int]$p.R
        $dg = 255 - [int]$p.G
        $db = 255 - [int]$p.B
        $diff = [Math]::Max($dr, [Math]::Max($dg, $db))
        if ($diff -gt 12) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Artwork bounding box: X=[$minX, $maxX], Y=[$minY, $maxY]"
$boxW = $maxX - $minX + 1
$boxH = $maxY - $minY + 1
$boxDim = [Math]::Max($boxW, $boxH)

# Add minimal 2-pixel margin so artwork occupies virtually 100% of the icon frame
$pad = 2
$cropSize = $boxDim + ($pad * 2)

$centerX = [int](($minX + $maxX) / 2)
$centerY = [int](($minY + $maxY) / 2)

$cropLeft = $centerX - [int]($cropSize / 2)
$cropTop = $centerY - [int]($cropSize / 2)

Write-Output "Cropping to size: $cropSize x $cropSize centered at ($centerX, $centerY)"

# 2. Output 512x512 High-Res transparent, bright, vivid logo
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

        $dr = 255.0 - $r
        $dg = 255.0 - $g
        $db = 255.0 - $b
        $maxDiff = [Math]::Max($dr, [Math]::Max($dg, $db))

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

            # Boost saturation and brightness (vibrant electric colors)
            $maxCh = [Math]::Max($fr, [Math]::Max($fg, $fb))
            $minCh = [Math]::Min($fr, [Math]::Min($fg, $fb))
            $delta = $maxCh - $minCh

            if ($delta -gt 8.0) {
                # Increase vibrancy
                $satBoost = 1.32
                $avg = ($fr + $fg + $fb) / 3.0
                $fr = $avg + ($fr - $avg) * $satBoost
                $fg = $avg + ($fg - $avg) * $satBoost
                $fb = $avg + ($fb - $avg) * $satBoost

                # Brightness boost (vivid glow)
                $fr = $fr * 1.15
                $fg = $fg * 1.16
                $fb = $fb * 1.22
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
Write-Output "Saved cropped & enhanced logo to $destPath"

# 3. Create Favicon 64x64
$favImg = [System.Drawing.Bitmap]::new(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($favImg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($outImg, 0, 0, 64, 64)
$g.Dispose()

$favImg.Save($destFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved high-res favicon to $destFavicon"

# 4. Generate crisp favicon.svg with embedded base64 data
$bytes = [System.IO.File]::ReadAllBytes($destPath)
$b64 = [System.Convert]::ToBase64String($bytes)
$svgContent = "<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 512 512"" width=""100%"" height=""100%""><image href=""data:image/png;base64,$b64"" width=""512"" height=""512""/></svg>"
[System.IO.File]::WriteAllText($destSvg, $svgContent)
Write-Output "Saved clean SVG favicon to $destSvg"

$img.Dispose()
$outImg.Dispose()
$favImg.Dispose()
