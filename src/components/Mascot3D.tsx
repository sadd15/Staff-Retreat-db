import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Mascot3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Create Scene, Camera, Renderer
    const scene = new THREE.Scene();
    
    const width = container.clientWidth || 250;
    const height = container.clientHeight || 220;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create 3D Mascot Group
    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    // Mascot Body: A glossy, bright indigo sphere (Joy mascot)
    const bodyGeometry = new THREE.SphereGeometry(1.4, 64, 64);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f46e5, // Indigo-600
      roughness: 0.15,
      metalness: 0.1,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    mascotGroup.add(bodyMesh);

    // Colorful stripes (beach ball style)
    const stripeGeometry = new THREE.TorusGeometry(1.42, 0.08, 16, 100);
    const stripeMaterial1 = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // Rose-500
      roughness: 0.2,
    });
    const stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial1);
    stripe1.rotation.x = Math.PI / 2;
    mascotGroup.add(stripe1);

    const stripeMaterial2 = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald-500
      roughness: 0.2,
    });
    const stripe2 = new THREE.Mesh(stripeGeometry, stripeMaterial2);
    stripe2.rotation.y = Math.PI / 2;
    mascotGroup.add(stripe2);

    // Cute Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.16, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a }); // Slate-900
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.45, 0.25, 1.2);
    mascotGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.45, 0.25, 1.2);
    mascotGroup.add(rightEye);

    // Cute blushing cheeks
    const cheekGeometry = new THREE.SphereGeometry(0.14, 16, 16);
    const cheekMaterial = new THREE.MeshBasicMaterial({ color: 0xfda4af }); // Rose-300
    
    const leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
    leftCheek.position.set(-0.7, 0.02, 1.15);
    mascotGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial);
    rightCheek.position.set(0.7, 0.02, 1.15);
    mascotGroup.add(rightCheek);

    // Cute Smile using a Torus
    const smileGeometry = new THREE.TorusGeometry(0.22, 0.05, 8, 24, Math.PI);
    const smileMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const smile = new THREE.Mesh(smileGeometry, smileMaterial);
    smile.position.set(0, 0.02, 1.25);
    smile.rotation.x = Math.PI; // Flip to make a happy smile
    mascotGroup.add(smile);

    // Floating Star Decoration on top of mascot
    const starGeometry = new THREE.OctahedronGeometry(0.35, 0);
    const starMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber-500
      roughness: 0.1,
      metalness: 0.8,
    });
    const starDecoration = new THREE.Mesh(starGeometry, starMaterial);
    starDecoration.position.set(0, 1.8, 0);
    mascotGroup.add(starDecoration);

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 1.0); // Indigo glow
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xf43f5e, 1.5, 10); // Rose core glow
    pointLight.position.set(0, 2.5, 2);
    scene.add(pointLight);

    // Mouse tracking states
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      mouse.targetX = (relativeX / (rect.width || width)) * 2 - 1;
      mouse.targetY = -((relativeY / (rect.height || height)) * 2 - 1);
    };

    container.addEventListener('mousemove', onMouseMove);

    // Click jump animation states
    let isJumping = false;
    let jumpVelocity = 0;
    let jumpPosition = 0;
    
    const triggerJump = () => {
      if (isJumping) return;
      isJumping = true;
      jumpVelocity = 0.22;
      
      // Toggle color randomly on click for delightful feedback
      const funColors = [0x4f46e5, 0x10b981, 0xec4899, 0xf59e0b, 0x06b6d4, 0x8b5cf6];
      const randomColor = funColors[Math.floor(Math.random() * funColors.length)];
      bodyMaterial.color.setHex(randomColor);
    };

    container.addEventListener('click', triggerJump);

    // Animation loop
    const clock = new THREE.Clock();
    let reqId: number;

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation (lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      // Gentle floating up & down with sine wave
      const floatY = Math.sin(elapsedTime * 2.2) * 0.15;
      mascotGroup.position.y = floatY + jumpPosition;

      // Jump/Click squash and stretch physics
      if (isJumping) {
        jumpPosition += jumpVelocity;
        jumpVelocity -= 0.014; // Gravity emulation
        
        // Fast roll during jump
        mascotGroup.rotation.y += 0.22;
        mascotGroup.rotation.x += 0.12;

        // Scale squash/stretch
        if (jumpVelocity > 0) {
          mascotGroup.scale.set(0.85, 1.25, 0.85); // Stretch
        } else {
          mascotGroup.scale.set(1.2, 0.8, 1.2); // Squish
        }

        if (jumpPosition <= 0) {
          jumpPosition = 0;
          isJumping = false;
          mascotGroup.scale.set(1, 1, 1);
        }
      } else {
        // Relaxed rotate, following mouse coords
        mascotGroup.rotation.y = elapsedTime * 0.55 + mouse.x * 0.85;
        mascotGroup.rotation.x = mouse.y * 0.55;
        mascotGroup.rotation.z = Math.sin(elapsedTime * 1.5) * 0.05;

        // Rotate the star accessory
        starDecoration.rotation.y += 0.035;
        starDecoration.position.y = 1.8 + Math.sin(elapsedTime * 3.5) * 0.08;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer to handle responsive layout cleanly
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const newWidth = entry.contentRect.width || 250;
        const newHeight = entry.contentRect.height || 220;
        renderer.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(container);

    // Cleanup listeners and renderer
    return () => {
      cancelAnimationFrame(reqId);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', triggerJump);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[180px] sm:h-[220px] flex items-center justify-center cursor-pointer group" id="mascot-3d-canvas-wrapper">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[120px] h-[120px] rounded-full bg-indigo-500/5 filter blur-xl group-hover:bg-indigo-500/10 transition-colors duration-300" />
      </div>
      <div ref={containerRef} className="w-full h-full relative z-10" />
      <span className="absolute bottom-2 px-3 py-1 bg-indigo-650/90 text-white rounded-full text-[8px] font-black shadow-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest">
        <span>🖱️</span> เคาะปุ่มหรือเลื่อนเมาส์เล่นได้เลย!
      </span>
    </div>
  );
}
