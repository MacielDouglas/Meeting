export interface DbCall {
  fn: string;
  args: unknown[];
}

export interface MockDb {
  readonly database: unknown;
  readonly calls: DbCall[];
  readonly pending: number;
  enqueue(result: unknown): void;
  enqueueMany(results: unknown[]): void;
  enqueueRejection(reason: unknown): void;
  reset(): void;
}

class MockRejection {
  readonly reason: unknown;
  constructor(reason: unknown) {
    this.reason = reason;
  }
}

/**
 * Valor de fila que faz o próximo `await` da cadeia rejeitar com `reason`
 * (simula falha do banco: timeout, tabela ausente, conexão caída).
 */
export function rejected(reason: unknown): unknown {
  return new MockRejection(reason);
}

/**
 * Banco mockado: cadeia Drizzle encadeável (select().from().where()...)
 * cujo `await` resolve o próximo resultado da fila. Nenhuma linha real
 * sai daqui — o tripwire de fetch em test/setup.ts bloqueia rede.
 */
function createChain(calls: DbCall[], queue: unknown[]): unknown {
  return new Proxy({} as object, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => {
          const value = queue.length > 0 ? (queue.shift() as unknown) : [];
          if (value instanceof MockRejection) {
            return Promise.reject(value.reason).then(resolve, reject);
          }
          return Promise.resolve(value).then(resolve, reject);
        };
      }
      if (prop === "catch" || prop === "finally" || typeof prop === "symbol") {
        return undefined;
      }
      return (...args: unknown[]) => {
        calls.push({ fn: String(prop), args });
        return createChain(calls, queue);
      };
    },
  });
}

export function createMockDb(): MockDb {
  const calls: DbCall[] = [];
  const queue: unknown[] = [];
  return {
    database: createChain(calls, queue),
    calls,
    get pending() {
      return queue.length;
    },
    enqueue(result: unknown) {
      queue.push(result);
    },
    enqueueMany(results: unknown[]) {
      queue.push(...results);
    },
    enqueueRejection(reason: unknown) {
      queue.push(new MockRejection(reason));
    },
    reset() {
      calls.length = 0;
      queue.length = 0;
    },
  };
}

// Instância única por arquivo de teste (isolamento de arquivo do Vitest).
export const mockDb = createMockDb();
