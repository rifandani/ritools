import { colorMatrixOf } from "@/features/easel/easel.color";
import type { ColorMatrix } from "@/features/easel/easel.color";
import type { Matrix } from "@/features/easel/easel.geometry";
import type { RenderPlan } from "@/features/easel/easel.plan";
import type { Size } from "@/features/easel/easel.presets";
import type { EditState } from "@/features/easel/easel.stack";

/**
 * The pixel renderer (ADR-0041): one WebGL2 pass that draws the geometry,
 * Finetune, Filter, and the Bucket Fill color of one render plan.
 *
 * It owns one canvas that is not in the page. A caller draws, then copies the
 * canvas to a 2D canvas. One File Tab's source is on the GPU at a time.
 */

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vCanvas;
uniform vec2 uCanvasSize;
void main() {
  // Canvas pixels, y down.
  vCanvas = vec2((aPosition.x + 1.0) * 0.5, (1.0 - aPosition.y) * 0.5) * uCanvasSize;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vCanvas;
out vec4 outColor;
uniform sampler2D uSource;
uniform sampler2D uFill;
uniform bool uHasFill;
uniform mat3 uCanvasToFrame;
uniform mat3 uFrameToSource;
uniform vec2 uSourceSize;
uniform vec4 uCrop;
uniform mat3 uColor;
uniform vec3 uColorOffset;
uniform float uBlur;
uniform float uVignette;
uniform float uPixel;

vec4 photo(vec2 uv) {
  if (uBlur < 0.5) {
    return texture(uSource, uv);
  }
  // A two-ring blur on a lower mip level. The mip level does most of the work.
  float lod = max(0.0, log2(uBlur) - 1.0);
  vec2 step = uBlur / uSourceSize;
  vec4 sum = textureLod(uSource, uv, lod) * 2.0;
  for (int index = 0; index < 8; index += 1) {
    float angle = float(index) * 0.7853981634;
    vec2 direction = vec2(cos(angle), sin(angle));
    sum += textureLod(uSource, uv + direction * step, lod);
    sum += textureLod(uSource, uv + direction * step * 0.5, lod);
  }
  return sum / 18.0;
}

void main() {
  vec2 frame = (uCanvasToFrame * vec3(vCanvas, 1.0)).xy;
  if (frame.x < uCrop.x || frame.y < uCrop.y || frame.x > uCrop.z || frame.y > uCrop.w) {
    outColor = vec4(0.0);
    return;
  }
  vec2 source = (uFrameToSource * vec3(frame, 1.0)).xy;
  vec2 edge = min(source, uSourceSize - source);
  float cover = clamp(min(edge.x, edge.y) / uPixel + 0.5, 0.0, 1.0);
  if (cover <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  vec2 uv = source / uSourceSize;
  vec4 texel = photo(uv);
  float alpha = texel.a;
  vec3 color = alpha > 0.0 ? texel.rgb / alpha : vec3(0.0);
  color = uColor * color + uColorOffset;
  if (uVignette != 0.0) {
    vec2 cropUv = (frame - uCrop.xy) / (uCrop.zw - uCrop.xy);
    float amount = smoothstep(0.35, 1.0, length((cropUv - 0.5) * 2.0) / 1.41421356);
    color = uVignette > 0.0
      ? color * (1.0 - uVignette * amount)
      : mix(color, vec3(1.0), -uVignette * amount * 0.7);
  }
  color = clamp(color, 0.0, 1.0);
  if (uHasFill) {
    // The fill is painted after Finetune and Filter, so its color is exact.
    vec4 fill = texture(uFill, uv);
    color = mix(color, fill.rgb, fill.a);
    alpha = alpha + fill.a * (1.0 - alpha);
  }
  outColor = vec4(color * alpha, alpha) * cover;
}`;

const UNIFORMS = [
  "uSource",
  "uFill",
  "uHasFill",
  "uCanvasToFrame",
  "uFrameToSource",
  "uSourceSize",
  "uCrop",
  "uColor",
  "uColorOffset",
  "uBlur",
  "uVignette",
  "uPixel",
  "uCanvasSize",
] as const;
type UniformName = (typeof UNIFORMS)[number];

/** A 2×3 matrix as the nine numbers of a column-major mat3. */
const mat3Of = (matrix: Matrix): Float32Array =>
  new Float32Array([
    matrix[0],
    matrix[1],
    0,
    matrix[2],
    matrix[3],
    0,
    matrix[4],
    matrix[5],
    1,
  ]);

/** The color factors of a matrix as a column-major mat3. */
const colorMat3Of = (matrix: ColorMatrix): Float32Array =>
  new Float32Array([
    matrix[0],
    matrix[4],
    matrix[8],
    matrix[1],
    matrix[5],
    matrix[9],
    matrix[2],
    matrix[6],
    matrix[10],
  ]);

export interface PhotoDraw {
  /** From a canvas pixel to a frame point (origin at the frame center). */
  readonly canvasToFrame: Matrix;
  readonly plan: RenderPlan;
  readonly size: Size;
  readonly state: EditState;
  /** Draws the whole frame and ignores the crop. The crop panel uses it. */
  readonly wholeFrame?: boolean;
}

export interface PhotoRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly dispose: () => void;
  readonly draw: (options: PhotoDraw) => void;
  /** The longest side the GPU can hold, for a source and for an export. */
  readonly maxSize: number;
  /** Sets the fill overlay: a source-sized RGBA buffer, or `null`. */
  readonly setFill: (rgba: Uint8Array | null, size: Size) => void;
  readonly setSource: (bitmap: ImageBitmap) => void;
}

const compile = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader => {
  const shader = gl.createShader(type);
  if (shader === null) {
    throw new Error("WebGL2 cannot make a shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
  }
  return shader;
};

/** The canvas-to-frame matrix that puts the crop over the whole canvas. */
export const exportMatrixOf = (plan: RenderPlan, size: Size): Matrix => [
  plan.crop.width / size.width,
  0,
  0,
  plan.crop.height / size.height,
  plan.crop.x - plan.frame.width / 2,
  plan.crop.y - plan.frame.height / 2,
];

/** Without this the browser never restores a lost context. */
const onLost = (event: Event) => {
  event.preventDefault();
};

/** Makes the renderer, or throws when the browser has no WebGL2. */
export const createPhotoRenderer = (): PhotoRenderer => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
  });
  if (context === null) {
    throw new Error("WebGL2 is not available");
  }
  const gl = context;
  let program: WebGLProgram | null = null;
  let uniforms = new Map<UniformName, WebGLUniformLocation | null>();
  let sourceTexture: WebGLTexture | null = null;
  let fillTexture: WebGLTexture | null = null;
  let source: ImageBitmap | null = null;
  let fill: { readonly rgba: Uint8Array; readonly size: Size } | null = null;

  const uploadSource = () => {
    if (source === null) {
      return;
    }
    gl.deleteTexture(sourceTexture);
    sourceTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  const uploadFill = () => {
    gl.deleteTexture(fillTexture);
    fillTexture = null;
    if (fill === null) {
      return;
    }
    fillTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fillTexture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      fill.size.width,
      fill.size.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      fill.rgba
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  const setUp = () => {
    const next = gl.createProgram();
    gl.attachShader(next, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(next, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(next);
    if (gl.getProgramParameter(next, gl.LINK_STATUS) !== true) {
      throw new Error(gl.getProgramInfoLog(next) ?? "program link failed");
    }
    program = next;
    uniforms = new Map(
      UNIFORMS.map((name) => [name, gl.getUniformLocation(next, name)])
    );
    // One triangle that covers the canvas.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(next, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    uploadSource();
    uploadFill();
  };
  setUp();

  const onRestored = () => {
    sourceTexture = null;
    fillTexture = null;
    setUp();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  const at = (name: UniformName): WebGLUniformLocation | null =>
    uniforms.get(name) ?? null;

  return {
    canvas,
    dispose: () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.deleteTexture(sourceTexture);
      gl.deleteTexture(fillTexture);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
    draw: ({ canvasToFrame, plan, size, state, wholeFrame = false }) => {
      if (source === null || program === null || gl.isContextLost()) {
        return;
      }
      if (canvas.width !== size.width || canvas.height !== size.height) {
        canvas.width = size.width;
        canvas.height = size.height;
      }
      gl.viewport(0, 0, size.width, size.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.uniform1i(at("uSource"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fillTexture);
      gl.uniform1i(at("uFill"), 1);
      gl.uniform1i(at("uHasFill"), fillTexture === null ? 0 : 1);
      gl.uniform2f(at("uCanvasSize"), size.width, size.height);
      gl.uniformMatrix3fv(at("uCanvasToFrame"), false, mat3Of(canvasToFrame));
      gl.uniformMatrix3fv(
        at("uFrameToSource"),
        false,
        mat3Of(plan.frameToSource)
      );
      gl.uniform2f(at("uSourceSize"), source.width, source.height);
      const halfWidth = plan.frame.width / 2;
      const halfHeight = plan.frame.height / 2;
      const crop = wholeFrame
        ? { height: plan.frame.height, width: plan.frame.width, x: 0, y: 0 }
        : plan.crop;
      gl.uniform4f(
        at("uCrop"),
        crop.x - halfWidth,
        crop.y - halfHeight,
        crop.x + crop.width - halfWidth,
        crop.y + crop.height - halfHeight
      );
      const color = colorMatrixOf(state);
      gl.uniformMatrix3fv(at("uColor"), false, colorMat3Of(color));
      gl.uniform3f(at("uColorOffset"), color[3], color[7], color[11]);
      gl.uniform1f(at("uBlur"), plan.blurRadius);
      gl.uniform1f(at("uVignette"), state.finetune.vignette / 100);
      // Source pixels for one canvas pixel, for the soft source edge.
      gl.uniform1f(
        at("uPixel"),
        Math.max(1e-3, Math.hypot(canvasToFrame[0], canvasToFrame[1]))
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // SAFETY: MAX_TEXTURE_SIZE is a number in every WebGL2 context.
    maxSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    setFill: (rgba, size) => {
      fill = rgba === null ? null : { rgba, size };
      uploadFill();
    },
    setSource: (bitmap) => {
      source = bitmap;
      uploadSource();
    },
  };
};
