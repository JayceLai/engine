import { ray } from '../../core/geometry';
import { IPhysicsWorld, IRaycastOptions } from '../spec/i-physics-world';
import { CollisionEventType, PhysicMaterial, PhysicsRayResult, TriggerEventType } from '../framework';
import { Node, RecyclePool } from '../../core';
import { IVec3Like } from '../../core/math/type-define';
import { IBaseConstraint } from '../spec/i-physics-constraint';
import { PhysXSharedBody } from './physx-shared-body';
import { PhysXRigidBody } from './physx-rigid-body';
import { PhysXShape } from './shapes/physx-shape';
import { PhysXContactEquation } from './physx-contact-equation';
import { CollisionEventObject, TriggerEventObject } from '../utils/util';
import { getContactData, getWrapShape, PX, USE_BYTEDANCE } from './export-physx';
import { TupleDictionary } from '../utils/tuple-dictionary';

interface ITriggerEventItem {
    a: PhysXShape,
    b: PhysXShape,
    times: number,
}

interface ICollisionEventItem {
    type: CollisionEventType,
    a: PhysXShape,
    b: PhysXShape,
    contactCount: number,
    buffer: any,
    offset: number,
}

const triggerEventBeginDic = new TupleDictionary();
const triggerEventEndDic = new TupleDictionary();
const triggerEventsPool: ITriggerEventItem[] = [];
function onTrigger (type: TriggerEventType, wpa: PhysXShape, wpb: PhysXShape): void {
    if (wpa && wpb) {
        if (wpa.collider.needTriggerEvent || wpb.collider.needTriggerEvent) {
            let tE: ITriggerEventItem;
            if (triggerEventsPool.length > 0) {
                tE = triggerEventsPool.pop() as ITriggerEventItem;
                tE.a = wpa, tE.b = wpb, tE.times = 0;
            } else {
                tE = { a: wpa, b: wpb, times: 0 };
            }
            if (type === 'onTriggerEnter') {
                triggerEventBeginDic.set(wpa.id, wpb.id, tE);
            } else {
                triggerEventEndDic.set(wpa.id, wpb.id, tE);
            }
        }
    }
}

function emitTriggerEvent () {
    let len = triggerEventEndDic.getLength();
    while (len--) {
        const key = triggerEventEndDic.getKeyByIndex(len);
        const data = triggerEventEndDic.getDataByKey(key) as ITriggerEventItem;
        triggerEventsPool.push(data);
        const dataBeg = triggerEventBeginDic.getDataByKey(key) as ITriggerEventItem;
        if (dataBeg) {
            triggerEventsPool.push(dataBeg);
            triggerEventBeginDic.set(data.a.id, data.b.id, null);
        }
        const colliderA = data.a.collider;
        const colliderB = data.b.collider;
        if (colliderA && colliderB) {
            const type: TriggerEventType = 'onTriggerExit';
            TriggerEventObject.type = type;
            if (colliderA.needTriggerEvent) {
                TriggerEventObject.selfCollider = colliderA;
                TriggerEventObject.otherCollider = colliderB;
                colliderA.emit(type, TriggerEventObject);
            }
            if (colliderB.needTriggerEvent) {
                TriggerEventObject.selfCollider = colliderB;
                TriggerEventObject.otherCollider = colliderA;
                colliderB.emit(type, TriggerEventObject);
            }
        }
    }
    triggerEventEndDic.reset();

    len = triggerEventBeginDic.getLength();
    while (len--) {
        const key = triggerEventBeginDic.getKeyByIndex(len);
        const data = triggerEventBeginDic.getDataByKey(key) as ITriggerEventItem;
        const colliderA = data.a.collider;
        const colliderB = data.b.collider;
        if (!colliderA || !colliderA.isValid || !colliderB || !colliderB.isValid) {
            triggerEventsPool.push(data);
            triggerEventBeginDic.set(data.a.id, data.b.id, null);
        } else {
            const type: TriggerEventType = data.times++ ? 'onTriggerStay' : 'onTriggerEnter';
            TriggerEventObject.type = type;
            if (colliderA.needTriggerEvent) {
                TriggerEventObject.selfCollider = colliderA;
                TriggerEventObject.otherCollider = colliderB;
                colliderA.emit(type, TriggerEventObject);
            }
            if (colliderB.needTriggerEvent) {
                TriggerEventObject.selfCollider = colliderB;
                TriggerEventObject.otherCollider = colliderA;
                colliderB.emit(type, TriggerEventObject);
            }
        }
    }
}

const contactEventDic = new TupleDictionary();
const contactEventsPool: ICollisionEventItem[] = [];
function onCollision (type: CollisionEventType, wpa: PhysXShape, wpb: PhysXShape, c: number, d: any, o: number): void {
    if (wpa && wpb) {
        if (wpa.collider.needCollisionEvent || wpb.collider.needCollisionEvent) {
            if (contactEventsPool.length > 0) {
                const cE = contactEventsPool.pop() as ICollisionEventItem;
                cE.type = type, cE.a = wpa, cE.b = wpb, cE.contactCount = c, cE.buffer = d, cE.offset = o;
                contactEventDic.set(wpa.id, wpb.id, cE);
            } else {
                const cE: ICollisionEventItem = { type, a: wpa, b: wpb, contactCount: c, buffer: d, offset: o };
                contactEventDic.set(wpa.id, wpb.id, cE);
            }
        }
    }
}

const contactsPool: [] = [];
function emitCollisionEvent (): void {
    let len = contactEventDic.getLength();
    while (len--) {
        const key = contactEventDic.getKeyByIndex(len);
        const data = contactEventDic.getDataByKey(key) as ICollisionEventItem;
        contactEventsPool.push(data);
        const colliderA = data.a.collider;
        const colliderB = data.b.collider;
        if (colliderA && colliderA.isValid && colliderB && colliderB.isValid) {
            CollisionEventObject.type = data.type;
            CollisionEventObject.impl = data.buffer;
            const c = data.contactCount, d = data.buffer, o = data.offset;
            const contacts = CollisionEventObject.contacts;
            contactsPool.push.apply(contactsPool, contacts as any);
            contacts.length = 0;
            for (let i = 0; i < c; i++) {
                if (contactsPool.length > 0) {
                    const c = contactsPool.pop() as unknown as PhysXContactEquation;
                    c.colliderA = colliderA; c.colliderB = colliderB;
                    c.impl = getContactData(d, i, o); contacts.push(c);
                } else {
                    const c = new PhysXContactEquation(CollisionEventObject);
                    c.colliderA = colliderA; c.colliderB = colliderB;
                    c.impl = getContactData(d, i, o); contacts.push(c);
                }
            }
            if (colliderA.needCollisionEvent) {
                CollisionEventObject.selfCollider = colliderA;
                CollisionEventObject.otherCollider = colliderB;
                colliderA.emit(CollisionEventObject.type, CollisionEventObject);
            }
            if (colliderB.needCollisionEvent) {
                CollisionEventObject.selfCollider = colliderB;
                CollisionEventObject.otherCollider = colliderA;
                colliderB.emit(CollisionEventObject.type, CollisionEventObject);
            }
        }
    }
    contactEventDic.reset();
}

const eventCallback = {
    onContactBegin: (a: any, b: any, c: any, d: any, o: number): void => {
        const wpa = getWrapShape<PhysXShape>(a);
        const wpb = getWrapShape<PhysXShape>(b);
        onCollision('onCollisionEnter', wpa, wpb, c, d, o);
    },
    onContactEnd: (a: any, b: any, c: any, d: any, o: number): void => {
        const wpa = getWrapShape<PhysXShape>(a);
        const wpb = getWrapShape<PhysXShape>(b);
        onCollision('onCollisionExit', wpa, wpb, c, d, o);
    },
    onContactPersist: (a: any, b: any, c: any, d: any, o: number): void => {
        const wpa = getWrapShape<PhysXShape>(a);
        const wpb = getWrapShape<PhysXShape>(b);
        onCollision('onCollisionStay', wpa, wpb, c, d, o);
    },
    onTriggerBegin: (a: any, b: any): void => {
        const wpa = getWrapShape<PhysXShape>(a);
        const wpb = getWrapShape<PhysXShape>(b);
        onTrigger('onTriggerEnter', wpa, wpb);
    },
    onTriggerEnd: (a: any, b: any): void => {
        const wpa = getWrapShape<PhysXShape>(a);
        const wpb = getWrapShape<PhysXShape>(b);
        onTrigger('onTriggerExit', wpa, wpb);
    },
    // onTriggerPersist: (...a: any) => { console.log('onTriggerPersist', a); },
};

// eNONE = 0,   //!< the query should ignore this shape
// eTOUCH = 1,  //!< a hit on the shape touches the intersection geometry of the query but does not block it
// eBLOCK = 2   //!< a hit on the shape blocks the query (does not block overlap queries)
const queryCallback = {
    preFilter (filterData: any, shape: any, _actor: any, _out: any): number {
        // 0 for mask filter
        // 1 for trigger toggle
        // 2 for single hit
        if (USE_BYTEDANCE) {
            const shapeFlags = shape.getFlags();
            if ((filterData.word3 & 2) && (shapeFlags & PX.ShapeFlag.eTRIGGER_SHAPE)) {
                return PX.QueryHitType.eNONE;
            }
            return filterData.word3 & 4 ? PX.QueryHitType.eBLOCK : PX.QueryHitType.eTOUCH;
        }

        const shapeFlags = shape.getFlags();
        if ((filterData.word3 & 2) && shapeFlags.isSet(PX.PxShapeFlag.eTRIGGER_SHAPE)) {
            return PX.PxQueryHitType.eNONE;
        }
        return filterData.word3 & 4 ? PX.PxQueryHitType.eBLOCK : PX.PxQueryHitType.eTOUCH;
    },
};

export class PhysXWorld implements IPhysicsWorld {
    setAllowSleep (_v: boolean): void { }
    setDefaultMaterial (_v: PhysicMaterial): void { }
    setGravity (gravity: IVec3Like): void {
        this.scene.setGravity(gravity);
    }

    get impl (): any { return this.scene; }

    readonly physics: any;
    readonly scene: any;
    readonly cooking: any;
    readonly useMutiThread: boolean;
    readonly queryfilterData: any;
    readonly singleResult: any;
    readonly mutipleResults: any;
    readonly simulationCB: any;
    readonly queryFilterCB: any;

    readonly wrappedBodies: PhysXSharedBody[] = [];

    protected mutipleResultSize = 12;

    constructor () {
        this.useMutiThread = true;
        if (USE_BYTEDANCE) {
            // const physics = PX.createPhysics();
            const physics = PX.physics;
            const cp = new PX.CookingParams();
            const cooking = PX.createCooking(cp);
            const sceneDesc = physics.createSceneDesc();
            const simulation = new PX.SimulationEventCallback();
            simulation.setOnContact((header: any, pairs: any) => {
                const shapes = header.shapes as any[];
                /**
                 * uint16   ContactPairFlags
                 * uint16   PairFlags
                 * uint16   ContactCount
                 */
                const pairBuf = header.pairBuffer as ArrayBuffer;
                const pairL = shapes.length / 2;
                const ui16View = new Uint16Array(pairBuf, 0, pairL * 3);
                for (let i = 0; i < pairL; i++) {
                    const flags = ui16View[0];
                    if (flags & 3) continue;
                    const shape0 = shapes[2 * i];
                    const shape1 = shapes[2 * i + 1];
                    if (!shape0 || !shape1) continue;
                    const shapeA = getWrapShape<PhysXShape>(shape0);
                    const shapeB = getWrapShape<PhysXShape>(shape1);
                    const events = ui16View[1];
                    const contactCount = ui16View[2];
                    const contactBuffer = header.contactBuffer as ArrayBuffer;
                    if (events & 4) {
                        onCollision('onCollisionEnter', shapeA, shapeB, contactCount, contactBuffer, 0);
                    } else if (events & 8) {
                        onCollision('onCollisionStay', shapeA, shapeB, contactCount, contactBuffer, 0);
                    } else if (events & 16) {
                        onCollision('onCollisionExit', shapeA, shapeB, contactCount, contactBuffer, 0);
                    }
                }
            });
            simulation.setOnTrigger((pairs: any[], pairsBuf: ArrayBuffer) => {
                const length = pairs.length / 4;
                const ui16View = new Uint16Array(pairsBuf);
                for (let i = 0; i < length; i++) {
                    const flags = ui16View[i];
                    if (flags & 3) continue;
                    const events = ui16View[i + 1];
                    const ca = pairs[i * 4 + 1];
                    const cb = pairs[i * 4 + 3];
                    const shapeA = getWrapShape<PhysXShape>(ca);
                    const shapeB = getWrapShape<PhysXShape>(cb);
                    if (events & 4) {
                        onTrigger('onTriggerEnter', shapeA, shapeB);
                    } else if (events & 16) {
                        onTrigger('onTriggerExit', shapeA, shapeB);
                    }
                }
            });
            this.simulationCB = simulation;
            this.queryFilterCB = new PX.QueryFilterCallback();
            this.queryFilterCB.setPreFilter(queryCallback.preFilter);
            this.queryfilterData = { data: { word0: 0, word1: 0, word2: 0, word3: 1 }, flags: 0 };
            sceneDesc.setSimulationEventCallback(simulation);
            sceneDesc.setFlags(PX.SceneFlag.eENABLE_CCD, true);
            const mstc = sceneDesc.getMaxSubThreadCount();
            this.useMutiThread = mstc > 0;
            if (mstc > 0) {
                this.useMutiThread = true;
                sceneDesc.setSubThreadCount(1);
            } else {
                this.useMutiThread = false;
                sceneDesc.setSubThreadCount(0);
            }
            const scene = physics.createScene(sceneDesc);
            this.physics = physics;
            this.cooking = cooking;
            this.scene = scene;
        } else {
            this.singleResult = new PX.PxRaycastHit();
            this.mutipleResults = new PX.PxRaycastHitVector();
            this.mutipleResults.resize(this.mutipleResultSize, this.singleResult);
            this.queryfilterData = new PX.PxQueryFilterData();
            this.simulationCB = PX.PxSimulationEventCallback.implement(eventCallback);
            this.queryFilterCB = PX.PxQueryFilterCallback.implement(queryCallback);
            const version = PX.PX_PHYSICS_VERSION;
            const defaultErrorCallback = new PX.PxDefaultErrorCallback();
            const allocator = new PX.PxDefaultAllocator();
            const foundation = PX.PxCreateFoundation(version, allocator, defaultErrorCallback);
            const scale = new PX.PxTolerancesScale();
            this.cooking = PX.PxCreateCooking(version, foundation, new PX.PxCookingParams(scale));
            this.physics = PX.PxCreatePhysics(version, foundation, scale, false, null);
            PX.PxInitExtensions(this.physics, null);
            const sceneDesc = PX.getDefaultSceneDesc(this.physics.getTolerancesScale(), 0, this.simulationCB);
            this.scene = this.physics.createScene(sceneDesc);
            PX.physics = this.physics;
        }
    }

    step (deltaTime: number, _timeSinceLastCalled?: number, _maxSubStep = 0): void {
        // if (this.wrappedBodies.length === 0) return;
        const scene = this.scene;
        if (USE_BYTEDANCE) {
            scene.simulate(deltaTime);
        } else {
            scene.simulate(deltaTime, true);
        }
    }

    syncPhysicsToScene () {
        const scene = this.scene;
        scene.fetchResults(true);
        if (this.useMutiThread) {
            for (let i = 0; i < this.wrappedBodies.length; i++) {
                const body = this.wrappedBodies[i];
                body.syncPhysicsWithCheck();
            }
        } else {
            for (let i = 0; i < this.wrappedBodies.length; i++) {
                const body = this.wrappedBodies[i];
                body.syncPhysicsToScene();
            }
        }
    }

    syncSceneToPhysics (): void {
        if (this.useMutiThread) {
            for (let i = 0; i < this.wrappedBodies.length; i++) {
                const body = this.wrappedBodies[i];
                body.syncSceneWithCheck();
            }
        } else {
            for (let i = 0; i < this.wrappedBodies.length; i++) {
                const body = this.wrappedBodies[i];
                body.syncSceneToPhysics();
            }
        }
    }

    getSharedBody (node: Node, wrappedBody?: PhysXRigidBody): PhysXSharedBody {
        return PhysXSharedBody.getSharedBody(node, this, wrappedBody);
    }

    addActor (body: PhysXSharedBody): void {
        const index = this.wrappedBodies.indexOf(body);
        if (index < 0) {
            if (USE_BYTEDANCE) {
                this.scene.addActor(body.impl);
            } else {
                this.scene.addActor(body.impl, null);
            }
            this.wrappedBodies.push(body);
        }
    }

    removeActor (body: PhysXSharedBody): void {
        const index = this.wrappedBodies.indexOf(body);
        if (index >= 0) {
            this.scene.removeActor(body.impl, true);
            this.wrappedBodies.splice(index, 1);
        }
    }

    addConstraint (_constraint: IBaseConstraint): void { }

    removeConstraint (_constraint: IBaseConstraint): void { }

    raycast (worldRay: ray, options: IRaycastOptions, pool: RecyclePool<PhysicsRayResult>, results: PhysicsRayResult[]): boolean {
        const maxDistance = options.maxDistance;
        const flags = (1 << 0) | (1 << 1) | (1 << 10);
        const word3 = 1 | (options.queryTrigger ? 0 : 2);
        if (USE_BYTEDANCE) {
            this.queryfilterData.data.word3 = word3;
            this.queryfilterData.data.word0 = options.mask >>> 0;
            this.queryfilterData.flags = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 5);
            const r = PX.SceneQueryExt.raycastMultiple(this.scene, worldRay.o, worldRay.d, maxDistance, flags,
                this.mutipleResultSize, this.queryfilterData, this.queryFilterCB);

            if (r) {
                for (let i = 0; i < r.length; i++) {
                    const block = r[i];
                    const collider = getWrapShape<PhysXShape>(block.shape).collider;
                    const result = pool.add();
                    result._assign(block.position, block.distance, collider, block.normal);
                    results.push(result);
                }
                return true;
            }
        } else {
            this.queryfilterData.setWords(word3, 3);
            this.queryfilterData.setWords(options.mask >>> 0, 0);
            this.queryfilterData.setFlags((1 << 0) | (1 << 1) | (1 << 2) | (1 << 5));
            const blocks = this.mutipleResults;
            const r = this.scene.raycastMultiple(worldRay.o, worldRay.d, maxDistance, flags,
                blocks, blocks.size(), this.queryfilterData, this.queryFilterCB, null);

            if (r > 0) {
                for (let i = 0; i < r; i++) {
                    const block = blocks.get(i);
                    const collider = getWrapShape<PhysXShape>(block.getShape()).collider;
                    const result = pool.add();
                    result._assign(block.position, block.distance, collider, block.normal);
                    results.push(result);
                }
                return true;
            } if (r === -1) {
                console.error('not enough memory.');
            }
        }
        return false;
    }

    raycastClosest (worldRay: ray, options: IRaycastOptions, result: PhysicsRayResult): boolean {
        const maxDistance = options.maxDistance;
        const flags = (1 << 0) | (1 << 1); // | (1 << 10);
        const word3 = 1 | (options.queryTrigger ? 0 : 2) | 4;
        if (USE_BYTEDANCE) {
            this.queryfilterData.data.word3 = word3;
            this.queryfilterData.data.word0 = options.mask >>> 0;
            this.queryfilterData.flags = (1 << 0) | (1 << 1) | (1 << 2);
            const block = PX.SceneQueryExt.raycastSingle(this.scene, worldRay.o, worldRay.d, maxDistance,
                flags, this.queryfilterData, this.queryFilterCB);
            if (block) {
                const collider = getWrapShape<PhysXShape>(block.shape).collider;
                result._assign(block.position, block.distance, collider, block.normal);
                return true;
            }
        } else {
            this.queryfilterData.setWords(options.mask >>> 0, 0);
            this.queryfilterData.setWords(word3, 3);
            this.queryfilterData.setFlags((1 << 0) | (1 << 1) | (1 << 2));
            const block = this.singleResult;
            const r = this.scene.raycastSingle(worldRay.o, worldRay.d, options.maxDistance, flags,
                block, this.queryfilterData, this.queryFilterCB, null);
            if (r) {
                const collider = getWrapShape<PhysXShape>(block.getShape()).collider;
                result._assign(block.position, block.distance, collider, block.normal);
                return true;
            }
        }
        return false;
    }

    updateCollisionMatrix (_group: number, _mask: number): void {
        for (let i = 0; i < this.wrappedBodies.length; i++) {
            const g = this.wrappedBodies[i];
            if (g.getGroup() === _group) {
                g.setMask(_mask);
            }
        }
    }

    emitEvents (): void {
        emitTriggerEvent();
        emitCollisionEvent();
    }
}
