module.exports = {
  getConnection: jest.fn().mockResolvedValue({
    execute: jest.fn().mockResolvedValue([]),
    release: jest.fn(),
    query: jest.fn().mockResolvedValue([]),
    end: jest.fn(),
  }),
  query: jest.fn().mockResolvedValue([]),
  execute: jest.fn().mockResolvedValue([]),
};
