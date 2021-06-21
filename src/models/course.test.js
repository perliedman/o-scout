import { readFileSync } from "fs";
import { parsePPen } from "../services/ppen";

describe("course", () => {
  test("can generate SVG control definition", () => {
    const ppenStr = readFileSync("test-data/ppen/test1.ppen", "utf-8");
    const doc = new DOMParser().parseFromString(ppenStr, "text/xml");
    return parsePPen(doc);
  });
});
