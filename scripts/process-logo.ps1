Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\zacha\.gemini\antigravity-ide\brain\8c0e93bc-8610-469b-9a03-2eb07b64e289\.user_uploaded\media_1793085497221.png"
$destPath = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\gemini-gradebook-logo.png"
$destFavicon = "c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.png"

$img = [System.Drawing.Bitmap]::new($srcPath)
$width = $img.Width
$height = $img.Height

$outImg = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $p = $img.GetPixel($x, $y)
        $r = [double]$p.R
        $g = [double]$p.G
        $b = [double]$p.B

        # Difference from white
        $dr = 255.0 - $r
        $dg = 255.0 - $g
        $db = 255.0 - $b

        $maxDiff = [Math]::Max($dr, [Math]::Max($dg, $db))

        # If it's essentially white
        if ($maxDiff -lt 2.0) {
            $outImg.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            # Compute alpha between 0 and 1
            $alpha = $maxDiff / 255.0
            
            # Slightly boost alpha curve for crisp rendering on dark backgrounds
            $alphaAdjusted = [Math]::Min(1.0, [Math]::Pow($alpha, 0.95))
            
            # Recover true foreground color without white bleed
            $fr = [Math]::Max(0.0, [Math]::Min(255.0, 255.0 - ($dr / $alphaAdjusted)))
            $fg = [Math]::Max(0.0, [Math]::Min(255.0, 255.0 - ($dg / $alphaAdjusted)))
            $fb = [Math]::Max(0.0, [Math]::Min(255.0, 255.0 - ($db / $alphaAdjusted)))

            $aInt = [int][Math]::Round($alphaAdjusted * 255.0)
            if ($aInt -gt 255) { $aInt = 255 }
            if ($aInt -lt 0) { $aInt = 0 }

            $outImg.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($aInt, [int]$fr, [int]$fg, [int]$fb))
        }
    }
}

$outImg.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Successfully saved logo without background to $destPath"

# Also create high-res cropped/tight favicon
$favImg = [System.Drawing.Bitmap]::new(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($favImg)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($outImg, 0, 0, 64, 64)
$g.Dispose()

$favImg.Save($destFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Successfully saved favicon to $destFavicon"

# Generate favicon.svg containing embedded base64 data
$bytes = [System.IO.File]::ReadAllBytes($destPath)
$b64 = [System.Convert]::ToBase64String($bytes)
$svgContent = "<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 500 500"" width=""100%"" height=""100%""><image href=""data:image/png;base64,$b64"" width=""500"" height=""500""/></svg>"
[System.IO.File]::WriteAllText("c:\Users\zacha\.gemini\antigravity-ide\scratch\gradebook\public\favicon.svg", $svgContent)
Write-Output "Successfully saved favicon.svg"

$img.Dispose()
$outImg.Dispose()
$favImg.Dispose()
