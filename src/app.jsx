import React, { useEffect, useRef, useState } from "npm:react";
import { createRoot } from "npm:react-dom/client";
import * as d3 from "npm:d3";
import recipesData from "../data/recipes.json" with { type: "json" };

function processRecipesData(recipes) {
  const nodes = new Map();
  const links = [];

  recipes.forEach((recipe) => {
    if (!recipe.RecipeId) return;

    const inputs = [];
    const outputs = [];

    for (let i = 1; i <= 6; i++) {
      const inputName = recipe[`Input${i}Name`];
      const inputQty = parseInt(recipe[`Input${i}Qty`]) || 0;
      const outputName = recipe[`Output${i}Name`];
      const outputQty = parseInt(recipe[`Output${i}Qty`]) || 0;

      if (inputName && inputQty > 0) {
        inputs.push({
          name: inputName,
          qty: inputQty,
          icon: recipe[`Input${i}Icon`],
        });
      }
      if (outputName && outputQty > 0) {
        outputs.push({
          name: outputName,
          qty: outputQty,
          icon: recipe[`Output${i}Icon`],
        });
      }
    }

    inputs.forEach((input) => {
      if (!nodes.has(input.name)) {
        nodes.set(input.name, {
          id: input.name,
          name: input.name,
          icon: input.icon,
          type: "material",
        });
      }
    });

    outputs.forEach((output) => {
      if (!nodes.has(output.name)) {
        nodes.set(output.name, {
          id: output.name,
          name: output.name,
          icon: output.icon,
          type: "material",
        });
      }
    });

    const recipeNodeId = `recipe_${recipe.RecipeId}`;
    nodes.set(recipeNodeId, {
      id: recipeNodeId,
      name: recipe.RecipeId,
      building: recipe.Building,
      type: "recipe",
      time: recipe.Time,
    });

    inputs.forEach((input) => {
      links.push({
        source: input.name,
        target: recipeNodeId,
        type: "input",
        qty: input.qty,
      });
    });

    outputs.forEach((output) => {
      links.push({
        source: recipeNodeId,
        target: output.name,
        type: "output",
        qty: output.qty,
      });
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    links: links,
  };
}

function ForceGraph({ data }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1400;
    const height = 900;

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Add arrow markers
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666");

    // Pre-compute connections for performance
    const connectionsMap = new Map();
    data.nodes.forEach((node) => {
      const connections = data.links.filter((link) =>
        link.source === node.id || link.target === node.id
      ).length;
      connectionsMap.set(node.id, connections);
    });
    const inputCountMap = new Map();
    data.nodes.forEach((node) => {
      const inputCount = data.links.filter(
        (link) => link.target === node.id && link.type === "input",
      ).length;
      inputCountMap.set(node.id, inputCount);
    });
    const outputCountMap = new Map();
    data.nodes.forEach((node) => {
      const outputCount = data.links.filter(
        (link) => link.source === node.id && link.type === "output",
      ).length;
      outputCountMap.set(node.id, outputCount);
    });

    const maxConnections = Math.max(...connectionsMap.values());
    const maxInputCount = Math.max(...inputCountMap.values());
    const maxOutputCount = Math.max(...outputCountMap.values());

    const simulation = d3.forceSimulation(data.nodes)
      .force(
        "link",
        d3.forceLink(data.links).id((d) => d.id).distance((d) => {
          const sourceConnections = connectionsMap.get(d.source.id) || 0;
          return 5 * sourceConnections;
        }).strength(0.5),
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d) => {
          const connections = connectionsMap.get(d.id) || 0;
          const baseStrength = d.type === "recipe" ? -800 : -400;
          return baseStrength * (1 + connections * 0.1);
        }),
      )
      .force(
        "collision",
        d3.forceCollide().radius((d) => {
          return d.type === "recipe" ? 25 : 20;
        }),
      )
      .force(
        "x",
        d3.forceX(width / 2).strength(0.1),
      )
      .force("y", d3.forceY(height / 2).strength(0.1));

    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", (d) => d.type === "input" ? "#e74c3c" : "#2ecc71")
      // .attr("stroke-width", (d) => Math.max(1, Math.sqrt(d.qty)))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
      .attr("marker-end", "url(#arrowhead)");

    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(
        d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      );

    node.append("circle")
      .attr("r", (d) => d.type === "recipe" ? 12 : 8)
      .attr("fill", (d) => d.type === "recipe" ? "#f39c12" : "#3498db")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node.append("text")
      .text((d) => d.name)
      .attr("font-size", (d) => d.type === "recipe" ? 10 : 9)
      .attr("font-family", "Arial, sans-serif")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.type === "recipe" ? 18 : 15)
      .attr("fill", "#333")
      .attr("font-weight", (d) => d.type === "recipe" ? "bold" : "normal")
      .style("pointer-events", "none");

    node.append("title")
      .text((d) =>
        d.type === "recipe"
          ? `Recipe: ${d.name}\nBuilding: ${d.building}\nTime: ${d.time}s`
          : `Material: ${d.name}`
      );

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return <svg ref={svgRef}></svg>;
}

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const processedData = processRecipesData(recipesData);
      setData(processedData);
      setLoading(false);
    } catch (err) {
      console.error("Error processing recipes data:", err);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Processing recipes data...</h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <h2>Error processing data</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>COI Recipe Graph</h1>
      <div style={{ marginBottom: "20px" }}>
        <p>
          <strong>Legend:</strong>
        </p>
        <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
          <div>
            <span style={{ color: "#3498db" }}>●</span> Materials
          </div>
          <div>
            <span style={{ color: "#f39c12" }}>●</span> Recipes
          </div>
          <div>
            <span style={{ color: "#e74c3c" }}>→</span> Inputs
          </div>
          <div>
            <span style={{ color: "#2ecc71" }}>→</span> Outputs
          </div>
        </div>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
          Drag nodes to move them. Scroll to zoom. Hover over nodes for details.
        </p>
      </div>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <ForceGraph data={data} />
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <p>Nodes: {data?.nodes.length} | Links: {data?.links.length}</p>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
