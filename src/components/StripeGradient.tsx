import { useEffect, useRef } from "react"

// WebGL Gradient implementation based on Stripe's design
function normalizeColor(hexCode: number) {
  return [(hexCode >> 16 & 255) / 255, (hexCode >> 8 & 255) / 255, (255 & hexCode) / 255]
}

class MiniGl {
  canvas: HTMLCanvasElement
  gl: WebGLRenderingContext
  meshes: any[]
  width: number
  height: number
  commonUniforms: any
  debug: (...args: any[]) => void
  Material: any
  Uniform: any
  PlaneGeometry: any
  Mesh: any
  Attribute: any

  constructor(canvas: HTMLCanvasElement, width?: number, height?: number, debug = false) {
    this.canvas = canvas
    this.gl = this.canvas.getContext("webgl", { antialias: true })!
    this.meshes = []
    this.debug = debug ? console.log : () => {}
    
    if (width && height) this.setSize(width, height)
    
    this.initClasses()
    this.initCommonUniforms()
  }

  initClasses() {
    const context = this.gl

    this.Material = class {
      uniforms: any
      uniformInstances: any[]
      vertexSource: string
      fragmentSource: string
      vertexShader: WebGLShader
      fragmentShader: WebGLShader
      program: WebGLProgram

      constructor(vertexShaders: string, fragments: string, uniforms = {}) {
        this.uniforms = uniforms
        this.uniformInstances = []

        const prefix = "precision highp float;"
        this.vertexSource = `${prefix} ${vertexShaders}`
        this.fragmentSource = `${prefix} ${fragments}`

        this.vertexShader = this.createShader(context.VERTEX_SHADER, this.vertexSource)
        this.fragmentShader = this.createShader(context.FRAGMENT_SHADER, this.fragmentSource)
        this.program = context.createProgram()!

        context.attachShader(this.program, this.vertexShader)
        context.attachShader(this.program, this.fragmentShader)
        context.linkProgram(this.program)
        context.useProgram(this.program)
      }

      createShader(type: number, source: string) {
        const shader = context.createShader(type)!
        context.shaderSource(shader, source)
        context.compileShader(shader)
        return shader
      }
    }

    this.Uniform = class {
      type: string
      value: any
      typeFn: string

      constructor(options: any) {
        this.type = "float"
        Object.assign(this, options)
        this.typeFn = {
          float: "1f",
          int: "1i", 
          vec2: "2fv",
          vec3: "3fv",
          vec4: "4fv",
          mat4: "Matrix4fv"
        }[this.type] || "1f"
      }

      update(location?: WebGLUniformLocation) {
        if (location && this.value !== undefined) {
          const gl = context as any
          if (this.typeFn === "1f") {
            gl.uniform1f(location, this.value)
          } else if (this.typeFn === "2fv") {
            gl.uniform2fv(location, this.value)
          } else if (this.typeFn === "3fv") {
            gl.uniform3fv(location, this.value)
          } else if (this.typeFn === "4fv") {
            gl.uniform4fv(location, this.value)
          }
        }
      }
    }

    this.PlaneGeometry = class {
      attributes: any
      vertexCount: number
      
      constructor(width = 1, height = 1) {
        this.attributes = {
          position: new Float32Array([-width/2, -height/2, 0, width/2, -height/2, 0, width/2, height/2, 0, -width/2, height/2, 0]),
          uv: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          index: new Uint16Array([0, 1, 2, 0, 2, 3])
        }
        this.vertexCount = 4
      }
    }

    this.Mesh = class {
      geometry: any
      material: any
      positionBuffer: WebGLBuffer
      uvBuffer: WebGLBuffer  
      indexBuffer: WebGLBuffer

      constructor(geometry: any, material: any) {
        this.geometry = geometry
        this.material = material
        
        // Create and bind buffers
        this.positionBuffer = context.createBuffer()!
        this.uvBuffer = context.createBuffer()!
        this.indexBuffer = context.createBuffer()!
        
        context.bindBuffer(context.ARRAY_BUFFER, this.positionBuffer)
        context.bufferData(context.ARRAY_BUFFER, geometry.attributes.position, context.STATIC_DRAW)
        
        context.bindBuffer(context.ARRAY_BUFFER, this.uvBuffer)
        context.bufferData(context.ARRAY_BUFFER, geometry.attributes.uv, context.STATIC_DRAW)
        
        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
        context.bufferData(context.ELEMENT_ARRAY_BUFFER, geometry.attributes.index, context.STATIC_DRAW)
      }

      draw() {
        context.useProgram(this.material.program)
        
        // Set up position attribute
        const positionLocation = context.getAttribLocation(this.material.program, "position")
        context.bindBuffer(context.ARRAY_BUFFER, this.positionBuffer)
        context.enableVertexAttribArray(positionLocation)
        context.vertexAttribPointer(positionLocation, 3, context.FLOAT, false, 0, 0)
        
        // Set up UV attribute
        const uvLocation = context.getAttribLocation(this.material.program, "uv")
        context.bindBuffer(context.ARRAY_BUFFER, this.uvBuffer)
        context.enableVertexAttribArray(uvLocation)
        context.vertexAttribPointer(uvLocation, 2, context.FLOAT, false, 0, 0)
        
        // Update uniforms
        this.material.uniformInstances.forEach(({ uniform, location }: any) => {
          uniform.update(location)
        })
        
        // Draw
        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
        context.drawElements(context.TRIANGLES, 6, context.UNSIGNED_SHORT, 0)
      }
    }
  }

  initCommonUniforms() {
    this.commonUniforms = {
      resolution: new this.Uniform({ type: "vec2", value: [1, 1] }),
      time: new this.Uniform({ type: "float", value: 0 })
    }
  }

  setSize(width = 640, height = 480) {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.gl.viewport(0, 0, width, height)
    this.commonUniforms.resolution.value = [width, height]
  }

  render() {
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.meshes.forEach(mesh => mesh.draw())
  }
}

class StripeGradient {
  el: HTMLCanvasElement
  minigl: MiniGl
  material: any
  geometry: any
  mesh: any
  t = 0
  last = 0
  conf: any
  sectionColors: number[][]
  uniforms: any

  constructor(canvas: HTMLCanvasElement) {
    this.el = canvas
    this.conf = { playing: true }
    this.sectionColors = [
      normalizeColor(0xa960ee), // Purple
      normalizeColor(0xff333d), // Red  
      normalizeColor(0x90e0ff), // Light Blue
      normalizeColor(0xffcb57), // Yellow
      normalizeColor(0x00d4aa), // Teal
      normalizeColor(0x10b981), // Green
      normalizeColor(0x3b82f6)  // Blue
    ]
    this.init()
  }

  init() {
    this.minigl = new MiniGl(this.el, this.el.clientWidth, this.el.clientHeight)
    this.initMaterial()
    this.initMesh()
    this.resize()
    this.animate()
    
    window.addEventListener("resize", this.resize.bind(this))
  }

  initMaterial() {
    const vertexShader = `
      attribute vec3 position;
      attribute vec2 uv;
      uniform vec2 resolution;
      uniform float time;
      varying vec2 vUv;
      varying vec3 vColor;
      
      // Simple noise function
      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      
      void main() {
        vUv = uv;
        
        // Create flowing gradient effect
        float t = time * 0.0001;
        float wave1 = sin(uv.x * 3.14159 + t * 2.0) * 0.5 + 0.5;
        float wave2 = sin(uv.y * 3.14159 + t * 1.5) * 0.5 + 0.5;
        float wave3 = sin((uv.x + uv.y) * 3.14159 + t * 3.0) * 0.5 + 0.5;
        
        // Mix colors based on position and time
        vec3 color1 = vec3(0.663, 0.376, 0.933); // Purple
        vec3 color2 = vec3(1.000, 0.200, 0.239); // Red
        vec3 color3 = vec3(0.565, 0.878, 1.000); // Light Blue
        vec3 color4 = vec3(1.000, 0.796, 0.341); // Yellow
        vec3 color5 = vec3(0.000, 0.831, 0.667); // Teal
        vec3 color6 = vec3(0.063, 0.725, 0.506); // Green
        vec3 color7 = vec3(0.231, 0.510, 0.965); // Blue
        
        vColor = mix(
          mix(
            mix(color1, color2, wave1),
            mix(color3, color4, wave2), 
            wave3
          ),
          mix(
            mix(color5, color6, wave2),
            color7,
            wave1
          ),
          sin(t + uv.x * 2.0) * 0.5 + 0.5
        );
        
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `

    const fragmentShader = `
      varying vec2 vUv;
      varying vec3 vColor;
      
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `

    this.uniforms = {
      resolution: this.minigl.commonUniforms.resolution,
      time: this.minigl.commonUniforms.time
    }

    this.material = new this.minigl.Material(vertexShader, fragmentShader, this.uniforms)
    
    // Attach uniforms
    this.material.uniformInstances = [
      { uniform: this.uniforms.resolution, location: this.minigl.gl.getUniformLocation(this.material.program, "resolution") },
      { uniform: this.uniforms.time, location: this.minigl.gl.getUniformLocation(this.material.program, "time") }
    ]
  }

  initMesh() {
    this.geometry = new this.minigl.PlaneGeometry(2, 2)
    this.mesh = new this.minigl.Mesh(this.geometry, this.material)
    this.minigl.meshes.push(this.mesh)
  }

  resize = () => {
    const rect = this.el.getBoundingClientRect()
    this.minigl.setSize(rect.width, rect.height)
  }

  animate = () => {
    if (!this.conf.playing) return
    
    this.t += 16 // Roughly 60fps increment
    this.uniforms.time.value = this.t
    this.minigl.render()
    
    requestAnimationFrame(this.animate)
  }

  pause() {
    this.conf.playing = false
  }

  play() {
    if (!this.conf.playing) {
      this.conf.playing = true
      this.animate()
    }
  }
}

interface StripeGradientProps {
  className?: string
}

export const StripeGradientCanvas = ({ className = "" }: StripeGradientProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gradientRef = useRef<StripeGradient | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    gradientRef.current = new StripeGradient(canvasRef.current)

    return () => {
      if (gradientRef.current) {
        gradientRef.current.pause()
      }
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}