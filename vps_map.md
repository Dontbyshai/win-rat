# Cartographie du VPS OuiHeberg
**IP:** `141.11.185.92`

Ce document dresse l'état des lieux actuel de votre serveur. Il sera utile pour savoir ce qui tourne et où se trouvent les fichiers.

## 🐳 Conteneurs Docker
| Service | Image | Statut | Ports | Description |
| :--- | :--- | :--- | :--- | :--- |
| **mailserver** | `analogic/poste.io` | 🟢 En cours (Up) | N/A | Serveur mail (Poste.io). Actif. |

## 🌐 Sites Web configurés (Nginx)
Voici les configurations Nginx actuellement actives (`/etc/nginx/sites-enabled`) :
- `notianote` : Site principal NotiaNote.
- `notifs.notianote.fr` : API de notifications NotiaNote.
- `mail.notianote.fr` : Interface mail pour NotiaNote.
- `shaiscompany.com` : Le futur site vitrine.*
- `winrat` : Panel C2 win-rat (**sans nom de domaine**, accès par IP directe).

## 📁 Répertoires Web (`/var/www/`)
Voici les dossiers contenant le code source ou les applications hébergées sur votre VPS :
- `/var/www/NotiaNote/` : L'application NotiaNote.
- `/var/www/notianote-API/` : L'API backend de NotiaNote.
- `/var/www/notianote-admin/` : Le panel administrateur de NotiaNote.
- `/var/www/wallet-backend/` : Un autre service backend pour un wallet.
- `/var/www/html/` : Dossier par défaut.
- `/var/www/win-rat/` : Le panel C2 win-rat (backend Laravel + frontend React).
- *[Bientôt] `/var/www/shaiscompany/` : Les fichiers de votre nouveau site vitrine.*

## 🐀 Win-Rat C2 Panel
| Composant | Port | URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** (React) | `8801` | `http://141.11.185.92:8801` | Interface du panel C2, build statique servi par Nginx |
| **Backend** (Laravel) | `8800` | `http://141.11.185.92:8800/api` | API PHP, lancé via `php artisan serve` |

> [!NOTE]
> Pas de nom de domaine requis. Accès direct par IP sur les ports **8800** (API) et **8801** (UI).
> Les ports 8800 et 8801 ont été choisis car libres sur ce VPS.

## Ports occupés (référence)
| Port | Service |
| :--- | :--- |
| 80 | Nginx (HTTP) |
| 443 | Nginx (HTTPS) |
| 25 / 465 / 587 | Poste.io (SMTP) |
| 993 / 995 | Poste.io (IMAP/POP) |
| 6379 | Redis |
| **8800** | **Win-Rat Backend (Laravel)** |
| **8801** | **Win-Rat Frontend (Nginx static)** |

> [!TIP]
> Votre serveur mail (`mail.notianote.fr`) est géré via le conteneur Docker `poste.io`, et fonctionne correctement en arrière-plan.

