export type Scope = Record<string, number>;
export type Compiled = (scope: Scope) => number;
export function compile(src: string, names: string[]): Compiled;
