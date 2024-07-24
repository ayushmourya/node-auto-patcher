const AutoPatcher = require("../lib/index");
const path = require("path");
const os = require("os");

const testPackage = async (packageName, version) => {
  const tempDir = path.join(os.tmpdir(), "node-auto-patcher-sandbox");
  const config = {
    packageJsonPath: path.join(tempDir, "package.json"),
    sandboxDir: tempDir,
    patchSchedule: "0 0 * * *",
  };

  const autoPatcher = new AutoPatcher(config);

  try {
    console.log(`Testing ${packageName}@${version} in sandbox...`);
    await autoPatcher.createSandbox(packageName, version);
    const testPassed = await autoPatcher.testInSandbox(packageName);

    if (testPassed) {
      console.log(`✅ ${packageName}@${version} passed sandbox tests.`);
    } else {
      console.log(`❌ ${packageName}@${version} failed sandbox tests.`);
    }
  } catch (error) {
    console.error(`Error testing ${packageName}@${version}:`, error);
  } finally {
    require("fs").rmdirSync(tempDir, { recursive: true });
  }
};

const [, , packageName, version] = process.argv;

if (!packageName || !version) {
  console.log("Usage: node-auto-patcher test <package-name> <version>");
  process.exit(1);
}

testPackage(packageName, version);
