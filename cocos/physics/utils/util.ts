import { equals, Vec3 } from '../../core';
/**
 * @packageDocumentation
 * @hidden
 */

import { IVec3Like, IQuatLike } from '../../core/math/type-define';
import { Collider, CollisionEventType, IContactEquation, TriggerEventType } from '../framework';

interface IWrapped<T> {
    __cc_wrapper__: T;
}

export function setWrap<Wrapper> (object: any, wrapper: Wrapper) {
    (object as IWrapped<Wrapper>).__cc_wrapper__ = wrapper;
}

export function getWrap<Wrapper> (object: any) {
    return (object as IWrapped<Wrapper>).__cc_wrapper__;
}

export function maxComponent (v: IVec3Like) {
    return Math.max(v.x, Math.max(v.y, v.z));
}

export const VEC3_0 = new Vec3();

export const TriggerEventObject = {
    type: 'onTriggerEnter' as TriggerEventType,
    selfCollider: null as Collider | null,
    otherCollider: null as Collider | null,
    impl: null as any,
};

export const CollisionEventObject = {
    type: 'onCollisionEnter' as CollisionEventType,
    selfCollider: null as unknown as Collider,
    otherCollider: null as unknown as Collider,
    contacts: [] as IContactEquation[],
    impl: null as any,
};

export function shrinkPositions (buffer: Float32Array | number[]): number[] {
    const pos: number[] = [];
    if (buffer.length >= 3) {
        pos[0] = buffer[0], pos[1] = buffer[1], pos[2] = buffer[2];
        const len = buffer.length
        for (let i = 3; i < len; i += 3) {
            const p0 = buffer[i];
            const p1 = buffer[i + 1];
            const p2 = buffer[i + 2];
            const len2 = pos.length;
            let isNew = true;
            for (let j = 0; j < len2; j += 3) {
                if (equals(p0, pos[j]) && equals(p1, pos[j + 1]) && equals(p2, pos[j + 2])) {
                    isNew = false;
                    break;
                }
            }
            if (isNew) {
                pos.push(p0); pos.push(p1); pos.push(p2);
            }
        }
    }
    return pos;
}

