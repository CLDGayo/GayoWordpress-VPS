'use client'

import { useEffect, useRef } from 'react'

// ─── GLSL Shaders ─────────────────────────────────────────────────────────────

const BASE_VERT = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const BLUR_VERT = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  uniform vec2 texelSize;
  void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - texelSize;
    vR = vUv + texelSize;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const COPY_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  void main () { gl_FragColor = texture2D(uTexture, vUv); }
`

const CLEAR_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main () { gl_FragColor = value * texture2D(uTexture, vUv); }
`

const CURL_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).y;
    float R = texture2D(uVelocity, vR).y;
    float T = texture2D(uVelocity, vT).x;
    float B = texture2D(uVelocity, vB).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`

const VORTICITY_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
    float L = texture2D(uCurl, vL).x;
    float R = texture2D(uCurl, vR).x;
    float T = texture2D(uCurl, vT).x;
    float B = texture2D(uCurl, vB).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
  }
`

const DIVERGENCE_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uVelocity, vL).x;
    float R = texture2D(uVelocity, vR).x;
    float T = texture2D(uVelocity, vT).y;
    float B = texture2D(uVelocity, vB).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`

const PRESSURE_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    float divergence = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
  }
`

const GRAD_SUBTRACT_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main () {
    float L = texture2D(uPressure, vL).x;
    float R = texture2D(uPressure, vR).x;
    float T = texture2D(uPressure, vT).x;
    float B = texture2D(uPressure, vB).x;
    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

const ADVECT_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;
  #ifdef MANUAL_FILTERING
    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tSize) {
      vec2 st = uv / tSize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);
      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tSize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tSize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tSize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tSize);
      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }
  #endif
  void main () {
    #ifdef MANUAL_FILTERING
      vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
      vec4 result = dissipation * bilerp(uSource, coord, dyeTexelSize);
    #else
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      vec4 result = dissipation * texture2D(uSource, coord);
    #endif
    gl_FragColor = result / (1.0 + dissipation * dt);
  }
`

const SPLAT_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture2D(uTarget, vUv).xyz;
    gl_FragColor = vec4(base + splat, 1.0);
  }
`

const SUNRAYS_MASK_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
    vec4 c = texture2D(uTexture, vUv);
    float br = max(c.r, max(c.g, c.b));
    c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
    gl_FragColor = c;
  }
`

const SUNRAYS_FRAG = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float weight;
  #define ITERATIONS 16
  void main () {
    float Density = 0.3;
    float Decay = 0.95;
    float Exposure = 0.7;
    vec2 coord = vUv;
    vec2 dir = (vUv - 0.5) * (1.0 / float(ITERATIONS)) * Density;
    float illuminationDecay = 1.0;
    float color = texture2D(uTexture, vUv).a;
    for (int i = 0; i < ITERATIONS; i++) {
      coord -= dir;
      color += texture2D(uTexture, coord).a * illuminationDecay * weight;
      illuminationDecay *= Decay;
    }
    gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
  }
`

const BLUR_FRAG = `
  precision mediump float;
  precision mediump sampler2D;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  uniform sampler2D uTexture;
  void main () {
    gl_FragColor =
      texture2D(uTexture, vUv) * 0.29411764 +
      texture2D(uTexture, vL)  * 0.35294117 +
      texture2D(uTexture, vR)  * 0.35294117;
  }
`

function buildDisplayFrag(keywords: string[]): string {
  const defs = keywords.map(k => `#define ${k}`).join('\n')
  return `
    ${defs}
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uSunrays;
    uniform vec2 texelSize;
    uniform vec3 backColor;
    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;
        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);
        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        float diffuse = clamp(dot(n, vec3(0.0, 0.0, 1.0)) + 0.7, 0.7, 1.0);
        c *= diffuse;
      #endif
      #ifdef SUNRAYS
        c += texture2D(uSunrays, vUv).r;
      #endif
      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(mix(backColor, c, a), 1.0);
    }
  `
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number }

interface FBO {
  texture: WebGLTexture
  fbo: WebGLFramebuffer
  width: number
  height: number
  texelSizeX: number
  texelSizeY: number
  attach(id: number): number
}

interface DoubleFBO {
  read: FBO
  write: FBO
  swap(): void
}

interface GLProgram {
  uniforms: Record<string, WebGLUniformLocation | null>
  bind(): void
}

interface Pointer {
  id: number
  texcoordX: number
  texcoordY: number
  prevTexcoordX: number
  prevTexcoordY: number
  deltaX: number
  deltaY: number
  moved: boolean
  color: RGB
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FluidSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!

    // ── Config ────────────────────────────────────────────────────────────────
    const config = {
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      DENSITY_DISSIPATION: 1.0,
      VELOCITY_DISSIPATION: 1.0,
      PRESSURE: 0.25,
      PRESSURE_ITERATIONS: 20,
      CURL: 0,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 9000,
      SHADING: true,
      COLORFUL: true,
      COLOR_UPDATE_SPEED: 10,
      SUNRAYS: true,
      SUNRAYS_RESOLUTION: 196,
      SUNRAYS_WEIGHT: 1.5,
      BACK_COLOR: { r: 0.039, g: 0.027, b: 0.071 } as RGB,
    }

    // Mobile downgrade
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      config.DYE_RESOLUTION = 512
      config.SIM_RESOLUTION = 64
      config.SUNRAYS_RESOLUTION = 128
    }

    // Initial theme sync
    const isDarkInit = document.documentElement.classList.contains('dark')
    config.BACK_COLOR = isDarkInit ? { r: 0.039, g: 0.027, b: 0.071 } : { r: 0.969, g: 0.961, b: 1.0 }
    config.SUNRAYS = isDarkInit
    config.SHADING = isDarkInit

    // ── WebGL context ─────────────────────────────────────────────────────────
    let gl: WebGLRenderingContext
    let isWebGL2 = false

    const ctx2 = canvas.getContext('webgl2')
    if (ctx2) {
      gl = ctx2 as unknown as WebGLRenderingContext
      isWebGL2 = true
    } else {
      const ctx1 = canvas.getContext('experimental-webgl') as unknown as WebGLRenderingContext | null
      if (!ctx1) return
      gl = ctx1
    }

    // ── Extension & format detection ──────────────────────────────────────────
    let halfFloatType: number
    let supportLinearFiltering: boolean

    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float')
      supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear')
      halfFloatType = 0x8D61 // HALF_FLOAT (WebGL2 internal)
      // Use numeric literal to avoid TS typing issues with WebGL2 extension
      halfFloatType = (gl as unknown as WebGL2RenderingContext).HALF_FLOAT
    } else {
      const ext = gl.getExtension('OES_texture_half_float') as { HALF_FLOAT_OES: number } | null
      supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear')
      halfFloatType = ext ? ext.HALF_FLOAT_OES : gl.UNSIGNED_BYTE
    }

    if (!supportLinearFiltering) {
      config.DYE_RESOLUTION = 512
      config.SHADING = false
      config.SUNRAYS = false
    }

    gl.clearColor(0, 0, 0, 1)

    // Internal formats (WebGL2) or fallback to RGBA
    const gl2 = isWebGL2 ? (gl as unknown as WebGL2RenderingContext) : null
    const fmtRGBA = { internalFormat: gl2 ? gl2.RGBA16F : gl.RGBA, format: gl.RGBA }
    const fmtRG   = { internalFormat: gl2 ? gl2.RG16F   : gl.RGBA, format: gl2 ? gl2.RG   : gl.RGBA }
    const fmtR    = { internalFormat: gl2 ? gl2.R16F    : gl.RGBA, format: gl2 ? gl2.RED  : gl.RGBA }

    // ── Quad geometry ─────────────────────────────────────────────────────────
    const posBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const idxBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    // ── WebGL helpers ─────────────────────────────────────────────────────────
    function compileShader(type: number, src: string, keywords?: string[]): WebGLShader {
      const shader = gl.createShader(type)!
      const source = keywords ? keywords.map(k => `#define ${k}`).join('\n') + '\n' + src : src
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }

    function createProgram(vertSrc: string, fragSrc: string, keywords?: string[]): GLProgram {
      const program = gl.createProgram()!
      gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertSrc))
      gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragSrc, keywords))
      gl.linkProgram(program)
      const uniforms: Record<string, WebGLUniformLocation | null> = {}
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i)!
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
      }
      return { uniforms, bind() { gl.useProgram(program) } }
    }

    function blit(target: FBO | null) {
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
        gl.viewport(0, 0, target.width, target.height)
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    }

    function createFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): FBO {
      gl.activeTexture(gl.TEXTURE0)
      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
      const fbo = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return {
        texture, fbo, width: w, height: h,
        texelSizeX: 1 / w, texelSizeY: 1 / h,
        attach(id: number) {
          gl.activeTexture(gl.TEXTURE0 + id)
          gl.bindTexture(gl.TEXTURE_2D, texture)
          return id
        },
      }
    }

    function createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, filter: number): DoubleFBO {
      let r = createFBO(w, h, internalFormat, format, type, filter)
      let w2 = createFBO(w, h, internalFormat, format, type, filter)
      return {
        get read() { return r },
        set read(v) { r = v },
        get write() { return w2 },
        set write(v) { w2 = v },
        swap() { [r, w2] = [w2, r] },
      }
    }

    function resizeFBO(src: FBO, w: number, h: number, internalFormat: number, format: number, type: number, filter: number): FBO {
      const dst = createFBO(w, h, internalFormat, format, type, filter)
      copyProg.bind()
      gl.uniform1i(copyProg.uniforms.uTexture, src.attach(0))
      blit(dst)
      return dst
    }

    function resizeDoubleFBO(
      target: DoubleFBO, w: number, h: number,
      internalFormat: number, format: number, type: number, filter: number,
    ): DoubleFBO {
      if (target.read.width === w && target.read.height === h) return target
      target.read  = resizeFBO(target.read,  w, h, internalFormat, format, type, filter)
      target.write = resizeFBO(target.write, w, h, internalFormat, format, type, filter)
      return target
    }

    // ── Canvas / resolution helpers ───────────────────────────────────────────
    function resizeCanvas(): boolean {
      const dpr = Math.min(devicePixelRatio, 2)
      const w = Math.floor(canvas.clientWidth  * dpr)
      const h = Math.floor(canvas.clientHeight * dpr)
      if (canvas.width === w && canvas.height === h) return false
      canvas.width = w
      canvas.height = h
      return true
    }

    function getRes(res: number) {
      let ar = gl.drawingBufferWidth / gl.drawingBufferHeight
      if (ar < 1) ar = 1 / ar
      const min = Math.round(res)
      const max = Math.round(res * ar)
      return gl.drawingBufferWidth > gl.drawingBufferHeight
        ? { width: max, height: min }
        : { width: min, height: max }
    }

    // ── Programs ──────────────────────────────────────────────────────────────
    const manualKw = supportLinearFiltering ? undefined : ['MANUAL_FILTERING']

    const copyProg        = createProgram(BASE_VERT, COPY_FRAG)
    const clearProg       = createProgram(BASE_VERT, CLEAR_FRAG)
    const curlProg        = createProgram(BASE_VERT, CURL_FRAG)
    const vorticityProg   = createProgram(BASE_VERT, VORTICITY_FRAG)
    const divergenceProg  = createProgram(BASE_VERT, DIVERGENCE_FRAG)
    const pressureProg    = createProgram(BASE_VERT, PRESSURE_FRAG)
    const gradSubProg     = createProgram(BASE_VERT, GRAD_SUBTRACT_FRAG)
    const advectProg      = createProgram(BASE_VERT, ADVECT_FRAG, manualKw)
    const splatProg       = createProgram(BASE_VERT, SPLAT_FRAG)
    const sunraysMaskProg = createProgram(BASE_VERT, SUNRAYS_MASK_FRAG)
    const sunraysProg     = createProgram(BLUR_VERT, SUNRAYS_FRAG)
    const blurProg        = createProgram(BLUR_VERT, BLUR_FRAG)
    let   displayProg     = createProgram(BASE_VERT, buildDisplayFrag([]))

    function updateDisplayKeywords() {
      const kw: string[] = []
      if (config.SHADING)  kw.push('SHADING')
      if (config.SUNRAYS)  kw.push('SUNRAYS')
      displayProg = createProgram(BASE_VERT, buildDisplayFrag(kw))
    }
    updateDisplayKeywords()

    // ── FBO allocation ────────────────────────────────────────────────────────
    const linearFilter = supportLinearFiltering ? gl.LINEAR : gl.NEAREST

    let simRes = getRes(config.SIM_RESOLUTION)
    let dyeRes = getRes(config.DYE_RESOLUTION)
    let sunRes = getRes(config.SUNRAYS_RESOLUTION)

    let velocity = createDoubleFBO(simRes.width, simRes.height, fmtRG.internalFormat,   fmtRG.format,   halfFloatType, linearFilter)
    let dye      = createDoubleFBO(dyeRes.width, dyeRes.height, fmtRGBA.internalFormat, fmtRGBA.format, halfFloatType, linearFilter)
    let pressure = createDoubleFBO(simRes.width, simRes.height, fmtR.internalFormat,    fmtR.format,    halfFloatType, gl.NEAREST)

    const divergenceFBO  = createFBO(simRes.width, simRes.height, fmtR.internalFormat, fmtR.format, halfFloatType, gl.NEAREST)
    const curlFBO        = createFBO(simRes.width, simRes.height, fmtR.internalFormat, fmtR.format, halfFloatType, gl.NEAREST)
    let   sunraysFBO     = createFBO(sunRes.width, sunRes.height, fmtR.internalFormat, fmtR.format, halfFloatType, linearFilter)
    let   sunraysTmpFBO  = createFBO(sunRes.width, sunRes.height, fmtR.internalFormat, fmtR.format, halfFloatType, linearFilter)

    // ── Color ─────────────────────────────────────────────────────────────────
    function HSVtoRGB(h: number, s: number, v: number): [number, number, number] {
      const i = Math.floor(h * 6), f = h * 6 - i
      const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s)
      switch (i % 6) {
        case 0: return [v, t, p]; case 1: return [q, v, p]; case 2: return [p, v, t]
        case 3: return [p, q, v]; case 4: return [t, p, v]; default: return [v, p, q]
      }
    }

    function generateColor(): RGB {
      const rand = Math.random()
      const h = rand < 0.45 ? 0.75 : rand < 0.85 ? 0.50 : Math.random()
      const [r, g, b] = HSVtoRGB(h, 1, 1)
      return { r: r * 0.15, g: g * 0.15, b: b * 0.15 }
    }

    // ── Splat ─────────────────────────────────────────────────────────────────
    function correctRadius(r: number) {
      const ar = canvas.width / canvas.height
      return ar > 1 ? r * ar : r
    }

    function splat(x: number, y: number, dx: number, dy: number, color: RGB) {
      splatProg.bind()
      gl.uniform1i(splatProg.uniforms.uTarget, velocity.read.attach(0))
      gl.uniform1f(splatProg.uniforms.aspectRatio, canvas.width / canvas.height)
      gl.uniform2f(splatProg.uniforms.point, x, y)
      gl.uniform3f(splatProg.uniforms.color, dx, dy, 0)
      gl.uniform1f(splatProg.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100))
      blit(velocity.write)
      velocity.swap()

      gl.uniform1i(splatProg.uniforms.uTarget, dye.read.attach(0))
      gl.uniform3f(splatProg.uniforms.color, color.r, color.g, color.b)
      blit(dye.write)
      dye.swap()
    }

    function multipleSplats(count: number) {
      for (let i = 0; i < count; i++) {
        const c = generateColor()
        splat(
          Math.random(), Math.random(),
          1000 * (Math.random() - 0.5),
          1000 * (Math.random() - 0.5),
          { r: c.r * 10, g: c.g * 10, b: c.b * 10 },
        )
      }
    }

    // ── Simulation step ───────────────────────────────────────────────────────
    function step(dt: number) {
      gl.disable(gl.BLEND)

      // Curl
      curlProg.bind()
      gl.uniform2f(curlProg.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(0))
      blit(curlFBO)

      // Vorticity confinement
      vorticityProg.bind()
      gl.uniform2f(vorticityProg.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform1i(vorticityProg.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(vorticityProg.uniforms.uCurl,     curlFBO.attach(1))
      gl.uniform1f(vorticityProg.uniforms.curl, config.CURL)
      gl.uniform1f(vorticityProg.uniforms.dt, dt)
      blit(velocity.write)
      velocity.swap()

      // Divergence
      divergenceProg.bind()
      gl.uniform2f(divergenceProg.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform1i(divergenceProg.uniforms.uVelocity, velocity.read.attach(0))
      blit(divergenceFBO)

      // Pressure clear
      clearProg.bind()
      gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(0))
      gl.uniform1f(clearProg.uniforms.value, config.PRESSURE)
      blit(pressure.write)
      pressure.swap()

      // Jacobi pressure solve
      pressureProg.bind()
      gl.uniform2f(pressureProg.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform1i(pressureProg.uniforms.uDivergence, divergenceFBO.attach(0))
      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProg.uniforms.uPressure, pressure.read.attach(1))
        blit(pressure.write)
        pressure.swap()
      }

      // Gradient subtract
      gradSubProg.bind()
      gl.uniform2f(gradSubProg.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform1i(gradSubProg.uniforms.uPressure, pressure.read.attach(0))
      gl.uniform1i(gradSubProg.uniforms.uVelocity, velocity.read.attach(1))
      blit(velocity.write)
      velocity.swap()

      // Advect velocity
      advectProg.bind()
      gl.uniform2f(advectProg.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform2f(advectProg.uniforms.dyeTexelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform1i(advectProg.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(advectProg.uniforms.uSource,   velocity.read.attach(0))
      gl.uniform1f(advectProg.uniforms.dt, dt)
      gl.uniform1f(advectProg.uniforms.dissipation, config.VELOCITY_DISSIPATION)
      blit(velocity.write)
      velocity.swap()

      // Advect dye
      gl.uniform2f(advectProg.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY)
      gl.uniform2f(advectProg.uniforms.dyeTexelSize, dye.read.texelSizeX, dye.read.texelSizeY)
      gl.uniform1i(advectProg.uniforms.uVelocity, velocity.read.attach(0))
      gl.uniform1i(advectProg.uniforms.uSource,   dye.read.attach(1))
      gl.uniform1f(advectProg.uniforms.dissipation, config.DENSITY_DISSIPATION)
      blit(dye.write)
      dye.swap()
    }

    // ── Render ────────────────────────────────────────────────────────────────
    function render() {
      if (config.SUNRAYS) {
        sunraysMaskProg.bind()
        gl.uniform1i(sunraysMaskProg.uniforms.uTexture, dye.read.attach(0))
        blit(sunraysFBO)

        sunraysProg.bind()
        gl.uniform1f(sunraysProg.uniforms.weight, config.SUNRAYS_WEIGHT)
        gl.uniform2f(sunraysProg.uniforms.texelSize, sunraysFBO.texelSizeX, sunraysFBO.texelSizeY)
        gl.uniform1i(sunraysProg.uniforms.uTexture, sunraysFBO.attach(0))
        blit(sunraysTmpFBO)

        blurProg.bind()
        gl.uniform2f(blurProg.uniforms.texelSize, sunraysFBO.texelSizeX, 0)
        gl.uniform1i(blurProg.uniforms.uTexture, sunraysTmpFBO.attach(0))
        blit(sunraysFBO)
        gl.uniform2f(blurProg.uniforms.texelSize, 0, sunraysFBO.texelSizeY)
        gl.uniform1i(blurProg.uniforms.uTexture, sunraysFBO.attach(0))
        blit(sunraysTmpFBO)
      }

      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.BLEND)
      displayProg.bind()
      gl.uniform2f(displayProg.uniforms.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight)
      gl.uniform1i(displayProg.uniforms.uTexture, dye.read.attach(0))
      if (config.SUNRAYS) gl.uniform1i(displayProg.uniforms.uSunrays, sunraysTmpFBO.attach(1))
      gl.uniform3f(displayProg.uniforms.backColor, config.BACK_COLOR.r, config.BACK_COLOR.g, config.BACK_COLOR.b)
      blit(null)
    }

    // ── Pointers ──────────────────────────────────────────────────────────────
    const pointers: Pointer[] = []
    const mouse: Pointer = {
      id: -1, texcoordX: 0, texcoordY: 0,
      prevTexcoordX: 0, prevTexcoordY: 0,
      deltaX: 0, deltaY: 0, moved: false,
      color: generateColor(),
    }
    pointers.push(mouse)

    function getOrMakePointer(id: number): Pointer {
      let p = pointers.find(p => p.id === id)
      if (!p) {
        p = { id, texcoordX: 0, texcoordY: 0, prevTexcoordX: 0, prevTexcoordY: 0, deltaX: 0, deltaY: 0, moved: false, color: generateColor() }
        pointers.push(p)
      }
      return p
    }

    let colorTimer = 0

    function applyInputs() {
      if (config.COLORFUL) {
        colorTimer += config.COLOR_UPDATE_SPEED * 0.001
        if (colorTimer >= 1) {
          colorTimer %= 1
          pointers.forEach(p => { p.color = generateColor() })
        }
      }
      pointers.forEach(p => {
        if (p.moved) {
          p.moved = false
          splat(p.texcoordX, p.texcoordY, p.deltaX * config.SPLAT_FORCE, p.deltaY * config.SPLAT_FORCE, p.color)
        }
      })
    }

    // ── RAF loop ──────────────────────────────────────────────────────────────
    let rafId: number
    let lastTime = Date.now()

    function loop() {
      rafId = requestAnimationFrame(loop)
      const now = Date.now()
      const dt = Math.min((now - lastTime) / 1000, 0.016)
      lastTime = now

      if (resizeCanvas()) {
        const sr = getRes(config.SIM_RESOLUTION)
        const dr = getRes(config.DYE_RESOLUTION)
        const nr = getRes(config.SUNRAYS_RESOLUTION)
        velocity = resizeDoubleFBO(velocity, sr.width, sr.height, fmtRG.internalFormat,   fmtRG.format,   halfFloatType, linearFilter)
        dye      = resizeDoubleFBO(dye,      dr.width, dr.height, fmtRGBA.internalFormat, fmtRGBA.format, halfFloatType, linearFilter)
        pressure = resizeDoubleFBO(pressure, sr.width, sr.height, fmtR.internalFormat,    fmtR.format,    halfFloatType, gl.NEAREST)
        sunraysFBO    = createFBO(nr.width, nr.height, fmtR.internalFormat, fmtR.format, halfFloatType, linearFilter)
        sunraysTmpFBO = createFBO(nr.width, nr.height, fmtR.internalFormat, fmtR.format, halfFloatType, linearFilter)
      }

      applyInputs()
      step(dt)
      render()
    }

    resizeCanvas()
    multipleSplats(Math.floor(Math.random() * 5) + 3)
    loop()

    // ── Event listeners ───────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      mouse.prevTexcoordX = mouse.texcoordX
      mouse.prevTexcoordY = mouse.texcoordY
      mouse.texcoordX = e.clientX / window.innerWidth
      mouse.texcoordY = 1 - e.clientY / window.innerHeight
      mouse.deltaX = mouse.texcoordX - mouse.prevTexcoordX
      mouse.deltaY = mouse.texcoordY - mouse.prevTexcoordY
      mouse.moved = Math.abs(mouse.deltaX) > 0 || Math.abs(mouse.deltaY) > 0
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        const p = getOrMakePointer(t.identifier)
        p.texcoordX = t.clientX / window.innerWidth
        p.texcoordY = 1 - t.clientY / window.innerHeight
        p.prevTexcoordX = p.texcoordX
        p.prevTexcoordY = p.texcoordY
        p.color = generateColor()
        splat(p.texcoordX, p.texcoordY, 0, 0, { r: p.color.r * 10, g: p.color.g * 10, b: p.color.b * 10 })
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        const p = getOrMakePointer(t.identifier)
        p.prevTexcoordX = p.texcoordX
        p.prevTexcoordY = p.texcoordY
        p.texcoordX = t.clientX / window.innerWidth
        p.texcoordY = 1 - t.clientY / window.innerHeight
        p.deltaX = p.texcoordX - p.prevTexcoordX
        p.deltaY = p.texcoordY - p.prevTexcoordY
        p.moved = true
      }
    }

    function onTouchEnd(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        const p = pointers.find(p => p.id === t.identifier)
        if (p) p.moved = false
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd)

    // ── Theme observer ────────────────────────────────────────────────────────
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      config.BACK_COLOR = isDark ? { r: 0.039, g: 0.027, b: 0.071 } : { r: 0.969, g: 0.961, b: 1.0 }
      config.SUNRAYS = isDark
      config.SHADING = isDark
      updateDisplayKeywords()
      multipleSplats(3 + Math.floor(Math.random() * 7))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  )
}
