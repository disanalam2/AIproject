export type Literal = string | number | boolean | null;
export type Dict = {
    [key: string]: Json;
};
export type Json = Literal | Array<Json> | Dict;
export type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object';
export interface Item {
    key?: string;
    path: string[];
    node: Json;
    type: JsonType;
}
/**
 * Traverse a JSON object depth-first, in a `reduce` manner.
 *
 * @param input The root node to traverse
 * @param callback A function to call on each visited node
 * @param initialState Think of this as the last argument of `reduce`
 */
export declare function traverseTree<State>(input: Json, callback: (state: State, item: Item) => State, initialState: State): void;
