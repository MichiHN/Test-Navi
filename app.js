class Gallery {
    constructor() {
        this.audioTracks = [
            new Audio('music/music1.mp3'),
            new Audio('music/music2.mp3'),
            new Audio('music/music3.mp3')
        ];
        this.currentTrackIndex = 0;
        this.audioTracks.forEach(track => {
            track.loop = true; 
            track.volume = 0.5; 
        });
        this.audioTracks[this.currentTrackIndex].play(); 

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 10);
        this.spawnPoint = new THREE.Vector3(0, 2, 10);
        this.camera.position.copy(this.spawnPoint);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById("gallery-container").appendChild(this.renderer.domElement);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        this.pointLight = new THREE.PointLight(0xffffff, 1, 100);
        this.pointLight.position.set(0, 5, 5);
        this.scene.add(this.pointLight);

        this.wallMaterial = new THREE.MeshStandardMaterial({ color: 0xcda174, side: THREE.DoubleSide });
        this.gallerySize = { width: 50, height: 10, depth: 50 };

        this.artworks = [
            { file: "artworks/art1.jpg", position: [-3, 2, -9] },
            { file: "artworks/art2.jpg", position: [3, 2, -9] },
            { file: "artworks/art3.jpg", position: [-4, 2, 9] },
            { file: "artworks/art4.jpg", position: [4, 2, 9] },
            { file: "artworks/art5.jpg", position: [-7, 2, -9] },
            { file: "artworks/art6.jpg", position: [7, 2, -9] },
            { file: "artworks/art7.jpg", position: [-8, 2, 9] },
            { file: "artworks/art8.jpg", position: [8, 2, 9] },
            { file: "artworks/art9.jpg", position: [0, 2, -12] },
            { file: "artworks/art10.jpg", position: [0, 2, 12] } 
        ];

        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.isPointerLocked = false;

        this.pitch = 0; 
        this.yaw = 0;  

        this.isJumping = false;
        this.verticalVelocity = 0;
        this.gravity = -0.01;
        this.jumpStrength = 0.2;
        this.groundLevel = 2;
        this.isMovementEnabled = false; // Flag to enable/disable movement

        this.isJoystickActive = false; // Flag for joystick controls
        this.joystickManager = null; // Joystick manager instance
        this.touchData = { x: 0, y: 0 }; // Data for touch-based movement

        this.init();
    }

    init() {
        this.createWalls();
        this.loadArtworks();
        this.setupEventListeners();
        this.setupJoystick(); // Initialize joystick setup
        this.animate();
    }

    createWalls() {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.gallerySize.width, this.gallerySize.depth), this.wallMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        this.scene.add(floor);
    
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(this.gallerySize.width, this.gallerySize.height), this.wallMaterial);
        backWall.position.z = -this.gallerySize.depth / 2;
        backWall.position.y = this.gallerySize.height / 2;
        this.scene.add(backWall);
    
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(this.gallerySize.width, this.gallerySize.height), this.wallMaterial);
        frontWall.position.z = this.gallerySize.depth / 2;
        frontWall.position.y = this.gallerySize.height / 2;
        this.scene.add(frontWall);
    
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(this.gallerySize.depth, this.gallerySize.height), this.wallMaterial);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.x = -this.gallerySize.width / 2;
        leftWall.position.y = this.gallerySize.height / 2;
        this.scene.add(leftWall);
    
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(this.gallerySize.depth, this.gallerySize.height), this.wallMaterial);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.x = this.gallerySize.width / 2;
        rightWall.position.y = this.gallerySize.height / 2;
        this.scene.add(rightWall);

        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.gallerySize.width, this.gallerySize.depth), this.wallMaterial);
        ceiling.rotation.x = Math.PI / 2; 
        ceiling.position.y = this.gallerySize.height; 
        this.scene.add(ceiling);
    }

    loadArtworks() {
        const loader = new THREE.TextureLoader();
    
        this.artworks.forEach(art => {
            loader.load(art.file, (texture) => {
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const plane = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), material);
                plane.position.set(...art.position);
    
                if (art.position[2] === -this.gallerySize.depth / 2) {
                    plane.rotation.y = Math.PI;
                }
    
                this.scene.add(plane);
            });
        });
    }

    setupEventListeners() {
        // Handle keyboard events
        window.addEventListener("keydown", (e) => this.keys[e.key] = true);
        window.addEventListener("keyup", (e) => this.keys[e.key] = false);
    
        // Handle window resize
        window.addEventListener("resize", () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    
        // Blocker element
        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');
    
        const hideBlocker = (event) => {
            event.preventDefault(); // Prevent default behavior like scrolling
            if (!this.isPointerLocked) {
                this.enterPointerLock();
            }
        };
    
        // Attach both click and touchstart events
        blocker.addEventListener('click', hideBlocker);
        blocker.addEventListener('touchstart', hideBlocker, { passive: false }); // For touch
    
        // Pointer lock change
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    
            if (this.isPointerLocked) {
                this.onPointerLockEnable();
            } else {
                this.onPointerLockDisable();
            }
        });
    
        // Instructions element click/touch
        instructions.addEventListener('click', () => {
            this.enterPointerLock();
        });
        instructions.addEventListener('touchstart', () => {
            this.enterPointerLock();
        }, { passive: false });
    
        // Music controls
        window.addEventListener("keydown", (e) => {
            if (e.key === 'n') {
                this.nextTrack();
            } else if (e.key === 'p') {
                this.previousTrack();
            }
        });
    }
    
    // Handle pointer lock enable/disable
    onPointerLockEnable() {
        this.isMovementEnabled = true;
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('blocker').style.display = 'none';
    }
    
    onPointerLockDisable() {
        this.isMovementEnabled = false;
        this.resetKeys();
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.getElementById('blocker').style.display = 'block';
        document.getElementById('instructions').style.display = '';
    }
    
    // Reset all keys
    resetKeys() {
        for (let key in this.keys) {
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
        }
    }    
    
    nextTrack() {
        this.audioTracks[this.currentTrackIndex].pause();
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.audioTracks.length;
        this.audioTracks[this.currentTrackIndex].play();
    }

    previousTrack() {
        this.audioTracks[this.currentTrackIndex].pause();
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.audioTracks.length) % this.audioTracks.length;
        this.audioTracks[this.currentTrackIndex].play();
    }

    enterPointerLock() {
        this.renderer.domElement.requestPointerLock();
    }

    onMouseMove(event) {
        if (!this.isPointerLocked) return;

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        this.yaw -= movementX * 0.001; 
        this.pitch -= movementY * 0.001; 

        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

        const yawQuaternion = new THREE.Quaternion();
        yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        const pitchQuaternion = new THREE.Quaternion();
        pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);

        const combinedQuaternion = new THREE.Quaternion();
        combinedQuaternion.multiplyQuaternions(yawQuaternion, pitchQuaternion);
        this.camera.quaternion.copy(combinedQuaternion);
    }

    setupJoystick() {
        // Create joystick manager
        const joystickZone = document.createElement('div');
        joystickZone.id = 'joystick-zone';
        joystickZone.style.position = 'absolute';
        joystickZone.style.bottom = '20px';
        joystickZone.style.left = '20px';
        joystickZone.style.width = '150px';
        joystickZone.style.height = '150px';
        joystickZone.style.zIndex = '10';
        joystickZone.style.display = 'none'; // Hidden initially
        document.body.appendChild(joystickZone);

        this.joystickManager = nipplejs.create({
            zone: joystickZone,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'blue',
        });

        this.joystickManager.on('move', (evt, data) => {
            const angle = data.angle.degree;
            const distance = data.distance;

            // Normalize movement to a unit vector
            const radians = angle * (Math.PI / 180);
            this.touchData.x = Math.cos(radians) * (distance / 50);
            this.touchData.y = Math.sin(radians) * (distance / 50);
        });

        this.joystickManager.on('end', () => {
            this.touchData.x = 0;
            this.touchData.y = 0;
        });
    }

    toggleControls() {
        this.isJoystickActive = !this.isJoystickActive;

        const joystickZone = document.getElementById('joystick-zone');
        if (this.isJoystickActive) {
            joystickZone.style.display = 'block';
            document.getElementById("toggle-controls").textContent = "Switch to Keyboard/Mouse Controls";
        } else {
            joystickZone.style.display = 'none';
            document.getElementById("toggle-controls").textContent = "Switch to Joystick Controls";
        }
    }


    handleControls() {
        if (!this.isMovementEnabled) return;

        const speed = this.keys["Shift"] ? 0.2 : 0.1;

        if (this.isJoystickActive) {
            // Handle joystick movement
            this.camera.position.x += this.touchData.x * speed;
            this.camera.position.z += this.touchData.y * speed;
        } else {
            // Handle keyboard movement
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            if (this.keys["w"]) this.camera.position.add(forward.clone().multiplyScalar(speed));
            if (this.keys["s"]) this.camera.position.add(forward.clone().negate().multiplyScalar(speed));
            if (this.keys["a"]) this.camera.position.add(right.clone().negate().multiplyScalar(speed));
            if (this.keys["d"]) this.camera.position.add(right.clone().multiplyScalar(speed));
        }

        // Handle jumping
        if (this.keys[" "] && !this.isJumping) {
            this.isJumping = true;
            this.verticalVelocity = this.jumpStrength;
        }

        if (this.isJumping) {
            this.verticalVelocity += this.gravity;
            this.camera.position.y += this.verticalVelocity;

            if (this.camera.position.y <= this.groundLevel) {
                this.camera.position.y = this.groundLevel;
                this.isJumping = false;
                this.verticalVelocity = 0;
            }
        }

        this.checkCollision();
    }

    checkCollision() {
        const halfWidth = this.gallerySize.width / 2;
        const halfDepth = this.gallerySize.depth / 2;

        if (this.camera.position.x < -halfWidth || this.camera.position.x > halfWidth ||
            this.camera.position.z < -halfDepth || this.camera.position.z > halfDepth) {
            
            this.camera.position.copy(this.spawnPoint);
        }
    }

    animate() {
        this.handleControls();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.animate());
    }
}

const gallery = new Gallery();
