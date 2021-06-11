import React from "react";
import SelectMap from "./SelectMap";

export default function StartScreen() {
  return (
    <>
      <div className="flex h-screen">
        <div className="m-auto text-center">
          <h3 className="text-4xl font-bold">O-Scout</h3>
          <div className="mt-8">
            <SelectMap type="primary" className="text-xl font-bold">
              Open a Map
            </SelectMap>
          </div>
        </div>
      </div>
    </>
  );
}
