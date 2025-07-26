import React, { useEffect, useRef, useState } from "npm:react";
import { createRoot } from "npm:react-dom/client";
import * as d3 from "npm:d3";

import './styles.css';
import recipesData from "../data/recipes.json" with { type: "json" };

const theme = {
  colors: {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    dark: 'var(--color-dark)',
    light: 'var(--color-light)',
    gray: 'var(--color-gray)',
    lightGray: 'var(--color-light-gray)',
    gold: 'var(--color-gold)',
    border: 'var(--color-border)',
    tooltip: {
      background: 'var(--color-tooltip-background)',
      text: 'var(--color-tooltip-text)',
    },
    highlight: {
      opacity: {
        full: 1,
        dimmed: 0.3,
        faded: 0.1,
      },
    },
  },
  nodes: {
    material: {
      fill: 'var(--node-material-fill)',
      radius: 8,
    },
    recipe: {
      fill: 'var(--node-recipe-fill)',
      radius: 12,
    },
    stroke: 'var(--node-stroke)',
    strokeWidth: 2,
  },
  links: {
    input: 'var(--link-input-color)',
    output: 'var(--link-output-color)',
    opacity: 0.6,
    width: {
      normal: 1,
      highlighted: 1,
      default: 1,
    },
  },
  text: {
    family: 'Arial, sans-serif',
    fill: 'var(--text-fill)',
    size: {
      recipe: '12px',
      material: '10px',
    },
  },
  collision: {
    recipe: 18,
    material: 12,
  },
};

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

function ForceGraph({ data, selectedNode, onNodeSelect }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = globalThis.innerWidth;
    const height = globalThis.innerHeight;

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const zoomToNode = (nodeData) => {
      const scale = 2;
      const effectiveWidth = selectedNode ? width - 350 : width;
      const x = -nodeData.x * scale + effectiveWidth / 2;
      const y = -nodeData.y * scale + height / 2;

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    };

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", theme.colors.tooltip.background)
      .style("color", theme.colors.tooltip.text)
      .style("padding", "12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("font-family", theme.text.family)
      .style("max-width", "300px")
      .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.3)")
      .style("z-index", "1000")
      .style("pointer-events", "none");

    // Add arrow markers
    const defs = svg.append("defs");

    // Recipe node marker (larger radius)
    defs.append("marker")
      .attr("id", "arrowhead-recipe")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 30) // 12 (recipe radius) + 10 (marker length)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "context-stroke");

    // Material node marker (smaller radius)
    defs.append("marker")
      .attr("id", "arrowhead-material")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 24) // 8 (material radius) + 10 (marker length)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "context-stroke");

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

    const _maxConnections = Math.max(...connectionsMap.values());
    const _maxInputCount = Math.max(...inputCountMap.values());
    const _maxOutputCount = Math.max(...outputCountMap.values());

    const getSourceId = (link) =>
      typeof link.source === "object" ? link.source.id : link.source;
    const getTargetId = (link) =>
      typeof link.target === "object" ? link.target.id : link.target;

    const simulation = d3.forceSimulation(data.nodes)
      .force(
        "link",
        d3.forceLink(data.links).id((d) => d.id).distance((d) => {
          const connections = connectionsMap.get(d.source.id) +
            connectionsMap.get(d.target.id);
          return connections * 2;
        }).strength(0.5),
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d) => {
          const connections = connectionsMap.get(d.id) || 0;
          return connections * -200;
        }),
      )
      .force(
        "collision",
        d3.forceCollide().radius((d) => {
          return d.type === "recipe"
            ? theme.collision.recipe
            : theme.collision.material;
        }),
      )
      .alphaDecay(0.01);

    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr(
        "stroke",
        (d) => d.type === "input" ? theme.links.input : theme.links.output,
      )
      .attr(
        "fill",
        (d) => d.type === "input" ? theme.links.input : theme.links.output,
      )
      .attr("stroke-width", theme.links.width.default)
      .attr("stroke-opacity", theme.links.opacity)
      .attr("marker-end", (d) => {
        const targetId = getTargetId(d);
        const targetNode = data.nodes.find((node) => node.id === targetId);
        return targetNode && targetNode.type === "recipe"
          ? "url(#arrowhead-recipe)"
          : "url(#arrowhead-material)";
      })
      .attr("marker-end-fill", "#600");

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
      .attr(
        "r",
        (d) =>
          d.type === "recipe"
            ? theme.nodes.recipe.radius
            : theme.nodes.material.radius,
      )
      .attr(
        "fill",
        (d) =>
          d.type === "recipe"
            ? theme.nodes.recipe.fill
            : theme.nodes.material.fill,
      )
      .attr("stroke", theme.nodes.stroke)
      .attr("stroke-width", theme.nodes.strokeWidth)
      .on("click", function (event, d) {
        event.stopPropagation();
        onNodeSelect(d);
        zoomToNode(d);
      })
      .on("mouseover", function (event, d) {
        const nodeData = d;

        let tooltipContent = "";
        if (nodeData.type === "recipe") {
          const inputs = data.links
            .filter((link) => {
              const targetId = getTargetId(link);
              return targetId === nodeData.id && link.type === "input";
            })
            .map((link) => {
              const sourceId = getSourceId(link);
              return `<div style="margin: 2px 0;">${sourceId} <span style="color: ${theme.colors.gold};">(${link.qty})</span></div>`;
            })
            .join("");
          const outputs = data.links
            .filter((link) => {
              const sourceId = getSourceId(link);
              return sourceId === nodeData.id && link.type === "output";
            })
            .map((link) => {
              const targetId = getTargetId(link);
              return `<div style="margin: 2px 0;">${targetId} <span style="color: ${theme.colors.gold};">(${link.qty})</span></div>`;
            })
            .join("");

          tooltipContent = `
            <div style="font-weight: bold; color: ${theme.nodes.recipe.fill}; margin-bottom: 8px;">📋 Recipe: ${nodeData.name}</div>
            <div style="margin-bottom: 4px;"><strong>Building:</strong> ${nodeData.building}</div>
            <div style="margin-bottom: 8px;"><strong>Time:</strong> ${nodeData.time}s</div>
            ${
            inputs
              ? `<div style="margin-bottom: 4px;"><strong style="color: ${theme.links.input};">Inputs:</strong></div>${inputs}`
              : ""
          }
            ${
            outputs
              ? `<div style="margin-top: 8px; margin-bottom: 4px;"><strong style="color: ${theme.links.output};">Outputs:</strong></div>${outputs}`
              : ""
          }
          `;
        } else {
          const usedInRecipes = data.links
            .filter((link) => {
              const sourceId = getSourceId(link);
              return sourceId === nodeData.id && link.type === "input";
            })
            .map((link) => {
              const targetId = getTargetId(link);
              return `<div style="margin: 2px 0;">${
                targetId.replace("recipe_", "")
              }</div>`;
            })
            .join("");
          const producedByRecipes = data.links
            .filter((link) => {
              const targetId = getTargetId(link);
              return targetId === nodeData.id && link.type === "output";
            })
            .map((link) => {
              const sourceId = getSourceId(link);
              return `<div style="margin: 2px 0;">${
                sourceId.replace("recipe_", "")
              }</div>`;
            })
            .join("");

          tooltipContent = `
            <div style="font-weight: bold; color: ${theme.nodes.material.fill}; margin-bottom: 8px;">📦 Material: ${nodeData.name}</div>
            ${
            usedInRecipes
              ? `<div style="margin-bottom: 4px;"><strong style="color: ${theme.links.input};">Used in recipes:</strong></div>${usedInRecipes}`
              : `<div style="color: ${theme.colors.lightGray};">Not used in any recipes</div>`
          }
            ${
            producedByRecipes
              ? `<div style="margin-top: 8px; margin-bottom: 4px;"><strong style="color: ${theme.links.output};">Produced by recipes:</strong></div>${producedByRecipes}`
              : `<div style="color: ${theme.colors.lightGray}; margin-top: 4px;">Not produced by any recipes</div>`
          }
          `;
        }

        tooltip
          .style("visibility", "visible")
          .html(tooltipContent)
          .style("left", (event.pageX + 20) + "px")
          .style("top", (event.pageY - 20) + "px");

        // Highlight connected links
        link
          .attr("stroke-opacity", (linkData) => {
            const sourceId = getSourceId(linkData);
            const targetId = getTargetId(linkData);
            return (sourceId === d.id || targetId === d.id)
              ? theme.colors.highlight.opacity.full
              : theme.colors.highlight.opacity.faded;
          })
          .attr("stroke-width", (linkData) => {
            const sourceId = getSourceId(linkData);
            const targetId = getTargetId(linkData);
            return (sourceId === d.id || targetId === d.id)
              ? theme.links.width.highlighted
              : theme.links.width.normal;
          });

        // Highlight connected nodes
        node.select("circle")
          .attr("opacity", (nodeData) => {
            if (nodeData.id === d.id) {
              return theme.colors.highlight.opacity.full;
            }
            const isConnected = data.links.some((linkData) => {
              const sourceId = getSourceId(linkData);
              const targetId = getTargetId(linkData);
              return (sourceId === d.id && targetId === nodeData.id) ||
                (targetId === d.id && sourceId === nodeData.id);
            });
            return isConnected
              ? theme.colors.highlight.opacity.full
              : theme.colors.highlight.opacity.dimmed;
          });

        node.select("text")
          .attr("opacity", (nodeData) => {
            if (nodeData.id === d.id) {
              return theme.colors.highlight.opacity.full;
            }
            const isConnected = data.links.some((linkData) => {
              const sourceId = getSourceId(linkData);
              const targetId = getTargetId(linkData);
              return (sourceId === d.id && targetId === nodeData.id) ||
                (targetId === d.id && sourceId === nodeData.id);
            });
            return isConnected
              ? theme.colors.highlight.opacity.full
              : theme.colors.highlight.opacity.dimmed;
          });
      })
      .on("mouseout", function (_event, _d) {
        tooltip.style("visibility", "hidden");

        // Reset all links
        link
          .attr("stroke-opacity", theme.links.opacity)
          .attr("stroke-width", theme.links.width.normal);

        // Reset all nodes
        node.select("circle")
          .attr("opacity", theme.colors.highlight.opacity.full);

        node.select("text")
          .attr("opacity", theme.colors.highlight.opacity.full);
      });

    node.append("text")
      .text((d) => d.name)
      .attr(
        "font-size",
        (d) =>
          d.type === "recipe"
            ? theme.text.size.recipe
            : theme.text.size.material,
      )
      .attr("font-family", theme.text.family)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.type === "recipe" ? 18 : 15)
      .attr("fill", theme.text.fill)
      .attr("font-weight", (d) => d.type === "recipe" ? "bold" : "normal")
      .style("pointer-events", "none");

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
      tooltip.remove();
    };
  }, [data]);

  useEffect(() => {
    if (selectedNode && data) {
      const nodeData = data.nodes.find((n) => n.id === selectedNode.id);
      if (nodeData && nodeData.x !== undefined && nodeData.y !== undefined) {
        const svg = d3.select(svgRef.current);
        const width = globalThis.innerWidth;
        const height = globalThis.innerHeight;
        const scale = 2;
        const effectiveWidth = width - 350;
        const x = -nodeData.x * scale + effectiveWidth / 2;
        const y = -nodeData.y * scale + height / 2;

        const zoom = d3.zoom()
          .scaleExtent([0.1, 4])
          .on("zoom", (event) => {
            svg.select("g").attr("transform", event.transform);
          });

        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
      }
    }
  }, [selectedNode, data]);

  return <svg ref={svgRef}></svg>;
}

function DetailPanel({ node, data, onClose, onNodeLinkClick }) {
  if (!node) return null;

  const getSourceId = (link) =>
    typeof link.source === "object" ? link.source.id : link.source;
  const getTargetId = (link) =>
    typeof link.target === "object" ? link.target.id : link.target;

  const renderNodeLink = (nodeName, isRecipe = false) => {
    const displayName = isRecipe ? nodeName.replace("recipe_", "") : nodeName;
    return (
      <span
        className="node-link"
        onClick={() => onNodeLinkClick(nodeName)}
      >
        {displayName}
      </span>
    );
  };

  let content;
  if (node.type === "recipe") {
    const inputs = data.links
      .filter((link) => {
        const targetId = getTargetId(link);
        return targetId === node.id && link.type === "input";
      })
      .map((link) => {
        const sourceId = getSourceId(link);
        return (
          <div key={sourceId} className="recipe-item">
            {renderNodeLink(sourceId)}{" "}
            <span className="recipe-qty">({link.qty})</span>
          </div>
        );
      });

    const outputs = data.links
      .filter((link) => {
        const sourceId = getSourceId(link);
        return sourceId === node.id && link.type === "output";
      })
      .map((link) => {
        const targetId = getTargetId(link);
        return (
          <div key={targetId} className="recipe-item">
            {renderNodeLink(targetId)}{" "}
            <span className="recipe-qty">({link.qty})</span>
          </div>
        );
      });

    content = (
      <div>
        <div className="recipe-title">
          📋 Recipe: {node.name}
        </div>
        <div className="recipe-building">
          <strong>Building:</strong> {node.building}
        </div>
        <div className="recipe-time">
          <strong>Time:</strong> {node.time}s
        </div>
        {inputs.length > 0 && (
          <div className="recipe-section">
            <div className="recipe-section-title inputs">
              Inputs:
            </div>
            {inputs}
          </div>
        )}
        {outputs.length > 0 && (
          <div>
            <div className="recipe-section-title outputs">
              Outputs:
            </div>
            {outputs}
          </div>
        )}
      </div>
    );
  } else {
    const usedInRecipes = data.links
      .filter((link) => {
        const sourceId = getSourceId(link);
        return sourceId === node.id && link.type === "input";
      })
      .map((link) => {
        const targetId = getTargetId(link);
        return (
          <div key={targetId} className="recipe-item">
            {renderNodeLink(targetId, true)}
          </div>
        );
      });

    const producedByRecipes = data.links
      .filter((link) => {
        const targetId = getTargetId(link);
        return targetId === node.id && link.type === "output";
      })
      .map((link) => {
        const sourceId = getSourceId(link);
        return (
          <div key={sourceId} className="recipe-item">
            {renderNodeLink(sourceId, true)}
          </div>
        );
      });

    content = (
      <div>
        <div className="material-title">
          📦 Material: {node.name}
        </div>
        {usedInRecipes.length > 0
          ? (
            <div className="recipe-section">
              <div className="recipe-section-title inputs">
                Used in recipes:
              </div>
              {usedInRecipes}
            </div>
          )
          : (
            <div className="material-empty">
              Not used in any recipes
            </div>
          )}
        {producedByRecipes.length > 0
          ? (
            <div>
              <div className="recipe-section-title outputs">
                Produced by recipes:
              </div>
              {producedByRecipes}
            </div>
          )
          : (
            <div className="material-empty last">
              Not produced by any recipes
            </div>
          )}
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <h3>Node Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="detail-panel-close"
        >
          ×
        </button>
      </div>
      {content}
    </div>
  );
}

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
      {/* Full-page visualization */}
      <div className="visualization-container">
        <ForceGraph
          data={data}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
        />
      </div>

      {/* Title overlay */}
      <div className="title-overlay">
        <h1>COI Recipe Graph</h1>
      </div>

      {/* Legend overlay */}
      <div className={`legend-overlay ${selectedNode ? 'with-panel' : ''}`}>
        <div className="legend-title">
          Legend:
        </div>
        <div className="legend-items">
          <div>
            <span style={{ color: theme.nodes.material.fill }}>●</span>{" "}
            Materials
          </div>
          <div>
            <span style={{ color: theme.nodes.recipe.fill }}>●</span> Recipes
          </div>
          <div>
            <span style={{ color: theme.links.input }}>→</span> Inputs
          </div>
          <div>
            <span style={{ color: theme.links.output }}>→</span> Outputs
          </div>
        </div>
        <div className="legend-help">
          Drag nodes to move them. Scroll to zoom. Hover over nodes for details.
          Click nodes to open detail panel.
        </div>
      </div>

      {/* Stats overlay */}
      <div className="stats-overlay">
        Nodes: {data?.nodes.length} | Links: {data?.links.length}
      </div>

      {/* Detail panel overlay */}
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
