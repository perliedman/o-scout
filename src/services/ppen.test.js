import { readFileSync } from "fs";
import { DOMParser } from "xmldom";
import { parsePPen } from "./ppen";

describe("parsePPen", () => {
  test.each`
    ppenFile                         | numberCourses
    ${"./test-data/ppen/test1.ppen"} | ${4}
    ${"./test-data/ppen/test2.ppen"} | ${5}
  `("reads $input correctly", ({ ppenFile, numberCourses }) => {
    const ppenStr = readFileSync(ppenFile, "utf-8");
    const doc = new DOMParser().parseFromString(ppenStr, "text/xml");
    const event = parsePPen(doc);

    expect(event.courses.length).toBe(numberCourses);
  });
});
