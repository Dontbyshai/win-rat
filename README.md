## Win-RAT
A security simulation and remote administration platform with a web based Command & Control (C2) panel for Windows, designed for ethical and authorised monitoring use cases.

### Features
- Remote command execution
- Live desktop streaming via Web RTC
- Audio, screenshot and webcam capture
- Keystroke logging
- Persistent background agent (auto startup after reboot/shutdown/termination)
- Automatic agent update

### Demo
[![Demo](https://thumbnails.odycdn.com/optimize/s:390:220/quality:85/plain/https://thumbs.odycdn.com/3abde9b00451bdcfda784573ec615fde.webp)](https://odysee.com/@tomiwa:4/Windows-RAT-with-a-Command---Control-%28C2%29-Server:6)

<img width="1640" height="806" alt="Screenshot from 2026-02-22 09-03-58" src="https://github.com/user-attachments/assets/735b23db-5930-4a68-b7b5-4e7e2ac03160" />
<img width="1640" height="806" alt="Screenshot from 2026-02-22 09-03-40" src="https://github.com/user-attachments/assets/3cee3033-0ac1-44eb-82fe-2c33fcf3af9b" />
<img width="1640" height="806" alt="Screenshot from 2026-02-22 09-03-20" src="https://github.com/user-attachments/assets/2c2e487c-a4d7-4583-a90b-3d48a14b54af" />

### Installation
```bash
git clone https://github.com/Tomiwa-Ot/win-rat.git
cd win-rat

# On Linux
chmod +x install.sh run.sh
./install.sh

# On windows
.\install.bat
```
To build the agent
- Open the agent folder in Visual Studio
- Set URL in ```agent/Utilities/Communication.cs``` to ```http://<IP>:8000/api```
- Build executable and deploy to target

NB: When deploying the agent to the target, ensure ```vpxmd.dll``` is in the same folder as the executable. You can find it in the root directory of this project. It is necessary for the live stream feature to work.

### Usage
```bash
# On Linux
./run.sh

# On Windows
.\run.bat
```

### Contribution
If you're interested in contributing or collaborating, open an issue, PR or contact the author.

THIS SOFTWARE IS INTENDED FOR AUTHORIZED, ETHICAL AND LEGAL USE ONLY. UNAUTHORIZED MONITORING OR ACCESS TO COMPUTER SYSTEMS VIOLATES PRIVACY LAWS. THE AUTHOR ASSUMES NO RESPONSIBILITY OR LIABILITY FOR MISUSE OF THIS SOFTWARE.
