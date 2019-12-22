/**
 * @hidden
 */

// Cannon
import { CannonRigidBody } from '../cannon/cannon-rigid-body';
import { CannonWorld } from '../cannon/cannon-world';
import { CannonBoxShape } from '../cannon/shapes/cannon-box-shape';
import { CannonSphereShape } from '../cannon/shapes/cannon-sphere-shape';
import { CannonCapsuleShape } from '../cannon/shapes/cannon-capsule-shape';

// built-in
import { BuiltInWorld } from '../cocos/builtin-world';
import { BuiltinBoxShape } from '../cocos/shapes/builtin-box-shape';
import { BuiltinSphereShape } from '../cocos/shapes/builtin-sphere-shape';
import { BuiltinCapsuleShape } from '../cocos/shapes/builtin-capsule-shape';

export let BoxShape: typeof CannonBoxShape | typeof BuiltinBoxShape;
export let SphereShape: typeof CannonSphereShape | typeof BuiltinSphereShape;
export let RigidBody: typeof CannonRigidBody | null;
export let PhysicsWorld: typeof CannonWorld | typeof BuiltInWorld;
export let CapsuleShape: typeof CannonCapsuleShape | typeof BuiltinCapsuleShape;

export function instantiate (
    boxShape: typeof BoxShape,
    sphereShape: typeof SphereShape,
    body: typeof RigidBody,
    world: typeof PhysicsWorld,
    capsuleShape: typeof CapsuleShape
) {
    BoxShape = boxShape;
    SphereShape = sphereShape;
    RigidBody = body;
    PhysicsWorld = world;
    CapsuleShape = capsuleShape;
}
