/** The browser canvas helper shared by the fake engine and the preview. */
export const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("The browser did not provide a 2D canvas");
  }
  return { canvas, context };
};
