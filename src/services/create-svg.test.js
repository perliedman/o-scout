import { vi, describe, expect, test } from "vitest";
import fetchSymbolSvg from "./fetch-symbol-svg";
import { courseToSvg } from "./create-svg";
import { parsePpenFile, createDocument } from "../test-utils";
import { controlCircleOutsideDiameter } from "./use-number-positions";

vi.mock("./fetch-symbol-svg");

describe("create-svg", () => {
  describe("courseToSvg", () => {
    test("can generate SVG for course", async () => {
      const document = createDocument();

      fetchSymbolSvg.mockImplementation(() => {
        const group = document.createElement("g");
        return Promise.resolve({
          group,
          dimensions: [5, 5],
        });
      });

      const {
        courses: [course],
        courseAppearance,
        name: eventName,
      } = parsePpenFile("./test-data/ppen/test1.ppen");
      const svg = await courseToSvg(
        course,
        courseAppearance,
        eventName,
        15000,
        document
      );

      const circles = Array.from(svg.getElementsByTagName("circle"));
      const controlCircles = circles.filter(
        (circle) =>
          Number(circle.getAttribute("r")) === controlCircleOutsideDiameter / 2
      );
      expect(controlCircles.length).toBe(6);
    });
  });
});
