import { useSidePanel } from "./SidePanelContext";
import { ChevronLeft, ChevronRight } from "react-feather";
import { useState } from "react";

export default function FooterWithCollapseButton() {
  const { isCollapsed, toggle } = useSidePanel();
  const [bottomTerminalOpen, setBottomTerminalOpen] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50 flex justify-between items-center px-8 py-1 gap-1">
        {/* Collapse/Expand Button */}
        <button
          className="bg-gray-100 text-gray-700 px-2 ml-4 py-0.5 rounded-full text-xs hover:bg-gray-200 transition flex items-center"
          onClick={toggle}
          aria-label={isCollapsed ? "Expand side panel" : "Collapse side panel"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <div className="flex gap-1">
          <button className="bg-blue-600 text-white px-3 py-0.5 rounded-md text-xs hover:bg-blue-700 transition">Action 1</button>
          <button className="bg-gray-200 text-gray-700 px-3 py-0.5 rounded-md text-xs hover:bg-gray-300 transition">Action 2</button>
          <button className="bg-green-600 text-white px-3 py-0.5 rounded-md text-xs hover:bg-green-700 transition">Action 3</button>
          <button
            className="bg-purple-600 text-white px-3 py-0.5 rounded-md text-xs hover:bg-purple-700 transition ml-2"
            onClick={() => setBottomTerminalOpen(open => !open)}
          >
            {bottomTerminalOpen ? 'Close Terminal' : 'Open Terminal'}
          </button>
        </div>
      </footer>
      {bottomTerminalOpen && (
        <div className="fixed left-0 bottom-12 w-full bg-gray-900 text-white z-50 shadow-lg flex items-center justify-center" style={{ minHeight: 180 }}>
          {/* Empty terminal placeholder */}
          <div className="w-full text-center py-8 text-gray-300">Bottom Terminal (empty)</div>
        </div>
      )}
    </>
  );
} 