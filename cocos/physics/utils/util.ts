import { Vec3 } from '../../core';
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
