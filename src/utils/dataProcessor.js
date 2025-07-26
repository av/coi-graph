export function processRecipesData(recipes) {
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

  // Add building links between recipes in the same building
  const recipesByBuilding = new Map();
  recipes.forEach((recipe) => {
    if (!recipe.RecipeId || !recipe.Building) return;

    const building = recipe.Building;
    if (!recipesByBuilding.has(building)) {
      recipesByBuilding.set(building, []);
    }
    recipesByBuilding.get(building).push(`recipe_${recipe.RecipeId}`);
  });

  // Create links between recipes in the same building
  recipesByBuilding.forEach((recipeIds) => {
    for (let i = 0; i < recipeIds.length; i++) {
      for (let j = i + 1; j < recipeIds.length; j++) {
        links.push({
          source: recipeIds[i],
          target: recipeIds[j],
          type: "invisible",
        });
      }
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    links: links,
  };
}

export function calculateConnections(data) {
  const _getSourceId = (link) =>
    typeof link.source === "object" ? link.source.id : link.source;
  const _getTargetId = (link) =>
    typeof link.target === "object" ? link.target.id : link.target;

  const connectionsMap = new Map();
  data.nodes.forEach((node) => {
    const connections = data.links.filter((link) =>
      (link.source === node.id || link.target === node.id) && link.type !== "invisible"
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

  return {
    connectionsMap,
    inputCountMap,
    outputCountMap,
    maxConnections: Math.max(...connectionsMap.values()),
    maxInputCount: Math.max(...inputCountMap.values()),
    maxOutputCount: Math.max(...outputCountMap.values()),
  };
}

export function calculateDepth(data) {
  const _getSourceId = (link) =>
    typeof link.source === "object" ? link.source.id : link.source;
  const _getTargetId = (link) =>
    typeof link.target === "object" ? link.target.id : link.target;

  const depthMap = new Map();
  const visited = new Set();

  const walkGraph = (nodeId, depth, parentId) => {
    const visitKey = `${parentId}->${nodeId}`;
    if (visited.has(visitKey)) {
      return;
    }
    visited.add(visitKey);

    if (!depthMap.has(nodeId)) {
      depthMap.set(nodeId, depth);
    }

    depthMap.set(nodeId, Math.min(depthMap.get(nodeId), depth));

    const connectedLinks = data.links.filter(
      (link) => _getSourceId(link) === nodeId && link.type !== "invisible",
    );

    connectedLinks.forEach((link) => {
      const connectedNodeId = _getTargetId(link);
      walkGraph(connectedNodeId, depth + 1, nodeId);
    });
  };

  const roots = data.nodes.filter((d) =>
    d.type === "material" &&
    data.links.filter((l) => _getTargetId(l) == d.id && l.type !== "invisible").length === 0
  );

  roots.forEach((node) => {
    if (!depthMap.has(node.id)) {
      walkGraph(node.id, 0, null);
    }
  });

  return {
    depthMap,
    maxDepth: Math.max(...Array.from(depthMap.values())),
  };
}
