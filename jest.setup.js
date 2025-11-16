// Limpiar todos los mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
});
