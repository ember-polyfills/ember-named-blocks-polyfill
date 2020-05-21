declare module '@ember/debug' {
  export function assert(message: string): never;
  export function assert(message: string, condition: any): asserts condition;
}
