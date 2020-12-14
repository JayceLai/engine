import { IVec3Like, Node, Vec3 } from '../../core';
import { TransformBit } from '../../core/scene-graph/node-enum';
import { PhysicsSystem, RigidBody } from '../framework';
import { IRigidBody } from '../spec/i-rigid-body';
import { applyForce, applyImpulse, applyTorqueForce, PX, USE_BYTEDANCE, _trans } from './export-physx';
import { PhysXSharedBody } from './physx-shared-body';
import { PhysXWorld } from './physx-world';

const v30 = new Vec3();

export class PhysXRigidBody implements IRigidBody {
    get impl (): any { return this._sharedBody.impl; }

    get isAwake (): boolean { return !this.impl.isSleeping(); }
    isSleepy = false;
    get isSleeping (): boolean { return this.impl.isSleeping(); }

    get isEnabled (): boolean { return this._isEnabled; }
    get rigidBody (): RigidBody { return this._rigidBody; }
    get sharedBody (): PhysXSharedBody { return this._sharedBody; }

    private _isEnabled = false;
    private _rigidBody!: RigidBody;
    private _sharedBody!: PhysXSharedBody;

    initialize (v: RigidBody): void {
        this._rigidBody = v;
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as PhysXWorld).getSharedBody(v.node, this);
        this._sharedBody.reference = true;
    }

    onLoad (): void {
    }

    onEnable (): void {
        this._isEnabled = true;
        this.setGroup(this._rigidBody.group);
        if (PhysicsSystem.instance.useCollisionMatrix) {
            this.setMask(PhysicsSystem.instance.collisionMatrix[this._rigidBody.group]);
        }
        this._sharedBody.enabled = true;
    }

    onDisable (): void {
        this._isEnabled = false;
        this._sharedBody.enabled = false;
    }

    onDestroy (): void {
        this._sharedBody.reference = false;
        (this._rigidBody as any) = null;
        (this._sharedBody as any) = null;
    }

    setMass (v: number): void {
        this._sharedBody.setMass(v);
    }

    setLinearDamping (v: number): void {
        this.impl.setLinearDamping(v);
    }

    setAngularDamping (v: number): void {
        this.impl.setAngularDamping(v);
    }

    setIsKinematic (v: boolean): void {
        if (this._sharedBody.isStatic) return;
        this._sharedBody.setRigidBodyFlag(PX.RigidBodyFlag.eKINEMATIC, v);
    }

    useGravity (v: boolean): void {
        if (this._sharedBody.isStatic) return;
        this.impl.setActorFlag(PX.ActorFlag.eDISABLE_GRAVITY, !v);
    }

    useCCD (v: boolean): void {
        if (this._sharedBody.isStatic) return;
        this.impl.setRigidBodyFlag(PX.RigidBodyFlag.eENABLE_CCD, v);
    }

    fixRotation (v: boolean): void {
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_X, !!v);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Y, !!v);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Z, !!v);
        if (!v) { this.setAngularFactor(this._rigidBody.angularFactor); }
    }

    setLinearFactor (v: IVec3Like): void {
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_X, !v.x);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_Y, !v.y);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_LINEAR_Z, !v.z);
    }

    setAngularFactor (v: IVec3Like): void {
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_X, !v.x);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Y, !v.y);
        this.impl.setRigidDynamicLockFlag(PX.RigidDynamicLockFlag.eLOCK_ANGULAR_Z, !v.z);
    }

    setAllowSleep (v: boolean): void {
        const st = this.impl.getSleepThreshold();
        const wc = v ? Math.max(0.0, st - 0.1) : st + 1;
        this.impl.setWakeCounter(wc);
    }

    wakeUp (): void {
        this.impl.wakeUp();
    }

    sleep (): void {
        this.impl.putToSleep();
    }

    clearState (): void {
        this.clearForces();
        this.clearVelocity();
    }

    clearForces (): void {
        this._sharedBody.clearForces();
    }

    clearVelocity (): void {
        this._sharedBody.clearVelocity();
    }

    setSleepThreshold (v: number): void {
        this.impl.setSleepThreshold(v);
    }

    getSleepThreshold (): number {
        return this.impl.getSleepThreshold();
    }

    getLinearVelocity (out: IVec3Like): void {
        Vec3.copy(out, this.impl.getLinearVelocity());
    }

    setLinearVelocity (value: IVec3Like): void {
        this.impl.setLinearVelocity(value, true);
    }

    getAngularVelocity (out: IVec3Like): void {
        Vec3.copy(out, this.impl.getAngularVelocity());
    }

    setAngularVelocity (value: IVec3Like): void {
        this.impl.setAngularVelocity(value, true);
    }

    applyForce (force: IVec3Like, relativePoint?: IVec3Like): void {
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyForce(true, this.impl, force, rp);
    }

    applyLocalForce (force: IVec3Like, relativePoint?: IVec3Like): void {
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyForce(false, this.impl, force, rp);
    }

    applyImpulse (force: IVec3Like, relativePoint?: IVec3Like): void {
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyImpulse(true, this.impl, force, rp);
    }

    applyLocalImpulse (force: IVec3Like, relativePoint?: IVec3Like): void {
        this._sharedBody.syncSceneToPhysics();
        const rp = relativePoint || Vec3.ZERO;
        applyImpulse(false, this.impl, force, rp);
    }

    applyTorque (torque: IVec3Like): void {
        applyTorqueForce(this.impl, torque);
    }

    applyLocalTorque (torque: IVec3Like): void {
        this._sharedBody.syncSceneToPhysics();
        Vec3.transformQuat(v30, torque, this._sharedBody.node.worldRotation);
        applyTorqueForce(this.impl, v30);
    }

    setGroup (v: number): void {
        this._sharedBody.setGroup(v);
    }

    getGroup (): number {
        return this._sharedBody.getGroup();
    }

    addGroup (v: number): void {
        this._sharedBody.addGroup(v);
    }

    removeGroup (v: number): void {
        this._sharedBody.removeGroup(v);
    }

    setMask (v: number): void {
        this._sharedBody.setMask(v);
    }

    getMask (): number {
        return this._sharedBody.getMask();
    }

    addMask (v: number): void {
        this._sharedBody.addMask(v);
    }

    removeMask (v: number): void {
        this._sharedBody.removeMask(v);
    }
}
