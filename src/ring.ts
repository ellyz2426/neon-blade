import { Mesh, Group, MeshStandardMaterial, CylinderGeometry, TorusGeometry, BoxGeometry, EdgesGeometry, LineSegments, LineBasicMaterial, Vector3, Color } from '@iwsdk/core';

export function createRing() {
  const group = new Group();

  // Floor
  const floorMat = new MeshStandardMaterial({
    color: 0x0a0a1a,
    emissive: 0x001133,
    emissiveIntensity: 0.3,
    roughness: 0.8,
  });
  const floor = new Mesh(new BoxGeometry(6, 0.1, 6), floorMat);
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  group.add(floor);

  // Grid lines
  const gridMat = new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
  for (let i = -3; i <= 3; i++) {
    const geo = new EdgesGeometry(new BoxGeometry(6, 0.01, 0.01));
    const line = new LineSegments(geo, gridMat);
    line.position.set(0, 0.01, i);
    group.add(line);
    const line2 = new LineSegments(new EdgesGeometry(new BoxGeometry(0.01, 0.01, 6)), gridMat);
    line2.position.set(i, 0.01, 0);
    group.add(line2);
  }

  // Ring posts
  const postMat = new MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8 });
  const postGeo = new CylinderGeometry(0.05, 0.05, 1.5, 8);
  const positions = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]];
  positions.forEach(([x, z]) => {
    const post = new Mesh(postGeo, postMat);
    post.position.set(x, 0.75, z);
    group.add(post);
    
    // Top ring
    const ring = new Mesh(new TorusGeometry(0.08, 0.02, 8, 16), postMat);
    ring.position.set(x, 1.4, z);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  });

  // Ropes
  const ropeMat = new MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6 });
  for (let h of [0.6, 1.0, 1.4]) {
    const points = [
      new Vector3(-1.5, h, -1.5),
      new Vector3(1.5, h, -1.5),
      new Vector3(1.5, h, 1.5),
      new Vector3(-1.5, h, 1.5),
      new Vector3(-1.5, h, -1.5),
    ];
    for (let i = 0; i < 4; i++) {
      const rope = new Mesh(new CylinderGeometry(0.02, 0.02, points[i].distanceTo(points[i+1]), 6), ropeMat);
      rope.position.copy(points[i]).lerp(points[i+1], 0.5);
      rope.lookAt(points[i+1]);
      rope.rotateX(Math.PI/2);
      group.add(rope);
    }
  }

  // Center circle
  const center = new Mesh(new TorusGeometry(0.3, 0.01, 8, 32), postMat);
  center.position.y = 0.011;
  center.rotation.x = Math.PI/2;
  group.add(center);

  return group;
}
