const _global = typeof window === 'undefined' ? global : window;

function defined (name: string) {
    return typeof _global[name] === 'object';
}

function tryDefineGlobal (name: string, value: boolean): boolean {
    if (typeof _global[name] === 'undefined') {
        return (_global[name] = value);
    } else {
        return _global[name];
    }
}

export const BUILD = tryDefineGlobal('CC_BUILD', false);
export const TEST = tryDefineGlobal('CC_TEST', defined('tap') || defined('QUnit'));
export const EDITOR = tryDefineGlobal('CC_EDITOR', defined('Editor') && defined('process') && ('electron' in process.versions));
export const PREVIEW = tryDefineGlobal('CC_PREVIEW', !EDITOR);
export const DEV = tryDefineGlobal('CC_DEV', true); // (CC_EDITOR && !CC_BUILD) || CC_PREVIEW || CC_TEST
export const DEBUG = tryDefineGlobal('CC_DEBUG', true); // CC_DEV || Debug Build
export const JSB = tryDefineGlobal('CC_JSB', defined('jsb'));
// @ts-ignore
export const WECHAT = tryDefineGlobal('CC_WECHAT', !!(defined('wx') && (wx.getSystemInfoSync || wx.getSharedCanvas)));
export const MINIGAME = tryDefineGlobal('CC_MINIGAME', false);
export const RUNTIME_BASED = tryDefineGlobal('CC_RUNTIME_BASED', false);
export const ALIPAY = tryDefineGlobal('CC_ALIPAY', false);
export const XIAOMI = tryDefineGlobal('CC_XIAOMI', false);
export const BAIDU = tryDefineGlobal('CC_BAIDU', false);
export const COCOSPLAY = tryDefineGlobal('CC_COCOSPLAY', false);
// @ts-ignore
export const SUPPORT_JIT = tryDefineGlobal('CC_SUPPORT_JIT', ('function' === typeof loadRuntime));
export const PHYSICS_BUILTIN = tryDefineGlobal('CC_PHYSICS_BUILTIN', true);
export const PHYSICS_CANNON = tryDefineGlobal('CC_PHYSICS_CANNON', false);
export const PHYSICS_AMMO = tryDefineGlobal('CC_PHYSICS_AMMO', false);