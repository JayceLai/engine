import { absMax, Quat, IVec3Like } from '../../../core';
import { aabb, sphere } from '../../../core/geometry';
import { Collider, RigidBody, PhysicMaterial, CapsuleCollider, EAxisDirection } from '../../framework';
import { ICapsuleShape } from '../../spec/i-physics-shape';
import { PX, USE_BYTEDANCE } from '../export-physx';
import { EPhysXShapeType, PhysXShape } from './physx-shape';

export class PhysXCapsuleShape extends PhysXShape implements ICapsuleShape {
    static CAPSULE_GEOMETRY;

    constructor () {
        super(EPhysXShapeType.CAPSULE);
        if (!PhysXCapsuleShape.CAPSULE_GEOMETRY) {
            if (USE_BYTEDANCE) {
                PhysXCapsuleShape.CAPSULE_GEOMETRY = new PX.CapsuleGeometry(0.5, 0.5);
            } else {
                PhysXCapsuleShape.CAPSULE_GEOMETRY = new PX.PxCapsuleGeometry(0.5, 0.5);
            }
        }
    }

    setCylinderHeight (v: number): void {
        this.updateScale();
    }

    setDirection (v: number): void {
        this.updateScale();
    }

    setRadius (v: number): void {
        this.updateScale();
    }

    get collider () {
        return this._collider as CapsuleCollider;
    }

    onComponentSet () {
        this.updateGeometry();
        const physics = this._sharedBody.wrappedWorld.physics;
        const pxmat = this.getSharedMaterial(this._collider.sharedMaterial!);
        this._impl = physics.createShape(PhysXCapsuleShape.CAPSULE_GEOMETRY, pxmat, true, this._flags);
    }

    updateScale () {
        this.updateGeometry();
        this._impl.setGeometry(PhysXCapsuleShape.CAPSULE_GEOMETRY);
        this.setCenter(this._collider.center);
    }

    updateGeometry () {
        const co = this.collider;
        const ws = co.node.worldScale;
        const upAxis = co.direction;
        let r = 0.5; let hf = 0.5;
        if (upAxis == EAxisDirection.Y_AXIS) {
            r = co.radius * Math.abs(absMax(ws.x, ws.z));
            hf = co.cylinderHeight / 2 * Math.abs(ws.y);
            Quat.fromEuler(this._rotation, 0, 0, 90);
        } else if (upAxis == EAxisDirection.X_AXIS) {
            r = co.radius * Math.abs(absMax(ws.y, ws.z));
            hf = co.cylinderHeight / 2 * Math.abs(ws.x);
            Quat.fromEuler(this._rotation, 0, 0, 0);
        } else {
            r = co.radius * Math.abs(absMax(ws.x, ws.y));
            hf = co.cylinderHeight / 2 * Math.abs(ws.z);
            Quat.fromEuler(this._rotation, 0, 90, 0);
        }
        if (USE_BYTEDANCE) {
            PhysXCapsuleShape.CAPSULE_GEOMETRY.setRadius(r);
            PhysXCapsuleShape.CAPSULE_GEOMETRY.setHalfHeight(hf);
        } else {
            PhysXCapsuleShape.CAPSULE_GEOMETRY.radius = r;
            PhysXCapsuleShape.CAPSULE_GEOMETRY.halfHeight = hf;
        }
    }
}
