export const theme = {
  colors: {
    primary: "var(--color-primary)",
    secondary: "var(--color-secondary)",
    success: "var(--color-success)",
    danger: "var(--color-danger)",
    dark: "var(--color-dark)",
    light: "var(--color-light)",
    gray: "var(--color-gray)",
    lightGray: "var(--color-light-gray)",
    gold: "var(--color-gold)",
    border: "var(--color-border)",
    tooltip: {
      background: "var(--color-tooltip-background)",
      text: "var(--color-tooltip-text)",
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
      fill: "var(--node-material-fill)",
      radius: 8,
    },
    recipe: {
      fill: "var(--node-recipe-fill)",
      radius: 12,
    },
    cluster: {
      fill: "rgba(0, 0, 0, 1.0)",
      radius: 50,
      opacity: 0.1,
    },
    stroke: "var(--node-stroke)",
    strokeWidth: 2,
  },
  links: {
    input: "var(--link-input-color)",
    output: "var(--link-output-color)",
    opacity: 0.6,
    width: {
      normal: 1,
      highlighted: 1,
      default: 1,
    },
  },
  text: {
    family: "Arial, sans-serif",
    fill: "var(--text-fill)",
    size: {
      recipe: "12px",
      material: "10px",
    },
  },
  collision: {
    recipe: 18,
    material: 12,
  },
};
