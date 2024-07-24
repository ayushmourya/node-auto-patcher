# node-auto-patcher

Automated security patch applicator for Node.js dependencies

## Problem

Keeping Node.js dependencies up-to-date and secure can be a time-consuming and risky process. Manual updates may introduce breaking changes, while delaying updates leaves projects vulnerable to security threats.

## Solution

node-auto-patcher automates the process of detecting vulnerabilities, testing patches, and applying them safely, reducing the risk of both security vulnerabilities and breaking changes.

## Key Features

- Automated vulnerability detection using npm-check-updates
- Sandbox testing of patches using Docker
- Scheduled patch cycles with node-cron
- Easy integration with existing Node.js projects
- CLI command for testing specific packages

## Installation

```bash
npm install -g node-auto-patcher
```

## Usage

1. Global CLI command:
   ```bash
   node-auto-patcher test <package-name> <version>
   ```

```javascript
const AutoPatcher = require("node-auto-patcher");
const config = {
  packageJsonPath: "./package.json",
  sandboxDir: "./sandbox",
  patchSchedule: "0 0 * * *",
};
const autoPatcher = new AutoPatcher(config);
autoPatcher.start();
```

## Configuration

Customize the behavior by modifying the config object:

- `packageJsonPath`: Path to your project's package.json
- `sandboxDir`: Directory for sandbox testing
- `patchSchedule`: Cron schedule for automated patching

## Dependencies

- axios
- node-cron
- semver
- npm-check-updates
- docker-cli-js

Make sure you have Docker installed on your system for sandbox testing.

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

For major changes, please open an issue first to discuss the proposed changes.

## License

MIT
