/**
 * @category physics
 */

import { Vec3 } from '../../core/math';
import { IPhysicsWorld, IRaycastOptions } from '../spec/i-physics-world';
import { createPhysicsWorld, checkPhysicsModule } from './instance';
import { director, Director } from '../../core/director';
import { System } from '../../core/components';
import { PhysicMaterial } from './assets/physic-material';
import { Layers, RecyclePool } from '../../core';
import { ray } from '../../core/geometry';
import { PhysicsRayResult } from './physics-ray-result';
import { EDITOR, PHYSICS_BUILTIN, DEBUG, PHYSICS_CANNON, PHYSICS_AMMO } from 'internal:constants';

/**
 * @zh
 * 物理系统。
 */
export class PhysicsSystem extends System {

    /**
     * @zh
     * 获取或设置是否启用物理系统，可以用于暂停或继续运行物理系统。
     */
    get enable (): boolean {
        return this._enable;
    }
    set enable (value: boolean) {
        this._enable = value;
    }

    /**
     * @zh
     * 获取或设置物理系统是否允许自动休眠，默认为 true
     */
    get allowSleep (): boolean {
        return this._allowSleep;
    }
    set allowSleep (v: boolean) {
        this._allowSleep = v;
        this.physicsWorld.setAllowSleep(v);
    }

    /**
     * @zh
     * 获取或设置每帧模拟的最大子步数。
     */
    get maxSubStep () {
        return this._maxSubStep;
    }

    set maxSubStep (value: number) {
        this._maxSubStep = value;
    }

    /**
     * @zh
     * 获取或设置每步模拟消耗的固定时间。
     */
    get deltaTime () {
        return this._deltaTime;
    }

    set deltaTime (value: number) {
        this._deltaTime = value;
    }

    /**
     * @zh
     * 获取或设置是否使用固定的时间步长进行模拟，默认为 true。
     */
    get useFixedTime () {
        return this._useFixedTime;
    }

    set useFixedTime (value: boolean) {
        this._useFixedTime = value;
    }

    /**
     * @zh
     * 获取或设置物理世界的重力数值，默认为 (0, -10, 0)。
     */
    get gravity (): Vec3 {
        return this._gravity;
    }
    set gravity (gravity: Vec3) {
        this._gravity.set(gravity);
        this.physicsWorld.setGravity(gravity);
    }

    /**
     * @zh
     * 获取全局的默认物理材质。
     */
    get defaultMaterial (): PhysicMaterial{
        return this._material;
    }

    private static readonly _instance: PhysicsSystem;
    static get instance () {
        if (DEBUG && checkPhysicsModule(PhysicsSystem._instance)) { return null as any; }
        return PhysicsSystem._instance;
    }

    static readonly ID: 'physics';

    readonly physicsWorld: IPhysicsWorld;
    readonly raycastClosestResult = new PhysicsRayResult();
    readonly raycastResults: PhysicsRayResult[] = [];

    private _enable = true;
    private _allowSleep = true;
    private _maxSubStep = 1;
    private _deltaTime = 1.0 / 60.0;
    private _useFixedTime = true;
    private readonly _gravity = new Vec3(0, -10, 0);
    private readonly _material: PhysicMaterial;

    private readonly raycastOptions: IRaycastOptions = {
        'group': -1,
        'mask': -1,
        'queryTrigger': true,
        'maxDistance': 10000000
    }

    private readonly raycastResultPool = new RecyclePool<PhysicsRayResult>(() => {
        return new PhysicsRayResult();
    }, 1);

    private constructor () {
        super();
        this.physicsWorld = createPhysicsWorld();
        this.gravity = this._gravity;
        this.allowSleep = this._allowSleep;
        this._material = new PhysicMaterial();
        this._material.friction = 0.5;
        this._material.restitution = 0.0;
        this._material.on('physics_material_update', this._updateMaterial, this);
        this.physicsWorld.setDefaultMaterial(this._material);
    }

    /**
     * @zh
     * 执行一次物理系统的模拟，目前将在每帧自动执行一次。
     * @param deltaTime 与上一次执行相差的时间，目前为每帧消耗时间
     */
    postUpdate (deltaTime: number) {
        if (EDITOR && !this._executeInEditMode) {
            return;
        }
        if (!this._enable) {
            return;
        }

        director.emit(Director.EVENT_BEFORE_PHYSICS);

        if (this._useFixedTime) {
            this.physicsWorld.step(this._deltaTime);
        } else {
            this.physicsWorld.step(this._deltaTime, deltaTime, this._maxSubStep);
        }
        // if (this._singleStep) {
        //     this._enable = false;
        // }

        director.emit(Director.EVENT_AFTER_PHYSICS);
    }

    /**
     * @zh
     * 检测所有的碰撞盒，并记录所有被检测到的结果，通过 PhysicsSystem.instance.raycastResults 访问结果
     * @param worldRay 世界空间下的一条射线
     * @param mask 掩码，默认为 0xffffffff
     * @param maxDistance 最大检测距离，默认为 10000000，目前请勿传入 Infinity 或 Number.MAX_VALUE
     * @param queryTrigger 是否检测触发器
     * @return boolean 表示是否有检测到碰撞盒
     */
    raycast (worldRay: ray, mask: number = 0xffffffff, maxDistance = 10000000, queryTrigger = true): boolean {
        this.raycastResultPool.reset();
        this.raycastResults.length = 0;
        this.raycastOptions.mask = mask;
        this.raycastOptions.maxDistance = maxDistance;
        this.raycastOptions.queryTrigger = queryTrigger;
        return this.physicsWorld.raycast(worldRay, this.raycastOptions, this.raycastResultPool, this.raycastResults);
    }

    /**
     * @zh
     * 检测所有的碰撞盒，并记录与射线距离最短的检测结果，通过 PhysicsSystem.instance.raycastClosestResult 访问结果
     * @param worldRay 世界空间下的一条射线
     * @param mask 掩码，默认为 0xffffffff
     * @param maxDistance 最大检测距离，默认为 10000000，目前请勿传入 Infinity 或 Number.MAX_VALUE
     * @param queryTrigger 是否检测触发器
     * @return boolean 表示是否有检测到碰撞盒
     */
    raycastClosest (worldRay: ray, mask: number = 0xffffffff, maxDistance = 10000000, queryTrigger = true): boolean {
        this.raycastOptions.mask = mask;
        this.raycastOptions.maxDistance = maxDistance;
        this.raycastOptions.queryTrigger = queryTrigger;
        return this.physicsWorld.raycastClosest(worldRay, this.raycastOptions, this.raycastClosestResult);
    }

    private _updateMaterial () {
        this.physicsWorld.setDefaultMaterial(this._material);
    }
}

// if (PHYSICS_BUILTIN || PHYSICS_CANNON || PHYSICS_AMMO) {
director.on(Director.EVENT_INIT, function () {
    const sys = new cc.PhysicsSystem();
    cc.PhysicsSystem._instance = sys;
    director.registerSystem(PhysicsSystem.ID, sys, 0);
});
// }
