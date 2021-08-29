import SelectMap from "./SelectMap";
import { readFileSync } from "fs";
import { Simulate } from "react-dom/test-utils";
import { render, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react-hooks";

describe("SelectMap", () => {
  test("state returns to idle after loading map", async () => {
    render(<SelectMap>Select Map</SelectMap>);
    const file = new File(
      [readFileSync("./test-data/basic-1.ocd")],
      "basic-1.ocd",
      { type: "application/octet-stream" }
    );
    const input = document.querySelector("input");

    Simulate.change(input, { target: { files: [file] } });

    expect(input).toBeDisabled();
    await waitFor(() => expect(input).toBeEnabled());
  });
});
