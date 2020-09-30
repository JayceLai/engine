
import { select } from '../framework/physics-selector';

import { PhysXWorld } from './physx-world';
import { PhysXRigidBody } from './physx-rigid-body';

import { PhysXSphereShape } from './shapes/physx-sphere-shape';
import { PhysXBoxShape } from './shapes/physx-box-shape';
import { PhysXCapsuleShape } from './shapes/physx-capsule-shape';
import { PhysXPlaneShape } from './shapes/physx-plane-shape';

select('physx', {
    PhysicsWorld: PhysXWorld,
    RigidBody: PhysXRigidBody,

    BoxShape: PhysXBoxShape,
    SphereShape: PhysXSphereShape,
    CapsuleShape: PhysXCapsuleShape,
    // TrimeshShape: PhysXTrimeshShape,
    // CylinderShape: PhysXCylinderShape,
    // ConeShape: PhysXConeShape,
    // TerrainShape: PhysXTerrainShape,
    // SimplexShape: PhysXSimplexShape,
    PlaneShape: PhysXPlaneShape,

    // PointToPointConstraint: PhysXPointToPointConstraint,
    // HingeConstraint: PhysXHingeConstraint,
});

