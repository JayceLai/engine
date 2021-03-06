import CANNON from '@cocos/cannon';
import { Vec3 } from '../../core/math';
import { IRigidBody } from '../spec/i-rigid-body';
import { CannonSharedBody } from './cannon-shared-body';
import { Node } from '../../core';
import { CannonWorld } from './cannon-world';
import { PhysicsSystem } from '../framework/physics-system';
import { RigidBodyComponent } from '../framework';
import { IVec3Like } from '../../core/math/type-define';

const v3_cannon0 = new CANNON.Vec3();
const v3_cannon1 = new CANNON.Vec3();

/**
 * wrapped shared body
 * dynamic
 * kinematic
 */
export class CannonRigidBody implements IRigidBody {

    get isAwake (): boolean {
        return this.impl.isAwake();
    }

    get isSleepy (): boolean {
        return this.impl.isSleepy();
    }

    get isSleeping (): boolean {
        return this.impl.isSleeping();
    }

    setAllowSleep (v: boolean) {
        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }
        this.impl.allowSleep = v;
    }

    setMass (value: number) {
        this.impl.mass = value;
        if (this.impl.mass == 0) {
            this.impl.type = CANNON.Body.STATIC;
        } else {
            this.impl.type = this._rigidBody.isKinematic ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC;
        }

        this.impl.updateMassProperties();

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }
    }

    setIsKinematic (value: boolean) {
        if (this.impl.mass == 0) {
            this.impl.type = CANNON.Body.STATIC;
        } else {
            if (value) {
                this.impl.type = CANNON.Body.KINEMATIC;
            } else {
                this.impl.type = CANNON.Body.DYNAMIC;
            }
        }
    }

    fixRotation (value: boolean) {

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        this.impl.fixedRotation = value;
        this.impl.updateMassProperties();
    }

    setLinearDamping (value: number) {
        this.impl.linearDamping = value;
    }

    setAngularDamping (value: number) {
        this.impl.angularDamping = value;
    }

    useGravity (value: boolean) {

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        this.impl.useGravity = value;
    }

    setLinearFactor (value: IVec3Like) {

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        Vec3.copy(this.impl.linearFactor, value);
    }

    setAngularFactor (value: IVec3Like) {

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        Vec3.copy(this.impl.angularFactor, value);
    }

    get impl () {
        return this._sharedBody.body;
    }

    get rigidBody () {
        return this._rigidBody;
    }

    get sharedBody () {
        return this._sharedBody;
    }

    get isEnabled () {
        return this._isEnabled;
    }

    private _rigidBody!: RigidBodyComponent;
    private _sharedBody!: CannonSharedBody;


    private _isEnabled = false;

    /** LIFECYCLE */

    initialize (com: RigidBodyComponent) {
        this._rigidBody = com;
        this._sharedBody = (PhysicsSystem.instance.physicsWorld as CannonWorld).getSharedBody(this._rigidBody.node as Node);
        this._sharedBody.reference = true;
        this._sharedBody.wrappedBody = this;
    }

    onLoad () {
    }

    onEnable () {
        this._isEnabled = true;
        this.setMass(this._rigidBody.mass);
        this.setAllowSleep(this._rigidBody.allowSleep);
        this.setLinearDamping(this._rigidBody.linearDamping);
        this.setAngularDamping(this._rigidBody.angularDamping);
        this.useGravity(this._rigidBody.useGravity);
        this.setIsKinematic(this._rigidBody.isKinematic);
        this.fixRotation(this._rigidBody.fixedRotation);
        this.setLinearFactor(this._rigidBody.linearFactor);
        this.setAngularFactor(this._rigidBody.angularFactor);
        this._sharedBody.enabled = true;
    }

    onDisable () {
        this._isEnabled = false;
        this._sharedBody.enabled = false;
    }

    onDestroy () {
        this._sharedBody.reference = false;
        (this._rigidBody as any) = null;
        (this._sharedBody as any) = null;
    }

    /** INTERFACE */

    clearVelocity (): void {
        this.impl.velocity.setZero();
        this.impl.angularVelocity.setZero();
    }

    clearForces (): void {
        this.impl.force.setZero();
        this.impl.torque.setZero();
    }

    clearState (): void {
        this.clearVelocity();
        this.clearForces();
    }

    wakeUp (): void {
        return this.impl.wakeUp();
    }

    sleep (): void {
        return this.impl.sleep();
    }

    getLinearVelocity (out: Vec3): Vec3 {
        Vec3.copy(out, this.impl.velocity);
        return out;
    }

    setLinearVelocity (value: Vec3): void {

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        Vec3.copy(this.impl.velocity, value);
    }

    getAngularVelocity (out: Vec3): Vec3 {
        Vec3.copy(out, this.impl.angularVelocity);
        return out;
    }

    setAngularVelocity (value: Vec3): void {

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        Vec3.copy(this.impl.angularVelocity, value);
    }

    applyForce (force: Vec3, worldPoint?: Vec3) {
        if (worldPoint == null) {
            worldPoint = Vec3.ZERO;
        }

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        this.impl.applyForce(Vec3.copy(v3_cannon0, force), Vec3.copy(v3_cannon1, worldPoint));
    }

    applyImpulse (impulse: Vec3, worldPoint?: Vec3) {
        if (worldPoint == null) {
            worldPoint = Vec3.ZERO;
        }

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        this.impl.applyImpulse(Vec3.copy(v3_cannon0, impulse), Vec3.copy(v3_cannon1, worldPoint));
    }

    applyLocalForce (force: Vec3, localPoint?: Vec3): void {
        if (localPoint == null) {
            localPoint = Vec3.ZERO;
        }

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        this.impl.applyLocalForce(Vec3.copy(v3_cannon0, force), Vec3.copy(v3_cannon1, localPoint));
    }

    applyLocalImpulse (impulse: Vec3, localPoint?: Vec3): void {
        if (localPoint == null) {
            localPoint = Vec3.ZERO;
        }

        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }

        this.impl.applyLocalImpulse(Vec3.copy(v3_cannon0, impulse), Vec3.copy(v3_cannon1, localPoint));
    }

    applyTorque (torque: Vec3): void {
        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }
        this.impl.torque.x += torque.x;
        this.impl.torque.y += torque.y;
        this.impl.torque.z += torque.z;
    }

    applyLocalTorque (torque: Vec3): void {
        if (this.impl.isSleeping()) {
            this.impl.wakeUp();
        }
        Vec3.copy(v3_cannon0, torque);
        this.impl.vectorToWorldFrame(v3_cannon0, v3_cannon0);
        this.impl.torque.x += v3_cannon0.x;
        this.impl.torque.y += v3_cannon0.y;
        this.impl.torque.z += v3_cannon0.z;
    }

    /** group */
    getGroup (): number {
        return this.impl.collisionFilterGroup;
    }

    setGroup (v: number): void {
        this.impl.collisionFilterGroup = v;
    }

    addGroup (v: number): void {
        this.impl.collisionFilterGroup |= v;
    }

    removeGroup (v: number): void {
        this.impl.collisionFilterGroup &= ~v;
    }

    /** mask */
    getMask (): number {
        return this.impl.collisionFilterMask;
    }

    setMask (v: number): void {
        this.impl.collisionFilterMask = v;
    }

    addMask (v: number): void {
        this.impl.collisionFilterMask |= v;
    }

    removeMask (v: number): void {
        this.impl.collisionFilterMask &= ~v;
    }

}