declare module 'ajv/dist/compile/codegen' {
  export const operators: any;
  export const _: any;
  export const str: any;
  export const nil: any;
  export const Name: any;
  export default class CodeGen {
    constructor(...args: any[]);
  }
}

declare module 'ajv/dist/core' {
  export const checkStrictMode: any;
}

declare module 'ajv-draft-04' {
  import Ajv from 'ajv';
  const Draft04: typeof Ajv;
  export default Draft04;
} 