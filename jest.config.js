// jest.config.js
module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  automock: false,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
