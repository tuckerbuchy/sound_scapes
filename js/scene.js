var audio_playing;
var mySphere4Material;
var mySphere4Geometry;
var mySphere4;
var radius = 5;

var g_startTime = Date.now();   // last time the function was called
var g_time = 0;
function update() {
  g_time = (Date.now() - g_startTime)/1000;
}

$(document).ready(function(){  
  var scene = new THREE.Scene();

    // SETUP RENDERER

  var renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( 0x000000 );                // white background colour
  document.body.appendChild( renderer.domElement );  // add to document canvas 

   // SETUP CAMERA

  var aspect = window.innerWidth/window.innerHeight;
  camera = new THREE.PerspectiveCamera( 30, aspect, 0.1, 10000);   // view angle, aspect ratio, near, far
  camera.position.set(10,15,40);
  camera.lookAt(scene.position);	
  scene.add(camera);

    // DEFINE UNIT CUBE -- to be reused several times

  var unitCubeGeometry = new THREE.BoxGeometry( 1,1,1 );   

    // SCENE AXES:    (x,y,z) drawn in (red,greeen,blue)

  // var redMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
  // var greenMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  // var blueMaterial  = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
  var yellowMaterial  = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
  var originBox = new THREE.Mesh( unitCubeGeometry, yellowMaterial );
  scene.add( originBox );
  // var xAxis = new THREE.Mesh( unitCubeGeometry, redMaterial );
  // var yAxis = new THREE.Mesh( unitCubeGeometry, greenMaterial );
  // var zAxis = new THREE.Mesh( unitCubeGeometry, blueMaterial );
  // var axisWidth = 0.2;
  // var axisLength = 10;
  // scene.add( xAxis );   xAxis.scale.set(axisLength,axisWidth,axisWidth); xAxis.position.set(0.5*axisLength,0,0);
  // scene.add( yAxis );   yAxis.scale.set(axisWidth,axisLength,axisWidth); yAxis.position.set(0,0.5*axisLength,0);
  // scene.add( zAxis );   zAxis.scale.set(axisWidth,axisWidth,axisLength); zAxis.position.set(0,0,0.5*axisLength);

  //xAxis.parent = yAxis.parent = zAxis.parent = originBox;
  
    // FLOOR WITH CHECKERBOARD 

  var floorTexture = new THREE.ImageUtils.loadTexture( 'images/checkerboard.jpg' );
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
  floorTexture.repeat.set( 4, 4 );
  var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
  var floorGeometry = new THREE.PlaneGeometry(10, 10);
  var floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.y = -0.1;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);
  floor.parent = originBox;

      // LIGHTS:  needed for phong illumination model
      // The following will be used by (1) three.js; and (2) your own shaders, passed via uniforms

  lightColor = new THREE.Color(1,1,1);
  ambientColor = new THREE.Color(1,1,1);
  lightPosition = new THREE.Vector3(-70,100,70);

/////////////////////////// THREE.JS ILLUMINATION ////////////////////////////

    // LIGHT SOURCES
  kAmbient = new THREE.Color(0xff4040);    // ambient reflectance
  kDiffuse = new THREE.Color(0x808080);    // diffuse reflectance
  kSpecular = new THREE.Color(0x101010);   // specular reflectance (purposely 4x larger)
  k0 = new THREE.Color(0x000000);          // use when we want to assign zero reflectance
  shininess = 10.0;                        // Phong shininess (purposely 4x smaller)

  var light = new THREE.PointLight(lightColor.getHex());
  light.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
  scene.add(light);
  var ambientLight = new THREE.AmbientLight(ambientColor.getHex());
  scene.add(ambientLight);
  mySphere4Material = new THREE.MeshPhongMaterial( 
    {  ambient: kAmbient, color: kDiffuse, specular: kSpecular, color: k0,  shininess: 40, shading: THREE.SmoothShading });
  mySphere4Geometry = new THREE.SphereGeometry( radius, 32, 32 );
  mySphere4 = new THREE.Mesh( mySphere4Geometry, mySphere4Material );
  scene.add( mySphere4 );
  mySphere4.position.set(0,4,0);
  mySphere4.parent = originBox;
  var i = 0;
  var render = function () {
    update();
    requestAnimationFrame( render );
    originBox.rotation.y += 0.004;
    if (audio_playing == true){
      var audioMetrics = processAudio();
      var hue = mapFrequencyToHue(audioMetrics.frequency);

      var diffuseTempSphere = HSVtoRGB(hue, 0.9, 0.5);
      var diffSphere = new THREE.Color();
      diffSphere.r = diffuseTempSphere.r / 255;
      diffSphere.g = diffuseTempSphere.g / 255;
      diffSphere.b = diffuseTempSphere.b / 255;
      mySphere4Material.color = diffSphere;

      var satValueThetaRad = 2*g_time;
      var satValueTheta = Math.abs(Math.sin(satValueThetaRad/100));
      var ambientTempSphere = HSVtoRGB(satValueTheta, hue, hue);
      var ambientSphere = new THREE.Color();
      ambientSphere.r = (ambientTempSphere.r) / 255;
      ambientSphere.g = (ambientTempSphere.g) / 255;
      ambientSphere.b = (ambientTempSphere.b) / 255;
      mySphere4Material.ambient = ambientSphere;

      var scaleFactor = audioMetrics.loudnessRatio;
      console.log(scaleFactor);
      mySphere4.scale.set(scaleFactor,scaleFactor,scaleFactor);
      renderer.render(scene, camera);
      mySphere4.scale.set(1/scaleFactor,1/scaleFactor,1/scaleFactor);
    } else {
      renderer.render(scene, camera);      
    }
      
  };
  render();
});

