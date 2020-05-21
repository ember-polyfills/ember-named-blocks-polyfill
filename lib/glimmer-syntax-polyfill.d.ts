import { builders } from '@glimmer/syntax';

declare module '@glimmer/syntax' {
  export namespace AST {
    export interface CommonProgram extends BaseNode {
      body: Statement[];
      blockParams: string[];
    }

    export interface Block extends CommonProgram {
      type: 'Block';
    }

    export interface Template extends CommonProgram {
      type: 'Template';
    }

    export interface Nodes {
      Block: Block;
      Template: Template;
    }
  }

  export type Builders = typeof builders & {
    blockItself: (
      body?: AST.Statement[],
      blockParams?: string[],
      chained?: boolean,
      loc?: AST.SourceLocation
    ) => AST.Program;
  };
}
