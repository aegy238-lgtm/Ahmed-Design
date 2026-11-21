import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import JSZip from 'jszip';

const router = express.Router();

const INSTALLER_PASSCODE_NORMALIZED = '150150150';

function normalizePasscode(raw: unknown): string {
  return String(raw ?? '').replace(/\s+/g, '').trim();
}

function sanitizeWindowsName(name: string, fallback = 'MotionTools'): string {
  const cleaned = String(name || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function sanitizeFolderToken(name: string, fallback = 'MotionTools'): string {
  const cleaned = sanitizeWindowsName(name, fallback)
    .replace(/\.+$/g, '')
    .trim();
  return cleaned || fallback;
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapePsSingle(str: string): string {
  return String(str || '').replace(/'/g, "''");
}

/**
 * Wraps a PNG buffer inside a valid standard Windows 32-bit ICO container (PNG-in-ICO, Windows Vista–11 native).
 */
function pngBufferToIcoBuffer(pngBuf: Buffer): Buffer {
  // ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) = 22 bytes header
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(1, 4); // Image count: 1

  header.writeUInt8(0, 6); // Width: 0 = 256px
  header.writeUInt8(0, 7); // Height: 0 = 256px
  header.writeUInt8(0, 8); // Color count: 0 (true color)
  header.writeUInt8(0, 9); // Reserved
  header.writeUInt16LE(1, 10); // Color planes: 1
  header.writeUInt16LE(32, 12); // Bits per pixel: 32
  header.writeUInt32LE(pngBuf.length, 14); // Size of PNG payload
  header.writeUInt32LE(22, 18); // Offset to PNG payload

  return Buffer.concat([header, pngBuf]);
}

function decodeLogoDataUrl(dataUrl?: string): Buffer | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

function getDefaultLogoBuffer(rootDir: string): Buffer | null {
  const candidates = [
    path.join(rootDir, 'public', 'logo.png'),
    path.join(rootDir, 'public', 'pwa-512x512.png'),
    path.join(rootDir, 'public', 'pwa-192x192.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p);
      } catch {}
    }
  }
  return null;
}

function addDirectoryRecursive(
  srcDir: string,
  zipFolder: JSZip,
  skipNames: Set<string>
) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    const fullPath = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      const sub = zipFolder.folder(entry.name);
      if (sub) addDirectoryRecursive(fullPath, sub, skipNames);
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      // Skip oversized temp files (> 40MB)
      if (stat.size > 40 * 1024 * 1024) continue;
      zipFolder.file(entry.name, fs.readFileSync(fullPath));
    }
  }
}

function generateWpfSetupPs1(opts: {
  brandTitle: string;
  desktopAppName: string;
  description: string;
  version: string;
  defaultFolderName: string;
  createDesktopShortcut: boolean;
  launchAfterInstall: boolean;
}): string {
  const safeTitle = escapeXml(`تثبيت التطبيق — ${opts.brandTitle} · ${opts.desktopAppName}`);
  const safeBrand = escapeXml(opts.brandTitle);
  const safeApp = escapeXml(opts.desktopAppName);
  const safeDesc = escapeXml(opts.description);
  const safeVer = escapeXml(opts.version);
  const psBrand = escapePsSingle(opts.brandTitle);
  const psApp = escapePsSingle(opts.desktopAppName);
  const psDesc = escapePsSingle(opts.description);
  const psVer = escapePsSingle(opts.version);
  const psFolder = escapePsSingle(opts.defaultFolderName);
  const desktopChecked = opts.createDesktopShortcut ? 'True' : 'False';
  const launchChecked = opts.launchAfterInstall ? 'True' : 'False';

  return `#Requires -Version 5.1
# Windows Offline Desktop Installer GUI (WPF) — Generated automatically
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Split-Path -Parent $ScriptDir
$AppSourceDir = Join-Path $PackageRoot "app"
$LogoPngPath = Join-Path $ScriptDir "logo.png"
$AppIcoPath = Join-Path $ScriptDir "app.ico"

$BrandTitle = '${psBrand}'
$DesktopAppName = '${psApp}'
$AppDescription = '${psDesc}'
$AppVersion = '${psVer}'
$DefaultFolderName = '${psFolder}'
$DefaultInstallDir = Join-Path "$env:LOCALAPPDATA\\Programs" $DefaultFolderName

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="${safeTitle}"
        Height="560" Width="680"
        WindowStartupLocation="CenterScreen"
        ResizeMode="NoResize"
        Background="#111018"
        Foreground="#F8FAFC"
        FontFamily="Segoe UI, Tahoma"
        FlowDirection="RightToLeft">
  <Grid Margin="28,24,28,24">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <!-- Header Row: Logo on Right, Titles on Left (RTL) -->
    <Grid Grid.Row="0" Margin="0,0,0,26">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
      </Grid.ColumnDefinitions>

      <Border Grid.Column="0" Width="156" Height="156" CornerRadius="14" Background="#07070B" BorderBrush="#262535" BorderThickness="1" Margin="0,0,22,0">
        <Image x:Name="AppLogoImage" Stretch="Uniform" Margin="6"/>
      </Border>

      <StackPanel Grid.Column="1" VerticalAlignment="Center" FlowDirection="LeftToRight" HorizontalAlignment="Left">
        <TextBlock Text="${safeBrand}" Foreground="#FBBF24" FontSize="28" FontWeight="Bold" HorizontalAlignment="Left"/>
        <TextBlock Text="${safeApp}" Foreground="#FFFFFF" FontSize="36" FontWeight="ExtraBold" Margin="0,2,0,10" HorizontalAlignment="Left"/>
        <TextBlock Text="${safeDesc}" Foreground="#CBD5E1" FontSize="17" TextWrapping="Wrap" FlowDirection="RightToLeft" HorizontalAlignment="Left"/>
      </StackPanel>
    </Grid>

    <!-- Install Directory Label -->
    <TextBlock Grid.Row="1" Text="مجلد التثبيت" Foreground="#CBD5E1" FontSize="14" Margin="0,0,0,8" FlowDirection="LeftToRight" HorizontalAlignment="Left"/>

    <!-- Install Directory Input + Browse Button -->
    <Grid Grid.Row="2" Margin="0,0,0,20">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
      </Grid.ColumnDefinitions>
      <Button x:Name="BrowseBtn" Grid.Column="0" Content="تغيير" Width="88" Height="36" Margin="0,0,10,0"
              Background="#181722" Foreground="#FFFFFF" BorderBrush="#D4D4DC" BorderThickness="1.5"
              FontSize="14" FontWeight="SemiBold" Cursor="Hand"/>
      <TextBox x:Name="InstallPathBox" Grid.Column="1" Height="36" VerticalContentAlignment="Center"
               Padding="10,0" Background="#FFFFFF" Foreground="#111827" BorderBrush="#CBD5E1"
               FontSize="13.5" FlowDirection="LeftToRight"/>
    </Grid>

    <!-- Checkboxes -->
    <StackPanel Grid.Row="3" Margin="0,0,0,18">
      <CheckBox x:Name="DesktopShortcutCheck" Content="إضافة اختصار على سطح المكتب" IsChecked="${desktopChecked}"
                Foreground="#E2E8F0" FontSize="14.5" Margin="0,0,0,12"/>
      <CheckBox x:Name="LaunchAfterCheck" Content="تشغيل التطبيق بعد التثبيت" IsChecked="${launchChecked}"
                Foreground="#E2E8F0" FontSize="14.5"/>
    </StackPanel>

    <!-- Progress Bar -->
    <StackPanel Grid.Row="4" Margin="0,4,0,10">
      <ProgressBar x:Name="InstallProgress" Height="22" Minimum="0" Maximum="100" Value="0"
                   Background="#E5E7EB" Foreground="#7C5CFF" BorderBrush="#94A3B8" BorderThickness="1"/>
      <TextBlock x:Name="StatusText" Text="" Foreground="#A78BFA" FontSize="12.5" Margin="0,6,0,0"/>
    </StackPanel>

    <!-- Version Metadata -->
    <StackPanel Grid.Row="5" Orientation="Horizontal" VerticalAlignment="Top" FlowDirection="LeftToRight" HorizontalAlignment="Left">
      <TextBlock Text="Windows x64  &#x2022;  " Foreground="#94A3B8" FontSize="14"/>
      <TextBlock Text="${safeVer}" Foreground="#94A3B8" FontSize="14" Margin="0,0,6,0"/>
      <TextBlock Text="الإصدار" Foreground="#94A3B8" FontSize="14"/>
    </StackPanel>

    <!-- Footer Buttons -->
    <Grid Grid.Row="6" Margin="0,12,0,0">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>

      <Button x:Name="CloseBtn" Grid.Column="0" Content="إغلاق" Width="124" Height="42"
              Background="#181722" Foreground="#FFFFFF" BorderBrush="#D4D4DC" BorderThickness="1.5"
              FontSize="15" FontWeight="SemiBold" Cursor="Hand"/>

      <Button x:Name="InstallBtn" Grid.Column="2" Content="تثبيت التطبيق" Width="210" Height="42"
              Background="#7C5CFF" Foreground="#FFFFFF" BorderThickness="0"
              FontSize="15" FontWeight="Bold" Cursor="Hand"/>
    </Grid>
  </Grid>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)

$AppLogoImage = $window.FindName("AppLogoImage")
$InstallPathBox = $window.FindName("InstallPathBox")
$BrowseBtn = $window.FindName("BrowseBtn")
$DesktopShortcutCheck = $window.FindName("DesktopShortcutCheck")
$LaunchAfterCheck = $window.FindName("LaunchAfterCheck")
$InstallProgress = $window.FindName("InstallProgress")
$StatusText = $window.FindName("StatusText")
$InstallBtn = $window.FindName("InstallBtn")
$CloseBtn = $window.FindName("CloseBtn")

$InstallPathBox.Text = $DefaultInstallDir

# Load Logo Image & Window Icon
if (Test-Path $LogoPngPath) {
  try {
    $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
    $bitmap.BeginInit()
    $bitmap.UriSource = New-Object System.Uri($LogoPngPath)
    $bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
    $bitmap.EndInit()
    $AppLogoImage.Source = $bitmap
    $window.Icon = $bitmap
  } catch {}
}

function Do-Events {
  [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke(
    [Action]{},
    [System.Windows.Threading.DispatcherPriority]::Background
  )
}

$BrowseBtn.Add_Click({
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = "اختر مجلد تثبيت التطبيق"
  $dialog.SelectedPath = $InstallPathBox.Text
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $selected = $dialog.SelectedPath
    if (-not $selected.EndsWith($DefaultFolderName)) {
      $selected = Join-Path $selected $DefaultFolderName
    }
    $InstallPathBox.Text = $selected
  }
})

$CloseBtn.Add_Click({
  $window.Close()
})

$InstallBtn.Add_Click({
  $targetDir = $InstallPathBox.Text.Trim()
  if ([string]::IsNullOrWhiteSpace($targetDir)) {
    [System.Windows.MessageBox]::Show("يرجى تحديد مجلد تثبيت صالح.", "تنبيه", "OK", "Warning")
    return
  }

  $InstallBtn.IsEnabled = $false
  $BrowseBtn.IsEnabled = $false
  $InstallPathBox.IsEnabled = $false
  $InstallBtn.Content = "جاري التثبيت..."
  $StatusText.Text = "جاري إنشاء مجلد التثبيت..."
  $InstallProgress.Value = 5
  Do-Events

  try {
    if (-not (Test-Path $targetDir)) {
      New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    # Copy all offline app files with live progress
    $allFiles = Get-ChildItem -Path $AppSourceDir -Recurse -File
    $total = [Math]::Max(1, $allFiles.Count)
    $index = 0

    foreach ($file in $allFiles) {
      $relPath = $file.FullName.Substring($AppSourceDir.Length).TrimStart('\\', '/')
      $destPath = Join-Path $targetDir $relPath
      $destFolder = Split-Path -Parent $destPath
      if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
      }
      Copy-Item -Path $file.FullName -Destination $destPath -Force
      $index++
      $pct = [Math]::Min(80, 5 + [int](($index / $total) * 75))
      $InstallProgress.Value = $pct
      $StatusText.Text = "جاري نسخ ملفات التشغيل الأوفلاين ($index / $total)..."
      if (($index % 3) -eq 0 -or $index -eq $total) { Do-Events }
    }

    # Copy icon & logo to install root
    $installedIco = Join-Path $targetDir "app.ico"
    $installedPng = Join-Path $targetDir "logo.png"
    if (Test-Path $AppIcoPath) { Copy-Item -Path $AppIcoPath -Destination $installedIco -Force }
    if (Test-Path $LogoPngPath) { Copy-Item -Path $LogoPngPath -Destination $installedPng -Force }

    $InstallProgress.Value = 86
    $StatusText.Text = "جاري إنشاء اختصارات النظام..."
    Do-Events

    $wsh = New-Object -ComObject WScript.Shell
    $vbsLauncher = Join-Path $targetDir "run-silent.vbs"

    # Start Menu shortcut
    $startMenuDir = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs"
    $startShortcutPath = Join-Path $startMenuDir "$DesktopAppName.lnk"
    $scStart = $wsh.CreateShortcut($startShortcutPath)
    $scStart.TargetPath = "wscript.exe"
    $scStart.Arguments = "\`"$vbsLauncher\`""
    $scStart.WorkingDirectory = $targetDir
    $scStart.Description = $AppDescription
    if (Test-Path $installedIco) { $scStart.IconLocation = "$installedIco,0" }
    $scStart.Save()

    # Desktop shortcut if checked
    if ($DesktopShortcutCheck.IsChecked -eq $true) {
      $desktopDir = [Environment]::GetFolderPath("Desktop")
      $desktopShortcutPath = Join-Path $desktopDir "$DesktopAppName.lnk"
      $scDesktop = $wsh.CreateShortcut($desktopShortcutPath)
      $scDesktop.TargetPath = "wscript.exe"
      $scDesktop.Arguments = "\`"$vbsLauncher\`""
      $scDesktop.WorkingDirectory = $targetDir
      $scDesktop.Description = $AppDescription
      if (Test-Path $installedIco) { $scDesktop.IconLocation = "$installedIco,0" }
      $scDesktop.Save()
    }

    $InstallProgress.Value = 94
    $StatusText.Text = "جاري تسجيل التطبيق في قائمة برامج ويندوز..."
    Do-Events

    # Register in Windows Add/Remove Programs (HKCU - no admin UAC required)
    $uninstallKey = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\$DefaultFolderName"
    New-Item -Path $uninstallKey -Force | Out-Null
    Set-ItemProperty -Path $uninstallKey -Name "DisplayName" -Value "$DesktopAppName"
    Set-ItemProperty -Path $uninstallKey -Name "Publisher" -Value "$BrandTitle"
    Set-ItemProperty -Path $uninstallKey -Name "DisplayVersion" -Value "$AppVersion"
    Set-ItemProperty -Path $uninstallKey -Name "InstallLocation" -Value "$targetDir"
    if (Test-Path $installedIco) {
      Set-ItemProperty -Path $uninstallKey -Name "DisplayIcon" -Value "$installedIco"
    }
    Set-ItemProperty -Path $uninstallKey -Name "UninstallString" -Value "\`"$targetDir\\Uninstall.bat\`""
    Set-ItemProperty -Path $uninstallKey -Name "NoModify" -Value 1 -Type DWord
    Set-ItemProperty -Path $uninstallKey -Name "NoRepair" -Value 1 -Type DWord

    $InstallProgress.Value = 100
    $StatusText.Text = "تم تثبيت التطبيق بنجاح! يعمل الآن أوفلاين بدون إنترنت."
    $InstallBtn.Content = "تم التثبيت بنجاح"
    $InstallBtn.Background = "#10B981"
    Do-Events

    if ($LaunchAfterCheck.IsChecked -eq $true) {
      Start-Process "wscript.exe" -ArgumentList "\`"$vbsLauncher\`""
    }

    [System.Windows.MessageBox]::Show("تم تثبيت $DesktopAppName (الإصدار $AppVersion) بنجاح!\`nيمكنك الآن تشغيله مباشرة من سطح المكتب بدون إنترنت.", "اكتمل التثبيت", "OK", "Information")
    $window.Close()
  } catch {
    $StatusText.Text = "حدث خطأ أثناء التثبيت: $($_.Exception.Message)"
    $InstallBtn.IsEnabled = $true
    $BrowseBtn.IsEnabled = $true
    $InstallPathBox.IsEnabled = $true
    $InstallBtn.Content = "إعادة المحاولة"
    [System.Windows.MessageBox]::Show("حدث خطأ أثناء التثبيت:\`n$($_.Exception.Message)", "خطأ في التثبيت", "OK", "Error")
  }
})

$window.ShowDialog() | Out-Null
`;
}

function generateOfflineServerPs1(opts: {
  desktopAppName: string;
  folderName: string;
}): string {
  const psFolder = escapePsSingle(opts.folderName);
  const psApp = escapePsSingle(opts.desktopAppName);

  return `#Requires -Version 5.1
# Zero-Dependency Native .NET Offline Local HTTP Server + Standalone App Launcher
$ErrorActionPreference = "SilentlyContinue"
$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FolderId = '${psFolder}'
$AppTitle = '${psApp}'

# Pick an available free local TCP port
$tcp = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
$tcp.Start()
$Port = $tcp.LocalEndpoint.Port
$tcp.Stop()

$BaseUrl = "http://127.0.0.1:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($BaseUrl)
$listener.Start()

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".mjs"  = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".wasm" = "application/wasm"
  ".woff" = "font/woff"
  ".woff2"= "font/woff2"
  ".ttf"  = "font/ttf"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
  ".mp3"  = "audio/mpeg"
  ".wav"  = "audio/wav"
  ".svga" = "application/octet-stream"
  ".proto"= "text/plain; charset=utf-8"
}

# Launch native desktop app window using Edge or Chrome (--app mode, no URL bar)
$profileDir = Join-Path $env:LOCALAPPDATA "$FolderId-Profile"
$edgeCandidates = @(
  "$env:ProgramFiles (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
  "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe",
  "$env:ProgramFiles (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe"
)
$browserExe = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$appProcess = $null
if ($browserExe) {
  $appProcess = Start-Process -FilePath $browserExe -ArgumentList @(
    "--app=$BaseUrl",
    "--user-data-dir=\`"$profileDir\`"",
    "--window-size=1360,860",
    "--no-first-run",
    "--disable-default-apps"
  ) -PassThru
} else {
  Start-Process $BaseUrl
}

# Serve local offline files until app closes or idle
$lastRequest = Get-Date
try {
  while ($listener.IsListening) {
    $asyncResult = $listener.BeginGetContext($null, $null)
    while (-not $asyncResult.AsyncWaitHandle.WaitOne(1000)) {
      if ($appProcess -and $appProcess.HasExited) {
        if (((Get-Date) - $lastRequest).TotalSeconds -gt 8) {
          break
        }
      }
    }
    if (-not $asyncResult.IsCompleted) { break }

    $context = $listener.EndGetContext($asyncResult)
    $lastRequest = Get-Date
    $req = $context.Request
    $res = $context.Response

    try {
      $urlPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ([string]::IsNullOrEmpty($urlPath) -or $urlPath -eq "/") {
        $urlPath = "/index.html"
      }
      $rel = $urlPath.TrimStart('/').Replace('/', '\\')
      $filePath = Join-Path $AppRoot $rel

      if (-not (Test-Path $filePath -PathType Leaf)) {
        # SPA fallback to index.html
        $filePath = Join-Path $AppRoot "index.html"
      }

      if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
        $mime = $mimeTypes[$ext]
        if (-not $mime) { $mime = "application/octet-stream" }

        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $res.StatusCode = 200
        $res.ContentType = $mime
        $res.Headers.Add("Cross-Origin-Resource-Policy", "cross-origin")
        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
} finally {
  try { $listener.Stop(); $listener.Close() } catch {}
}
`;
}

function generateRunSilentVbs(): string {
  return `Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strDir & "\\offline-server.ps1"""
shell.Run cmd, 0, False
`;
}

function generateUninstallBat(opts: {
  desktopAppName: string;
  folderName: string;
}): string {
  return `@echo off
chcp 65001 >nul
title Uninstall ${opts.desktopAppName}
echo جاري إزالة تثبيت ${opts.desktopAppName}...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); ^
   Remove-Item (Join-Path $desktop '${escapePsSingle(opts.desktopAppName)}.lnk') -Force -ErrorAction SilentlyContinue; ^
   $startMenu = Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'; ^
   Remove-Item (Join-Path $startMenu '${escapePsSingle(opts.desktopAppName)}.lnk') -Force -ErrorAction SilentlyContinue; ^
   Remove-Item 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${escapePsSingle(opts.folderName)}' -Recurse -Force -ErrorAction SilentlyContinue;"
echo تم إزالة اختصارات التطبيق بنجاح.
timeout /t 2 >nul
`;
}

function generateSetupBat(desktopAppName: string): string {
  return `@echo off
chcp 65001 >nul
title ${desktopAppName} - Windows Installer
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File "%~dp0installer\\setup-ui.ps1"
exit /b 0
`;
}

function buildOfflineFallbackHtml(opts: {
  brandTitle: string;
  desktopAppName: string;
  description: string;
  version: string;
}): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeXml(opts.brandTitle)} · ${escapeXml(opts.desktopAppName)}</title>
  <link rel="icon" type="image/png" href="/logo.png" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0b0a12; color: #f8fafc; font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; }
    .card { max-width: 560px; width: 100%; background: #141320; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.6); }
    img { width: 112px; height: 112px; border-radius: 16px; object-fit: contain; margin-bottom: 16px; }
    h1 { color: #fbbf24; font-size: 24px; margin-bottom: 4px; }
    h2 { color: #fff; font-size: 28px; margin-bottom: 10px; }
    p { color: #cbd5e1; font-size: 14px; line-height: 1.7; }
    .badge { display: inline-block; margin-top: 16px; padding: 6px 14px; border-radius: 999px; background: rgba(124,92,255,0.18); border: 1px solid rgba(124,92,255,0.4); color: #c4b5fd; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="${escapeXml(opts.desktopAppName)}" />
    <h1>${escapeXml(opts.brandTitle)}</h1>
    <h2>${escapeXml(opts.desktopAppName)}</h2>
    <p>${escapeXml(opts.description)}</p>
    <div class="badge">Windows x64 · الإصدار ${escapeXml(opts.version)} · وضع أوفلاين</div>
  </div>
</body>
</html>`;
}

// Check offline build readiness
router.get('/status', (_req, res) => {
  const distIndex = path.join(process.cwd(), 'dist', 'index.html');
  res.json({
    offlineBundleReady: fs.existsSync(distIndex),
    platform: 'Windows x64',
  });
});

// Verify passcode endpoint
router.post('/verify-passcode', (req, res) => {
  const normalized = normalizePasscode(req.body?.passcode);
  if (normalized !== INSTALLER_PASSCODE_NORMALIZED) {
    return res.status(403).json({
      ok: false,
      message: 'كلمة السر غير صحيحة. يرجى إدخال كلمة المرور الصحيحة للوصول إلى مثبّت الويندوز.',
    });
  }
  return res.json({ ok: true });
});

// Build & Download Real Windows Offline Installer Package (.zip)
router.post('/build', async (req, res) => {
  try {
    const normalized = normalizePasscode(req.body?.passcode);
    if (normalized !== INSTALLER_PASSCODE_NORMALIZED) {
      return res.status(403).json({
        error: 'INVALID_PASSCODE',
        message: 'كلمة السر غير صحيحة — غير مصرح بتنزيل مثبّت الويندوز.',
      });
    }

    const brandTitle = sanitizeWindowsName(req.body?.brandTitle, 'Ahmed Pro SVGA');
    const desktopAppName = sanitizeWindowsName(req.body?.desktopAppName, 'MotionTools');
    const description = String(req.body?.description || 'تطبيق ويندوز لمعالجة وتحويل ملفات الحركة').trim();
    const version = String(req.body?.version || '1.0.24').replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim() || '1.0.24';
    const createDesktopShortcut = req.body?.createDesktopShortcut !== false;
    const launchAfterInstall = req.body?.launchAfterInstall !== false;
    const logoDataUrl = typeof req.body?.logoDataUrl === 'string' ? req.body.logoDataUrl : undefined;

    const folderName = sanitizeFolderToken(desktopAppName, 'MotionTools');
    const rootDir = process.cwd();
    const distDir = path.join(rootDir, 'dist');

    // Ensure compiled offline frontend bundle exists in dist/
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      try {
        execSync('npx vite build', {
          cwd: rootDir,
          stdio: 'pipe',
          timeout: 180000,
        });
      } catch (buildErr) {
        console.warn('[WindowsInstaller] On-demand vite build skipped/failed, falling back:', buildErr);
      }
    }

    const zip = new JSZip();
    const installerFolder = zip.folder('installer')!;
    const appFolder = zip.folder('app')!;

    // 1. Resolve Logo PNG & Generate Real Windows .ico
    const logoPngBuffer = decodeLogoDataUrl(logoDataUrl) || getDefaultLogoBuffer(rootDir);
    if (logoPngBuffer) {
      const icoBuffer = pngBufferToIcoBuffer(logoPngBuffer);
      installerFolder.file('logo.png', logoPngBuffer);
      installerFolder.file('app.ico', icoBuffer);
    }

    // 2. Native Windows WPF GUI Setup Script + 1-Click Launcher
    const setupPs1 = generateWpfSetupPs1({
      brandTitle,
      desktopAppName,
      description,
      version,
      defaultFolderName: folderName,
      createDesktopShortcut,
      launchAfterInstall,
    });
    // UTF-8 with BOM so Windows PowerShell 5.1 reads Arabic RTL text cleanly!
    const utf8Bom = Buffer.from([0xef, 0xbb, 0xbf]);
    installerFolder.file('setup-ui.ps1', Buffer.concat([utf8Bom, Buffer.from(setupPs1, 'utf8')]));
    zip.file(`Setup-${folderName}.bat`, Buffer.from(generateSetupBat(desktopAppName), 'utf8'));

    // 3. Offline App Bundle (compiled dist/ or fallback)
    const distIndexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(distIndexPath)) {
      addDirectoryRecursive(
        distDir,
        appFolder,
        new Set(['server.cjs', 'aistudio', '.DS_Store'])
      );

      // Patch app/index.html with custom title, desktop meta, and offline runtime metadata
      let html = fs.readFileSync(distIndexPath, 'utf8');
      const customTitle = `${escapeXml(brandTitle)} · ${escapeXml(desktopAppName)}`;
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${customTitle}</title>`);
      const offlineMetaScript = `<script>window.__OFFLINE_DESKTOP_APP__=${JSON.stringify({
        brandTitle,
        desktopAppName,
        description,
        version,
        offline: true,
        platform: 'Windows x64',
      })};</script>`;
      html = html.replace('</head>', `${offlineMetaScript}\n</head>`);
      appFolder.file('index.html', html);
    } else {
      appFolder.file(
        'index.html',
        buildOfflineFallbackHtml({ brandTitle, desktopAppName, description, version })
      );
    }

    // Include custom logo inside app/ so favicon & PWA/offline UI use the uploaded logo too
    if (logoPngBuffer) {
      appFolder.file('logo.png', logoPngBuffer);
      appFolder.file('pwa-192x192.png', logoPngBuffer);
      appFolder.file('pwa-512x512.png', logoPngBuffer);
      appFolder.file('favicon-32x32.png', logoPngBuffer);
      appFolder.file('app.ico', pngBufferToIcoBuffer(logoPngBuffer));
    }

    // Patch manifest.json inside offline app bundle
    const customManifest = {
      id: '/',
      name: `${brandTitle} - ${desktopAppName}`,
      short_name: desktopAppName.slice(0, 12),
      description,
      version,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#111018',
      background_color: '#111018',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    };
    appFolder.file('manifest.json', JSON.stringify(customManifest, null, 2));

    // Include FFmpeg core offline vendor files if present in node_modules
    const ffmpegCoreDir = path.join(rootDir, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
    if (fs.existsSync(ffmpegCoreDir)) {
      const vendorFfmpeg = appFolder.folder('vendor')?.folder('ffmpeg-core');
      if (vendorFfmpeg) {
        addDirectoryRecursive(ffmpegCoreDir, vendorFfmpeg, new Set(['.DS_Store']));
      }
    }

    // 4. Zero-dependency Native .NET Offline Server + Silent VBScript Launcher + Uninstaller
    const offlineServerPs1 = generateOfflineServerPs1({ desktopAppName, folderName });
    appFolder.file('offline-server.ps1', Buffer.concat([utf8Bom, Buffer.from(offlineServerPs1, 'utf8')]));
    appFolder.file('run-silent.vbs', Buffer.from(generateRunSilentVbs(), 'utf8'));
    appFolder.file('Uninstall.bat', Buffer.from(generateUninstallBat({ desktopAppName, folderName }), 'utf8'));
    appFolder.file(
      'app-meta.json',
      JSON.stringify(
        {
          brandTitle,
          desktopAppName,
          description,
          version,
          platform: 'Windows x64',
          offline: true,
          builtAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    // 5. Arabic ReadMe file
    const readmeTxt = `======================================================
  ${brandTitle} — ${desktopAppName} (الإصدار ${version})
  نسخة ويندوز أوفلاين (Windows x64)
======================================================

طريقة التثبيت:
1. فك ضغط هذا الملف بالكامل في أي مجلد.
2. اضغط مرتين على الملف: Setup-${folderName}.bat
3. ستفتح لك نافذة التثبيت الاحترافية — يمكنك تغيير مجلد التثبيت وتفعيل اختصار سطح المكتب.
4. اضغط "تثبيت التطبيق" — سيتم تثبيت البرنامج مع اللوجو والاسم المخصص ويعمل أوفلاين بالكامل بدون إنترنت!
`;
    zip.file('اقرأني-طريقة-التثبيت.txt', Buffer.concat([utf8Bom, Buffer.from(readmeTxt, 'utf8')]));

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 5 },
    });

    const asciiFilename = `${folderName.replace(/[^A-Za-z0-9._-]/g, '_') || 'MotionTools'}-Setup-v${version.replace(/[^A-Za-z0-9._-]/g, '_')}-Win64.zip`;
    const utf8Filename = encodeURIComponent(`${folderName}-Setup-v${version}-Win64.zip`);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`
    );
    res.setHeader('Content-Length', zipBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(zipBuffer);
  } catch (err: any) {
    console.error('[WindowsInstaller] Build error:', err);
    return res.status(500).json({
      error: 'WINDOWS_INSTALLER_BUILD_FAILED',
      message: err?.message || 'حدث خطأ أثناء بناء حزمة مثبّت الويندوز.',
    });
  }
});

export default router;
