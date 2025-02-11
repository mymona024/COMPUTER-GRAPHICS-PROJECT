import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

var vertexShaderSource =
`
varying vec2 vUv;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vUv = uv;
}
`

var fragmentShaderSource =
`
precision mediump float;
uniform sampler2D u_texture;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(u_texture, vUv);
}
`

const shaderMaterial = (texture, side) => { 
  return new THREE.MeshStandardMaterial({
  map: texture,
  side
})
}

const scene = new THREE.Scene()

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const canvas = document.querySelector('#webgl')

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
)

camera.position.z = 5

const textures = {
  room: {
    wall: new THREE.TextureLoader().load('textures/wall.jpg'),
    floor: new THREE.TextureLoader().load('textures/floor.jpg')
  },
  couch: [
    new THREE.TextureLoader().load('textures/couch_black.jpg'),
    new THREE.TextureLoader().load('textures/couch_gold.jpg'),
    new THREE.TextureLoader().load('textures/couch_red.jpg'),
  ],
  leg: new THREE.TextureLoader().load('textures/leg.jpg'),
  index: 0
}

const room = new THREE.Mesh(
  new THREE.BoxGeometry(15, 7, 10),
  [
    shaderMaterial(textures.room.wall, THREE.BackSide),
    shaderMaterial(textures.room.wall, THREE.BackSide),
    shaderMaterial(textures.room.wall, THREE.BackSide),
    shaderMaterial(textures.room.floor, THREE.BackSide),
    shaderMaterial(textures.room.wall, THREE.BackSide),
    shaderMaterial(textures.room.wall, THREE.BackSide)
  ]
)

const couch = new THREE.Group()
const seat = new THREE.Mesh(
  new THREE.BoxGeometry(4, .5, 1.5),
  shaderMaterial(textures.couch[0], THREE.FrontSide)
)

const backrest = new THREE.Mesh(
  new THREE.BoxGeometry(4, .5, 1.5),
  shaderMaterial(textures.couch[0], THREE.FrontSide)
)
backrest.rotation.x = Math.PI/2
backrest.position.z = -.75
backrest.position.y = .4

const arm1 = new THREE.Mesh(
  new THREE.CapsuleGeometry(.24, 1.2),
  shaderMaterial(textures.couch[0], THREE.FrontSide)
)

arm1.rotation.x = Math.PI/2
arm1.position.set(1.8, .4, .05)

const arm2 = arm1.clone()
arm2.position.x = -1.8

const legs = []
legs.push( new THREE.Mesh(
  new THREE.BoxGeometry(.25, .4, .25),
  new THREE.ShaderMaterial({
    uniforms: {
      u_texture: { value: textures.leg}
    },
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource
  })
))
legs.push(legs[0].clone())
legs.push(legs[0].clone())
legs.push(legs[0].clone())

legs[0].position.set(1.8, -.3, .5)
legs[1].position.set(-1.8, -.3, .5)
legs[2].position.set(1.8, -.3, -.8)
legs[3].position.set(-1.8, -.3, -.8)

couch.add(seat, backrest, arm1, arm2, ...legs)
couch.position.set(0, -2.8, -1)
couch.scale.setScalar(1.5 )
new GLTFLoader().load(
  'model/stand_lamp.glb', 
  function ( gltf ) {
    gltf.scene.scale.setScalar(3)
    gltf.scene.position.set(-5, -3.52, -2.6)
    scene.add( gltf.scene );
		gltf.scene; 
	}, 
  undefined, 
  function ( error ) {
		console.log( 'An error happened' )
	}
)

scene.add(room, couch);

const ambient_light = new THREE.AmbientLight(0xffffff, .01)
scene.add(ambient_light)

const light = new THREE.PointLight(0xffffdd, 30, 15, 2)
light.position.set(-5, 0.6, -2.05)
scene.add(light)

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
light.castShadow = true

couch.children.forEach((child) => {
  if (child instanceof THREE.Mesh) {
    child.castShadow = true
  }
})
room.receiveShadow = true

camera.position.y = 1
const camorbit= {
  radius: camera.position.z,
  angle: Math.PI/2,
  speed: 0.01,
  target: couch.position
}

const input = {
  left: false,
  right: false
}

const cameramovement = () =>{
  let any = true
  if (input.left) camorbit.angle += camorbit.speed
  else if (input.right) camorbit.angle -= camorbit.speed
  else any = false

  if(!any) return

  camorbit.target = new THREE.Vector3(0, camera.position.y, 0)

  camera.position.x = camorbit.radius * Math.cos(camorbit.angle)
  camera.position.z = camorbit.radius * Math.sin(camorbit.angle)
  camera.lookAt(camorbit.target)
}

const lightprops = {
  intensity: {
    max: 30,
    min: 0
  },
  step: 0.05,
  isFading: true,
  offTime: 100,
  timer: 0
}

const lightOffOn = () => {
  if(light.intensity <= lightprops.intensity.min) {
    lightprops.isFading = false
    lightprops.timer++
  }
  else if(light.intensity >= lightprops.intensity.max) lightprops.isFading = true
  if(lightprops.timer < lightprops.offTime && lightprops.timer != 0 && !lightprops.isFading) return
  if(lightprops.timer == lightprops.offTime) lightprops.timer = 0

  if(lightprops.isFading) light.intensity -= lightprops.step
  else light.intensity += lightprops.step
}

function animate() {
	requestAnimationFrame(animate)
  cameramovement()
  lightOffOn()
  renderer.render(scene, camera)
}

animate()

window.addEventListener('click', () => {
  textures.index++
  if(textures.index == textures.couch.length) textures.index = 0;
  couch.children.forEach((child) => {
    if (child instanceof THREE.Mesh) {
      child.material.map = textures.couch[textures.index]
      child.material.needsUpdate = true
    }
  })
})

window.addEventListener("keydown", (event) => {
  if (event.key == 'ArrowLeft') input.left = true
  if (event.key == 'ArrowRight') input.right = true
  if (event.key == 'ArrowUp') input.up = true
  if (event.key == 'ArrowDown') input.down = true
})

window.addEventListener("keyup", (event) => {
  if (event.key == 'ArrowLeft') input.left = false
  if (event.key == 'ArrowRight') input.right = false
  if (event.key == 'ArrowUp') input.up = false
  if (event.key == 'ArrowDown') input.down = false
})

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  renderer.setSize(sizes.width, sizes.height)
  renderer.render(scene, camera)
})