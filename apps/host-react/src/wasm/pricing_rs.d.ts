/* tslint:disable */
/* eslint-disable */

/**
 * Dados que ficam dentro da memória do WASM.
 *
 * Usado no benchmark para medir o cálculo sem o custo da cópia:
 * os arrays são copiados uma vez, no construtor, e `total()` não copia nada.
 */
export class PriceBuffer {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Quantidade de linhas guardadas.
     */
    len(): number;
    constructor(prices_cents: Uint32Array | number[], quantities: Uint32Array | number[]);
    /**
     * Total em centavos, calculado sobre os dados já guardados no WASM.
     */
    total(): number;
}

/**
 * Prévia de preço exportada para o JavaScript.
 *
 * Os dois arrays são copiados do heap do JS para a memória linear do
 * WASM a cada chamada; o resultado (centavos) volta como um número.
 */
export function quote_preview(prices_cents: Uint32Array | number[], quantities: Uint32Array | number[]): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_pricebuffer_free: (a: number, b: number) => void;
    readonly pricebuffer_len: (a: number) => number;
    readonly pricebuffer_new: (a: number, b: number, c: number, d: number) => number;
    readonly pricebuffer_total: (a: number) => number;
    readonly quote_preview: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
