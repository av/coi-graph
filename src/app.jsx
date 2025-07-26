import React, { useEffect, useState } from "npm:react";
import { createRoot } from "npm:react-dom/client";

import "./styles.css";
import recipesData from "../data/recipes.json" with { type: "json" };
import { ForceGraph } from "./components/ForceGraph.jsx";
import { DetailPanel } from "./components/DetailPanel.jsx";
import { Legend } from "./components/Legend.jsx";
import { processRecipesData, processRecipesDataWithClustering } from "./utils/dataProcessor.js";

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
  };

  const handleNodeLinkClick = (nodeName) => {
    const node = data?.nodes.find((n) =>
      n.id === nodeName || n.name === nodeName
    );
    if (node) {
      setSelectedNode(node);
    }
  };

  useEffect(() => {
    try {
      const processedData = processRecipesDataWithClustering(recipesData);
      setData(processedData);
      setLoading(false);
    } catch (err) {
      console.error("Error processing recipes data:", err);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Processing recipes data...</h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="error-container">
        <h2>Error processing data</h2>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="visualization-container">
        <ForceGraph
          data={data}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
        />
      </div>

      <div className="title-overlay">
        <h1>COI Recipe Graph</h1>
      </div>

      <Legend selectedNode={selectedNode} />

      <div className="stats-overlay">
        Nodes: {data?.nodes.length} | Links: {data?.links.length}
      </div>

      <DetailPanel
        node={selectedNode}
        data={data}
        onClose={handleClosePanel}
        onNodeLinkClick={handleNodeLinkClick}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
