# CI Build Note

If you encounter an ENOENT error similar to:

```
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/kavia/workspace/code-generation/package.json'
```

This indicates that npm was executed from the repository root instead of the frontend workspace.

Run npm from the correct directory:

```
cd AI-Driven-WebUI-268
npm install
npm run build
```

This project builds successfully when executed from AI-Driven-WebUI-268.
