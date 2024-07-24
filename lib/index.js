const axios = require("axios");
const cron = require("node-cron");
const semver = require("semver");
const fs = require("fs").promises;
const path = require("path");
const { exec, execSync } = require("child_process");
const ncu = require("npm-check-updates");
const Docker = require("docker-cli-js").Docker;

class AutoPatcher {
  constructor(config) {
    this.config = config;
    this.docker = new Docker();
    this.ensureSandboxDir();
  }

  async ensureSandboxDir() {
    try {
      await fs.mkdir(this.config.sandboxDir, { recursive: true });
    } catch (error) {
      console.error(`Error creating sandbox directory: ${error}`);
      throw error;
    }
  }

  async checkForVulnerabilities() {
    console.log("Checking for vulnerabilities...");
    const result = await ncu.run({
      packageFile: this.config.packageJsonPath,
      upgrade: false,
      jsonUpgraded: true,
    });

    return Object.entries(result).map(([pkg, version]) => ({ pkg, version }));
  }

  async createSandbox(pkg, version) {
    console.log(`Creating sandbox for ${pkg}@${version}`);
    const sandboxDir = path.resolve(this.config.sandboxDir);
    console.log(`Sandbox directory: ${sandboxDir}`);

    // Ensure the sandbox directory exists
    await fs.mkdir(sandboxDir, { recursive: true });

    // Create a minimal package.json in the sandbox directory
    const minimalPackageJson = {
      name: "sandbox",
      version: "1.0.0",
      private: true,
      dependencies: {
        [pkg]: version,
      },
    };
    const packageJsonPath = path.join(sandboxDir, "package.json");
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(minimalPackageJson, null, 2)
    );
    console.log(`Created package.json at ${packageJsonPath}`);

    const dockerfilePath = path.join(sandboxDir, "Dockerfile");
    console.log(`Dockerfile path: ${dockerfilePath}`);
    await fs.writeFile(
      dockerfilePath,
      `
      FROM node:14
      WORKDIR /app
      COPY package.json .
      RUN npm install
      COPY test.js .
      CMD ["node", "test.js"]
      `
    );
    console.log(`Created Dockerfile at ${dockerfilePath}`);

    const testFilePath = path.join(sandboxDir, "test.js");
    await fs.writeFile(
      testFilePath,
      `
      const ${pkg.replace(/-/g, "_")} = require('${pkg}');
      console.log('Package loaded successfully');
      `
    );
    console.log(`Created test.js at ${testFilePath}`);

    console.log("Building Docker image...");

    try {
      const stdout = execSync(`docker build -t sandbox-${pkg} ${sandboxDir}`, {
        encoding: "utf8",
      });
      console.log("Docker build stdout:", stdout);
      console.log("Docker image built successfully");
    } catch (error) {
      console.error("Error building Docker image:", error.stderr);
      throw error;
    }
  }

  async testInSandbox(pkg) {
    console.log(`Testing ${pkg} in sandbox`);
    return new Promise((resolve) => {
      exec(`docker run --rm sandbox-${pkg}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Sandbox test failed: ${error}`);
          console.error(`Stderr: ${stderr}`);
          resolve(false);
        } else {
          console.log("Sandbox test output:", stdout);
          resolve(stdout.includes("Package loaded successfully"));
        }
      });
    });
  }

  async applyPatch(pkg, version) {
    console.log(`Applying patch for ${pkg}@${version}`);
    return new Promise((resolve, reject) => {
      exec(`npm install ${pkg}@${version}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error applying patch: ${error}`);
          reject(error);
        } else {
          console.log(`Patch applied successfully for ${pkg}`);
          resolve();
        }
      });
    });
  }

  async processDependency(pkg, version) {
    try {
      await this.createSandbox(pkg, version);
      const testPassed = await this.testInSandbox(pkg);
      if (testPassed) {
        await this.applyPatch(pkg, version);
        console.log(`Patch successfully applied for ${pkg}@${version}`);
        return true;
      } else {
        console.log(`Tests failed for ${pkg}@${version}, not applying patch`);
        return false;
      }
    } catch (error) {
      console.error(`Error processing ${pkg}@${version}:`, error);
      return false;
    }
  }

  async runPatchCycle() {
    try {
      console.log("Starting patch cycle...");
      const vulnerabilities = await this.checkForVulnerabilities();
      console.log("Vulnerabilities found:", vulnerabilities);

      if (vulnerabilities.length === 0) {
        console.log("No vulnerabilities found. Adding test package...");
        vulnerabilities.push({ pkg: "lodash", version: "latest" });
      }

      const results = [];
      for (const { pkg, version } of vulnerabilities) {
        console.log(`Processing ${pkg}@${version}`);
        try {
          await this.createSandbox(pkg, version);
          const testPassed = await this.testInSandbox(pkg);
          if (testPassed) {
            await this.applyPatch(pkg, version);
            results.push({ pkg, version, success: true });
          } else {
            console.log(
              `Tests failed for ${pkg}@${version}, not applying patch`
            );
            results.push({ pkg, version, success: false });
          }
        } catch (error) {
          console.error(`Error processing ${pkg}@${version}:`, error);
          results.push({ pkg, version, success: false });
        }
      }

      console.log("Patch cycle completed");
      return results;
    } catch (error) {
      console.error("Error in runPatchCycle:", error);
      throw error;
    }
  }

  schedulePatches() {
    cron.schedule(this.config.patchSchedule, async () => {
      console.log("Running scheduled patch cycle");
      const results = await this.runPatchCycle();
      console.log("Scheduled patch results:", results);
    });
  }

  async start() {
    console.log("AutoPatcher started");
    this.schedulePatches();
    console.log("Patch schedule:", this.config.patchSchedule);
    console.log(`Sandbox directory: ${path.resolve(this.config.sandboxDir)}`);

    const initialResults = await this.runPatchCycle();
    console.log("Initial patch results:", initialResults);
  }
}

const config = {
  packageJsonPath: path.resolve("./package.json"),
  sandboxDir: path.resolve("./auto-patcher-sandbox"),
  patchSchedule: "0 0 * * *",
};

const autoPatcher = new AutoPatcher(config);
autoPatcher.start();

module.exports = AutoPatcher;
