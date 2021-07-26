import React, { createContext, useContext, useState } from "react";

const DropdownContext = createContext();

export default function Dropdown({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative inline-block text-left z-20">
        <div>
          <button
            type="button"
            className="bg-gray-100 rounded-full p-2 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
            id="menu-button"
            aria-expanded="true"
            aria-haspopup="true"
            onClick={() => setOpen(!open)}
          >
            <span className="sr-only">Open options</span>
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Dropdown menu, show/hide based on menu state.

    Entering: "transition ease-out duration-100"
      From: "transform opacity-0 scale-95"
      To: "transform opacity-100 scale-100"
    Leaving: "transition ease-in duration-75"
      From: "transform opacity-100 scale-100"
      To: "transform opacity-0 scale-95" */}
        <div
          className={`relative transition ease-out duration-100 ${
            open
              ? "transform opacity-100 scale-100"
              : "transform opacity-0 scale-95"
          }`}
        >
          <div
            className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
            tabIndex="-1"
          >
            <div className="py-1" role="none">
              <DropdownContext.Provider value={() => setOpen(false)}>
                {children}
              </DropdownContext.Provider>
            </div>
          </div>
        </div>
      </div>
      {open && (
        <div
          className="absolute inset-y-0 left-8 right-0 bg-black opacity-5"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function DropdownItem({ onClick, children }) {
  const close = useContext(DropdownContext);
  return (
    <button
      className="hover:bg-gray-100 hover:text-gray-900 text-gray-700 block px-4 py-2 text-sm w-full text-left"
      role="menuitem"
      tabIndex="-1"
      onClick={(e) => {
        close();
        onClick && onClick(e);
      }}
    >
      {children}
    </button>
  );
}
