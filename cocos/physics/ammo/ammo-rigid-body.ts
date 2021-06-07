/*
 Copyright (c) 2020 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/**
 * @packageDocumentation
 * @hidden
 */

// import Ammo from './ammo-instantiated';
import { Vec3, Node } from '../../core';
import { AmmoWorld } from './ammo-world';
import { cocos2BulletVec3, bullet2CocosVec3 } from './ammo-util';
import { RigidBody, PhysicsSystem } from '../../../exports/physics-framework';
import { AmmoCollisionFlags, AmmoRigidBodyFlags, AmmoCollisionObjectStates, EAmmoSharedBodyDirty } from './ammo-enum';
import { IRigidBody } from '../spec/i-rigid-body';
import { ERigidBodyType } from '../framework/physics-enum';
import { AmmoSharedBody } from './ammo-shared-body';
import { IVec3Like } from '../../core/math/type-define';
import { AmmoConstant, CC_V3_0, CC_V3_1 } from './ammo-const';
import { bt } from './export-bullet';

const v3_0 = CC_V3_0;
const v3_1 = CC_V3_1;

export class AmmoRigidBody implements IRigidBody {
    get isAwake (): boolean {
        const state = bt.CollisionObject_getActivationState(this.impl);
        return state === AmmoCollisionObjectStates.ACTIVE_TAG
            || state === AmmoCollisionObjectStates.DISABLE_DEACTIVATION;
    }

    get isSleepy (): boolean {
        const state = bt.CollisionObject_getActivationState(this.impl);
        return state === AmmoCollisionObjectStates.WANTS_DEACTIVATION;
    }

    get isSleeping (): boolean {
        const state = bt.CollisionObject_getActivationState(this.impl);
        return state === AmmoCollisionObjectStates.ISLAND_SLEEPING;
    }

    setMass (value: number) {
        if (!this._rigidBody.isDynamic) return;
        // See https://studiofreya.com/game-maker/bullet-physics/bullet-physics-how-to-change-body-mass/
        const localInertia = AmmoConstant.instance.VECTOR3_0;
        bt.Vector3_setValue(localInertia, 1.6666666269302368, 1.6666666269302368, 1.6666666269302368);
        const shape = bt.CollisionObject_getCollisionShape(this.impl);
        if (bt.CollisionShape_isCompound(shape)) {
            if (bt.CompoundShape_getNumChildShapes(this._sharedBody.bodyCompoundShape) > 0) {
                bt.CollisionShape_calculateLocalInertia(shape, this._rigidBody.mass, localInertia);
            }
        } else {
            bt.CollisionShape_calculateLocalInertia(shape, this._rigidBody.mass, localInertia);
        }
        bt.RigidBody_setMassProps(this.impl, value, localInertia);
        this._wakeUpIfSleep();
        this._sharedBody.dirty |= EAmmoSharedBodyDirty.BODY_RE_ADD;
    }

    setType (v: ERigidBodyType) {
        this._sharedBody.setType(v);
    }

    setLinearDamping (value: number) {
        bt.RigidBody_setDamping(this.impl, this._rigidBody.linearDamping, this._rigidBody.angularDamping);
    }

    setAngularDamping (value: number) {
        bt.RigidBody_setDamping(this.impl, this._rigidBody.linearDamping, this._rigidBody.angularDamping);
    }

    useGravity (value: boolean) {
        if (!this._rigidBody.isDynamic) return;
        let m_rigidBodyFlag = bt.RigidBody_getFlags(this.impl);
        if (value) {
            m_rigidBodyFlag &= (~AmmoRigidBodyFlags.BT_DISABLE_WORLD_GRAVITY);
        } else {
            bt.RigidBody_setGravity(this.impl, cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, Vec3.ZERO));
            m_rigidBodyFlag |= AmmoRigidBodyFlags.BT_DISABLE_WORLD_GRAVITY;
        }
        bt.RigidBody_setFlags(this.impl, m_rigidBodyFlag);
        this._wakeUpIfSleep();
        this._sharedBody.dirty |= EAmmoSharedBodyDirty.BODY_RE_ADD;
    }

    setLinearFactor (value: IVec3Like) {
        bt.RigidBody_setLinearFactor(this.impl, cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, value));
        this._wakeUpIfSleep();
    }

    setAngularFactor (value: IVec3Like) {
        bt.RigidBody_setAngularFactor(this.impl, cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, value));
        this._wakeUpIfSleep();
    }

    setAllowSleep (v: boolean) {
        if (!this._rigidBody.isDynamic) return;
        if (v) {
            bt.CollisionObject_forceActivationState(this.impl, AmmoCollisionObjectStates.ACTIVE_TAG);
        } else {
            bt.CollisionObject_forceActivationState(this.impl, AmmoCollisionObjectStates.DISABLE_DEACTIVATION);
        }
        this._wakeUpIfSleep();
    }

    get isEnabled () { return this._isEnabled; }
    get impl () { return this._sharedBody.body; }
    get rigidBody () { return this._rigidBody; }
    get sharedBody () { return this._sharedBody; }

    private static idCounter = 0;
    readonly id: number;

    private _isEnabled = false;
    private _sharedBody!: AmmoSharedBody;
    private _rigidBody!: RigidBody;

    constructor () {
        this.id = AmmoRigidBody.idCounter++;
    }

    clearState (): void {
        bt.RigidBody_clearState(this.impl);
    }

    clearVelocity (): void {
        this.setLinearVelocity(Vec3.ZERO);
        this.setAngularVelocity(Vec3.ZERO);
    }

    clearForces (): void {
        bt.RigidBody_clearForces(this.impl);
    }

    /** LIFECYCLE */

    initialize (com: RigidBody) {
        this._rigidBody = com;
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as AmmoWorld).getSharedBody(this._rigidBody.node, this);
        this._sharedBody.reference = true;
    }

    onEnable () {
        this._isEnabled = true;
        this.setMass(this._rigidBody.mass);
        this.setAllowSleep(this._rigidBody.allowSleep);
        this.setLinearDamping(this._rigidBody.linearDamping);
        this.setAngularDamping(this._rigidBody.angularDamping);
        this.setLinearFactor(this._rigidBody.linearFactor);
        this.setAngularFactor(this._rigidBody.angularFactor);
        this.useGravity(this._rigidBody.useGravity);
        this._sharedBody.bodyEnabled = true;
    }

    onDisable () {
        this._isEnabled = false;
        this._sharedBody.bodyEnabled = false;
    }

    onDestroy () {
        this._sharedBody.reference = false;
        (this._rigidBody as any) = null;
        (this._sharedBody as any) = null;
    }

    /** INTERFACE */

    wakeUp (force = true): void {
        bt.CollisionObject_activate(this.impl, force);
    }

    sleep (): any {
        return bt.RigidBody_wantsSleeping(this.impl);
    }

    setSleepThreshold (v: number): void {
        this._wakeUpIfSleep();
        bt.RigidBody_setSleepingThresholds(this.impl, v, v);
    }

    getSleepThreshold (): number {
        return bt.RigidBody_getLinearSleepingThreshold(this.impl);
    }

    getLinearVelocity (out: Vec3): Vec3 {
        return bullet2CocosVec3(out, bt.RigidBody_getLinearVelocity(this.impl));
    }

    setLinearVelocity (value: Vec3): void {
        this._wakeUpIfSleep();
        cocos2BulletVec3(bt.RigidBody_getLinearVelocity(this.impl), value);
    }

    getAngularVelocity (out: Vec3): Vec3 {
        return bullet2CocosVec3(out, bt.RigidBody_getAngularVelocity(this.impl));
    }

    setAngularVelocity (value: Vec3): void {
        this._wakeUpIfSleep();
        cocos2BulletVec3(bt.RigidBody_getAngularVelocity(this.impl), value);
    }

    applyLocalForce (force: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const quat = this._sharedBody.node.worldRotation;
        const v = Vec3.transformQuat(v3_0, force, quat);
        const rp = rel_pos ? Vec3.transformQuat(v3_1, rel_pos, quat) : Vec3.ZERO;
        bt.RigidBody_applyForce(
            this.impl,
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, v),
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_1, rp),
        );
    }

    applyLocalTorque (torque: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        Vec3.transformQuat(v3_0, torque, this._sharedBody.node.worldRotation);
        bt.RigidBody_applyTorque(
            this.impl,
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, v3_0),
        );
    }

    applyLocalImpulse (impulse: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const quat = this._sharedBody.node.worldRotation;
        const v = Vec3.transformQuat(v3_0, impulse, quat);
        const rp = rel_pos ? Vec3.transformQuat(v3_1, rel_pos, quat) : Vec3.ZERO;
        bt.RigidBody_applyImpulse(
            this.impl,
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, v),
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_1, rp),
        );
    }

    applyForce (force: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const rp = rel_pos || Vec3.ZERO;
        bt.RigidBody_applyForce(
            this.impl,
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, force),
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_1, rp),
        );
    }

    applyTorque (torque: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        bt.RigidBody_applyTorque(
            this.impl,
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, torque),
        );
    }

    applyImpulse (impulse: Vec3, rel_pos?: Vec3): void {
        this._sharedBody.syncSceneToPhysics();
        this._wakeUpIfSleep();
        const rp = rel_pos || Vec3.ZERO;
        bt.RigidBody_applyImpulse(
            this.impl,
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_0, impulse),
            cocos2BulletVec3(AmmoConstant.instance.VECTOR3_1, rp),
        );
    }

    getGroup (): number {
        return this._sharedBody.collisionFilterGroup;
    }

    setGroup (v: number): void {
        this._sharedBody.collisionFilterGroup = v;
    }

    addGroup (v: number): void {
        this._sharedBody.collisionFilterGroup |= v;
    }

    removeGroup (v: number): void {
        this._sharedBody.collisionFilterGroup &= ~v;
    }

    getMask (): number {
        return this._sharedBody.collisionFilterMask;
    }

    setMask (v: number): void {
        this._sharedBody.collisionFilterMask = v;
    }

    addMask (v: number): void {
        this._sharedBody.collisionFilterMask |= v;
    }

    removeMask (v: number): void {
        this._sharedBody.collisionFilterMask &= ~v;
    }

    protected _wakeUpIfSleep () {
        if (!this.isAwake) { bt.CollisionObject_activate(this.impl, true); }
    }
}
