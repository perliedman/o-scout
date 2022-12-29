import { readFileSync } from "fs";
import fetchSymbolSvg from "./fetch-symbol-svg";
import { parsePpenFile, createDocument } from "../test-utils";
import { printCourse, renderPdf } from "./print";
import readOcad from "ocad2geojson/src/ocad-reader";
import OcadMap from "../map-providers/ocad-map";

jest.mock("./fetch-symbol-svg");

describe("print", () => {
  describe("printCourse", () => {
    test("can print course", async () => {
      const document = createDocument();

      fetchSymbolSvg.mockImplementation(() => {
        const group = document.createElement("g");
        return Promise.resolve({
          group,
          dimensions: [5, 5],
        });
      });

      const mapFile = await readOcad(readFileSync("./test-data/basic-1.ocd"));
      const ocadMap = new OcadMap("Basic", mapFile, undefined);

      const {
        courses: [course],
        courseAppearance,
        name: eventName,
      } = parsePpenFile("./test-data/ppen/test1.ppen");
      await printCourse(course, courseAppearance, eventName, ocadMap);
    });
  });
  describe("renderPdf", () => {
    test("can print course as PDF", async () => {
      const document = createDocument();

      fetchSymbolSvg.mockImplementation(() => {
        const group = document.createElement("g");
        return Promise.resolve({
          group,
          dimensions: [5, 5],
        });
      });

      const mapFile = await readOcad(readFileSync("./test-data/basic-1.ocd"));
      const ocadMap = new OcadMap("Basic", mapFile, undefined);

      const {
        courses: [course],
        courseAppearance,
        name: eventName,
      } = parsePpenFile("./test-data/ppen/test1.ppen");
      const svg = await printCourse(
        course,
        courseAppearance,
        eventName,
        ocadMap
      );
      await renderPdf(ocadMap, course.printArea, svg);
    });
  });
});
