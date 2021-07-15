import { readFileSync } from "fs";
import { parsePPen } from "./services/ppen";
import { DOMImplementation } from "xmldom";

export function parsePpenFile(path) {
  const ppenStr = readFileSync(path, "utf-8");
  const doc = new DOMParser().parseFromString(ppenStr, "text/xml");
  return parsePPen(doc);
}

const domImpl = new DOMImplementation();
export function createDocument() {
  return domImpl.createDocument();
}
