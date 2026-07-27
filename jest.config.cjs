module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  watchman: false,
  roots: ['<rootDir>/tests'],
  modulePathIgnorePatterns: ['<rootDir>/dist']
};
