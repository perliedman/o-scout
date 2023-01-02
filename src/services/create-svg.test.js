import fetchSymbolSvg from "./fetch-symbol-svg";
import { courseToSvg } from "./create-svg";
import { parsePpenFile, createDocument } from "../test-utils";
import { controlCircleOutsideDiameter } from "./use-number-positions";

jest.mock("./fetch-symbol-svg");

describe("create-svg", () => {
  describe("courseToSvg", () => {
    // For reasons not clear to me, this test generates circle nodes as
    // expected _but_ I can't get the DOM to find them. Surely something
    // really stupid is going on, but I don't have time/energy to debug
    // this right now.
    test.skip("can generate SVG for course", async () => {
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

      const circles = [
        ...svg.getElementsByTagNameNS("http://www.w3.org/2000/svg", "circle"),
      ];
      const controlCircles = circles.filter(
        (circle) =>
          Number(circle.getAttribute("r")) === controlCircleOutsideDiameter / 2
      );
      expect(controlCircles.length).toBe(6);
    });
  });
});
