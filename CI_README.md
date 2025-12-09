# CI Build Instructions

This repository contains multiple directories. The Vue app lives in:
- AI-Driven-WebUI-268/

To build the app in CI without path errors (ENOENT for package.json), either:
1) Run npm commands inside the application directory:
   - working directory: /home/kavia/workspace/code-generation/AI-Driven-WebUI-268
   - commands:
     - npm ci (or npm install)
     - npm run build

or

2) From the repo root, execute the helper script:
   - ./run-build.sh

The script ensures npm runs in the correct directory and sets CI=true for non-interactive builds.
