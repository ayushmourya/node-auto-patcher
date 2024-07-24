#!/usr/bin/env node

const AutoPatcher = require("../lib/index");
const path = require("path");

const config = {
  packageJsonPath: path.join(process.cwd(), "package.json"),
  sandboxDir: path.join(process.cwd(), "auto-patcher-sandbox"),
  patchSchedule: "0 0 * * *",
};

const autoPatcher = new AutoPatcher(config);
autoPatcher.start();
