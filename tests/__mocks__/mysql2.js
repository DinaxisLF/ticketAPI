// tests/__mocks__/mysql2.js
module.exports = {
  createPool: jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue({
      execute: jest.fn().mockResolvedValue([]),
      query: jest.fn().mockResolvedValue([]),
      release: jest.fn(),
    }),
    query: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue([]),
    end: jest.fn(),
  })),
};
