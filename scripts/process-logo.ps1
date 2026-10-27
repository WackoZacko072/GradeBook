Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\zacha\.gemini\antigravity-ide\brain\8c0e93bc-8610-469b-9a03-2eb07b64e289\.user_uploaded\media_1793116127416.png"
$destLogo = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\gemini-gradebook-logo.png"
$destFavicon = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.png"
$destSvg = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.svg"

$img = [System.Drawing.Bitmap]::new($srcPath)
$origWidth = $img.Width
$origHeight = $img.Height

Write-Output "Processing Gemini star logo: $origWidth x $origHeight"

# Target high-res 512x512
$outSize = 512
$outImg = [System.Drawing.Bitmap]::new($outSize, $outSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($outY = 0; $outY -lt $outSize; $outY++) {
    $srcY = [int](($outY / [double]$outSize) * $origHeight)
    if ($srcY -ge $origHeight) { $srcY = $origHeight - 1 }

    for ($outX = 0; $outX -lt $outSize; $outX++) {
        $srcX = [int](($outX / [double]$outSize) * $origWidth)
        if ($srcX -ge $origWidth) { $srcX = $origWidth - 1 }

        $p = $img.GetPixel($srcX, $srcY)
        $r = [double]$p.R
        $g = [double]$p.G
        $b = [double]$p.B

        $diffR = 255.0 - $r
        $diffG = 255.0 - $g
        $diffB = 255.0 - $b
        $maxDiff = [Math]::Max($diffR, [Math]::Max($diffG, $diffB))

        if ($maxDiff -lt 2.5) {
            # Pure white background -> transparent
            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } elseif ($maxDiff -ge 40.0) {
            # Fully inside the star -> 100% opaque, preserve exact rich gradient
            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb(255, [int]$r, [int]$g, [int]$b))
        } else {
            # Smooth anti-aliased edge
            $alpha = ($maxDiff - 2.5) / (40.0 - 2.5)
            $alpha = [Math]::Pow($alpha, 0.85)

            # Un-blend white
            $fr = [Math]::Max(0.0, [Math]::Min(255.0, ($r - (1.0 - $alpha) * 255.0) / $alpha))
            $fg = [Math]::Max(0.0, [Math]::Min(255.0, ($g - (1.0 - $alpha) * 255.0) / $alpha))
            $fb = [Math]::Max(0.0, [Math]::Min(255.0, ($b - (1.0 - $alpha) * 255.0) / $alpha))

            $aInt = [int][Math]::Min(255.0, [Math]::Max(0.0, [Math]::Round($alpha * 255.0)))
            $outImg.SetPixel($outX, $outY, [System.Drawing.Color]::FromArgb($aInt, [int]$fr, [int]$fg, [int]$fb))
        }
    }
}

$outImg.Save($destLogo, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved 512x512 transparent logo to $destLogo"

# 2. 64x64 Favicon
$favImg = [System.Drawing.Bitmap]::new(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($favImg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($outImg, 0, 0, 64, 64)
$g.Dispose()

$favImg.Save($destFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved 64x64 favicon to $destFavicon"

# 3. Clean SVG Favicon with Embedded Base64
$bytes = [System.IO.File]::ReadAllBytes($destLogo)
$b64 = [System.Convert]::ToBase64String($bytes)
$svgContent = "<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 512 512"" width=""100%"" height=""100%""><image href=""data:image/png;base64,$b64"" width=""512"" height=""512""/></svg>"
[System.IO.File]::WriteAllText($destSvg, $svgContent)
Write-Output "Saved SVG favicon to $destSvg"

$img.Dispose()
$outImg.Dispose()
$favImg.Dispose()
