import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue =
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export function Restrict(permission?: Permission): any {
  return function (target: any, key: string) {
    const isReadable = permission === "r" || permission === "rw";
    const isWritable = permission === "w" || permission === "rw";

    let value = target[key];
    Object.defineProperty(target, key, {
      enumerable: isReadable,
      configurable: isWritable,
      get: () => {
        if (isReadable) {
          return value;
        } 
      },
      set: (newValue: any) => {
        if (isWritable) {
          value = newValue;
        } 
      },
    });
  };


}

export class Store implements IStore {
  defaultPolicy: Permission = "rw";

  allowedToRead(key: string): boolean {
    return (
      Object.getOwnPropertyDescriptor(this, key)?.enumerable ||
      this.defaultPolicy === "r" ||
      this.defaultPolicy === "rw"
    );
  }

  allowedToWrite(key: string): boolean {
    return (
      Object.getOwnPropertyDescriptor(this, key)?.configurable ||
      this.defaultPolicy === "r" ||
      this.defaultPolicy === "rw"
    );
  }

  read(path: string): StoreResult {
    if (this.allowedToRead(path)) {
      return Object.getOwnPropertyDescriptor(this, path)?.value;
    }

    throw new Error("Read not allowed or property does not exist.");
  }

  write(path: string, value: StoreValue): StoreValue {
    if (this.allowedToWrite(path)) {
      return Object.defineProperty(this, path, {value});
    }
    throw new Error("Write not allowed.");
  }

  writeEntries(entries: JSONObject): void {
    Object.entries(entries).forEach((entrie) =>
      this.write(entrie[0], entrie[1])
    );
  }

  entries(): JSONObject {
    const objectEntries = Object.entries(this);
    const filteredEntries = objectEntries.filter((entrie) => {this.allowedToRead(entrie[0])});
    return Object.fromEntries(filteredEntries);
  }
}
